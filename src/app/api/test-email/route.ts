import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, createEventInvitationEmail, createAssignmentNotificationEmail, createEventLinkEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  try {
    const { type, to } = await request.json()
    const trimmedTo = typeof to === 'string' ? to.trim() : ''

    if (!trimmedTo) {
      return NextResponse.json(
        { error: 'L\'adresse email "to" est requise' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedTo)) {
      return NextResponse.json(
        { error: 'Format d\'email invalide' },
        { status: 400 }
      )
    }

    const missingSmtp = [
      ['SMTP_HOST', process.env.SMTP_HOST],
      ['SMTP_PORT', process.env.SMTP_PORT],
      ['SMTP_USER', process.env.SMTP_USER],
      ['SMTP_PASS', process.env.SMTP_PASS],
      ['SMTP_FROM_EMAIL', process.env.SMTP_FROM_EMAIL],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k)

    if (missingSmtp.length > 0) {
      return NextResponse.json(
        { error: 'Configuration SMTP incomplète', details: missingSmtp },
        { status: 500 }
      )
    }

    let emailContent
    let subject

    switch (type) {
      case 'invitation':
        emailContent = createEventInvitationEmail(
          'Secret Santa Équipe Test',
          new Date('2024-12-24T18:00:00Z'),
          'Un Secret Santa fun pour célébrer Noël ensemble !',
          'http://localhost:3000/join/test-event-id'
        )
        subject = emailContent.subject
        break

      case 'assignment':
        emailContent = createAssignmentNotificationEmail(
          'Jean Dupont',
          'Secret Santa Équipe Test',
          'Marie Martin',
          'Un livre de cuisine ou des ustensiles de pâtisserie',
          '/uploads/gift-test-image.jpg'
        )
        subject = emailContent.subject
        break

      case 'assignment-external':
        emailContent = createAssignmentNotificationEmail(
          'Jean Dupont',
          'Secret Santa Équipe Test',
          'Marie Martin',
          'Un livre de cuisine ou des ustensiles de pâtisserie',
          'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=300&h=200&fit=crop'
        )
        subject = emailContent.subject
        break

      case 'event-link':
        emailContent = createEventLinkEmail(
          'Secret Santa Équipe Test',
          'http://localhost:3000/events/test-event-id'
        )
        subject = emailContent.subject
        break

      case 'simple':
      default:
        subject = '🧪 Test Email - Secret Santa'
        emailContent = {
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #fee2e2 0%, #dcfce7 100%); padding: 20px; border-radius: 10px; text-align: center;">
                <h1 style="color: #dc2626; margin: 0;">🧪 Test Email</h1>
                <p style="color: #15803d; margin: 10px 0;">Secret Santa Application</p>
              </div>
              
              <div style="background: white; padding: 20px; margin-top: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <p style="color: #374151;">
                  Ceci est un email de test pour vérifier que Mailhog fonctionne correctement ! 🎅
                </p>
                
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 0; color: #6b7280;">
                    <strong>Timestamp:</strong> ${new Date().toISOString()}<br>
                    <strong>Environment:</strong> ${process.env.NODE_ENV || 'development'}
                  </p>
                </div>
                
                <p style="color: #374151;">
                  Si vous recevez cet email, la configuration SMTP fonctionne parfaitement ! ✅
                </p>
              </div>
            </div>
          `
        }
        break
    }

    const result = await sendEmail({
      to: trimmedTo,
      subject,
      html: emailContent.html
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Email envoyé avec succès !',
        messageId: result.messageId,
        type
      })
    } else {
      return NextResponse.json(
        { error: 'Échec de l\'envoi de l\'email', details: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Erreur API test-email:', error)
    return NextResponse.json(
      { error: 'Erreur serveur lors de l\'envoi de l\'email' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'API de test d\'email - Utilisez POST avec { "to": "email@example.com", "type": "simple|invitation|assignment|assignment-external|event-link" }',
    mailhogUrl: `http://localhost:${process.env.MAILHOG_WEB_PORT || 8025}`,
    smtpConfig: {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`
    }
  })
}
