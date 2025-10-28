import * as nodemailer from 'nodemailer'
import * as fs from 'fs'
import * as path from 'path'

// SMTP transport
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: Number(process.env.SMTP_PORT) || 1025,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    } : undefined,
  })
}

interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

function loadTemplate(templateName: string, variables: Record<string, any>): string {
  try {
    const templatePath = path.join(process.cwd(), 'templates', `${templateName}.html`)
    let template = fs.readFileSync(templatePath, 'utf-8')
    
    Object.entries(variables).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        const regex = new RegExp(`{{${key}}}`, 'g')
        template = template.replace(regex, String(value))
      }
    })
    
    Object.entries(variables).forEach(([key, value]) => {
      const conditionRegex = new RegExp(`{{#${key}}}([\\s\\S]*?){{\\/${key}}}`, 'g')
      if (value && value !== '') {
        template = template.replace(conditionRegex, '$1')
      } else {
        template = template.replace(conditionRegex, '')
      }
    })
    
    return template
  } catch (error) {
    console.error(`Erreur lors du chargement du template ${templateName}:`, error)
    return `<p>Erreur lors du chargement du template</p>`
  }
}

export async function sendEmail(options: EmailOptions) {
  try {
    const transporter = createTransporter()
    
    const mailOptions = {
      from: `${process.env.SMTP_FROM_NAME || 'Secret Santa'} <${process.env.SMTP_FROM_EMAIL || 'noreply@secretsanta.local'}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''),
    }

    const info = await transporter.sendMail(mailOptions)
    console.log('Email sent successfully:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('Failed to send email:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

// Fonction utilitaire pour convertir les chemins d'images en URLs complètes
function getFullImageUrl(imagePath: string | undefined): string | undefined {
  if (!imagePath) return undefined
  
  // Si c'est déjà une URL complète (commence par http), la retourner telle quelle
  if (imagePath.startsWith('http')) {
    return imagePath
  }
  
  // Construire l'URL complète selon l'environnement
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}${imagePath.startsWith('/') ? imagePath : '/' + imagePath}`
}

// Templates

export function createEventInvitationEmail(eventName: string, eventDate: Date, eventDescription: string | undefined, joinUrl: string) {
  const formattedDate = eventDate.toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const html = loadTemplate('invitation', {
    eventName,
    eventDate: formattedDate,
    eventDescription,
    joinUrl
  })

  return {
    subject: `🎅 Vous êtes invité au Secret Santa "${eventName}"`,
    html
  }
}

export function createAssignmentNotificationEmail(
  personName: string,
  eventName: string,
  receiverName: string,
  receiverGiftIdea?: string,
  receiverGiftImage?: string
) {
  // Convertir le chemin d'image en URL complète pour l'email
  const fullImageUrl = getFullImageUrl(receiverGiftImage)
  
  const html = loadTemplate('assignment', {
    personName,
    eventName,
    receiverName,
    receiverGiftIdea,
    receiverGiftImage: fullImageUrl
  })

  return {
    subject: `🎯 Secret Santa "${eventName}" - Votre mission !`,
    html
  }
}

export function createEventLinkEmail(eventName: string, eventUrl: string) {
  const html = loadTemplate('event-link', {
    eventName,
    eventUrl
  })

  return {
    subject: `🔗 Lien de gestion - Secret Santa "${eventName}"`,
    html
  }
}