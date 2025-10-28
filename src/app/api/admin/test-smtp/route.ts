import { NextRequest, NextResponse } from 'next/server'
import * as nodemailer from 'nodemailer'

interface TestResult {
  success: boolean
  step: string
  message: string
  details?: any
  suggestions?: string[]
}

export async function GET() {
  // Retourner la configuration SMTP (sans les mots de passe)
  const config = {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    hasPassword: !!process.env.SMTP_PASS,
    from: `${process.env.SMTP_FROM_NAME || 'Secret Santa'} <${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER}>`,
    environment: process.env.NODE_ENV || 'development'
  }

  return NextResponse.json({
    config,
    message: 'Configuration SMTP chargée'
  })
}

export async function POST(request: NextRequest) {
  const results: TestResult[] = []

  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email de test requis' },
        { status: 400 }
      )
    }

    // Étape 1: Vérification de la configuration
    results.push(await checkConfiguration())

    // Étape 2: Test de connexion
    const transporter = await testConnection(results)
    if (!transporter) {
      return NextResponse.json({ results })
    }

    // Étape 3: Test d'authentification
    await testAuthentication(transporter, results)

    // Étape 4: Test d'envoi d'email
    await testEmailSending(transporter, email, results)

    return NextResponse.json({ results })

  } catch (error) {
    console.error('Erreur test SMTP:', error)
    
    results.push({
      success: false,
      step: 'Erreur fatale',
      message: error instanceof Error ? error.message : 'Erreur inconnue',
      details: error,
      suggestions: [
        'Vérifiez les logs du serveur',
        'Vérifiez que toutes les variables SMTP sont définies',
        'Contactez l\'administrateur système'
      ]
    })

    return NextResponse.json({ results }, { status: 500 })
  }
}

async function checkConfiguration(): Promise<TestResult> {
  const requiredVars = {
    'SMTP_HOST': process.env.SMTP_HOST,
    'SMTP_PORT': process.env.SMTP_PORT,
    'SMTP_USER': process.env.SMTP_USER,
    'SMTP_PASS': process.env.SMTP_PASS,
    'SMTP_FROM_EMAIL': process.env.SMTP_FROM_EMAIL
  }

  const missing = Object.entries(requiredVars)
    .filter(([key, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    return {
      success: false,
      step: 'Configuration',
      message: `Variables manquantes: ${missing.join(', ')}`,
      details: { missing, available: Object.keys(requiredVars).filter(k => requiredVars[k as keyof typeof requiredVars]) },
      suggestions: [
        'Vérifiez votre fichier .env ou les variables Vercel',
        'Assurez-vous que toutes les variables SMTP sont définies',
        'Redéployez l\'application si nécessaire'
      ]
    }
  }

  return {
    success: true,
    step: 'Configuration',
    message: 'Toutes les variables SMTP sont configurées',
    details: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE,
      user: process.env.SMTP_USER,
      from: process.env.SMTP_FROM_EMAIL
    }
  }
}

async function testConnection(results: TestResult[]): Promise<nodemailer.Transporter | null> {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    results.push({
      success: true,
      step: 'Connexion',
      message: `Connexion établie avec ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}`,
      details: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE === 'true'
      }
    })

    return transporter

  } catch (error) {
    results.push({
      success: false,
      step: 'Connexion',
      message: `Impossible de se connecter au serveur SMTP`,
      details: error,
      suggestions: getSMTPErrorSuggestions(error)
    })
    return null
  }
}

async function testAuthentication(transporter: nodemailer.Transporter, results: TestResult[]) {
  try {
    await transporter.verify()
    
    results.push({
      success: true,
      step: 'Authentification',
      message: 'Authentification réussie avec le serveur SMTP',
      details: {
        user: process.env.SMTP_USER
      }
    })

  } catch (error) {
    results.push({
      success: false,
      step: 'Authentification',
      message: 'Échec de l\'authentification SMTP',
      details: error,
      suggestions: getSMTPErrorSuggestions(error)
    })
  }
}

async function testEmailSending(transporter: nodemailer.Transporter, testEmail: string, results: TestResult[]) {
  try {
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || 'Secret Santa Test'} <${process.env.SMTP_FROM_EMAIL}>`,
      to: testEmail,
      subject: '🧪 Test SMTP Production - Secret Santa',
      html: generateTestEmailHTML()
    }

    const info = await transporter.sendMail(mailOptions)
    
    results.push({
      success: true,
      step: 'Envoi',
      message: `Email envoyé avec succès à ${testEmail}`,
      details: {
        messageId: info.messageId,
        response: info.response,
        envelope: info.envelope,
        to: testEmail
      }
    })

  } catch (error) {
    results.push({
      success: false,
      step: 'Envoi',
      message: 'Échec de l\'envoi de l\'email de test',
      details: error,
      suggestions: getSMTPErrorSuggestions(error)
    })
  }
}

function getSMTPErrorSuggestions(error: any): string[] {
  const errorMessage = error?.message || ''
  const errorCode = error?.code || ''

  const suggestions: string[] = []

  // Erreurs d'authentification
  if (errorMessage.includes('EAUTH') || errorCode === 'EAUTH') {
    suggestions.push('Vérifiez le nom d\'utilisateur et le mot de passe SMTP')
    suggestions.push('Si vous utilisez Gmail, activez l\'authentification à 2 facteurs et générez un mot de passe d\'application')
    suggestions.push('Vérifiez que le compte email autorise les connexions tierces')
  }

  // Erreurs de connexion
  if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('EDNS')) {
    suggestions.push('Vérifiez l\'adresse du serveur SMTP (SMTP_HOST)')
    suggestions.push('Vérifiez le port SMTP (souvent 587 pour STARTTLS, 465 pour SSL)')
    suggestions.push('Vérifiez que le serveur SMTP est accessible depuis votre environnement')
    suggestions.push('Testez la connectivité réseau avec ping ou telnet')
  }

  // Erreurs de certificat SSL
  if (errorMessage.includes('certificate') || errorMessage.includes('SSL')) {
    suggestions.push('Vérifiez la configuration SSL/TLS (SMTP_SECURE)')
    suggestions.push('Essayez de passer SMTP_SECURE à false et utilisez le port 587')
    suggestions.push('Vérifiez que le certificat SSL du serveur est valide')
  }

  // Erreurs de timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('ETIMEDOUT')) {
    suggestions.push('Le serveur SMTP met trop de temps à répondre')
    suggestions.push('Vérifiez la connectivité réseau')
    suggestions.push('Essayez un autre port SMTP')
  }

  // Erreurs généralistes si aucune suggestion spécifique
  if (suggestions.length === 0) {
    suggestions.push('Vérifiez tous les paramètres SMTP dans les variables d\'environnement')
    suggestions.push('Consultez la documentation de votre fournisseur SMTP')
    suggestions.push('Vérifiez les logs du serveur pour plus de détails')
  }

  return suggestions
}

function generateTestEmailHTML(): string {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #fee2e2 0%, #dcfce7 100%); padding: 30px; border-radius: 10px; text-align: center;">
        <h1 style="color: #dc2626; margin: 0; font-size: 2rem;">🧪 Test SMTP Réussi !</h1>
        <p style="color: #15803d; margin: 10px 0; font-size: 1.2rem;">Secret Santa Production</p>
      </div>
      
      <div style="background: white; padding: 30px; margin-top: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <p style="color: #374151; font-size: 18px;">
          ✅ <strong>Félicitations !</strong> Votre configuration SMTP fonctionne parfaitement.
        </p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #15803d;">
          <h3 style="color: #15803d; margin: 0 0 10px 0;">Configuration testée :</h3>
          <ul style="color: #374151; margin: 0; padding-left: 20px;">
            <li><strong>Serveur :</strong> ${process.env.SMTP_HOST}:${process.env.SMTP_PORT}</li>
            <li><strong>Sécurité :</strong> ${process.env.SMTP_SECURE === 'true' ? 'SSL/TLS activé' : 'Non sécurisé'}</li>
            <li><strong>Utilisateur :</strong> ${process.env.SMTP_USER}</li>
            <li><strong>Expéditeur :</strong> ${process.env.SMTP_FROM_EMAIL}</li>
          </ul>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #92400e;">
            <strong>🎯 Votre Secret Santa est prêt !</strong><br>
            Les emails d'invitation et d'assignation seront envoyés automatiquement.
          </p>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
          Test effectué le ${new Date().toLocaleString('fr-FR')}<br>
          Environnement : ${process.env.NODE_ENV}
        </p>
      </div>
    </div>
  `
}
