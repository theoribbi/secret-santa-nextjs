import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, createEventLinkEmail } from '@/lib/email'
import { db } from '@/db'
import { events } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const { email } = await request.json()
    const trimmedEmail = typeof email === 'string' ? email.trim() : ''

    if (!trimmedEmail) {
      return NextResponse.json(
        { error: 'L\'adresse email est requise' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      return NextResponse.json(
        { error: 'Le format de l\'adresse email est invalide' },
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
      console.error('SMTP config manquante pour send-link:', missingSmtp)
      return NextResponse.json(
        { error: 'Configuration SMTP incomplète', details: missingSmtp },
        { status: 500 }
      )
    }

    // Récupérer l'événement
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event) {
      return NextResponse.json(
        { error: 'Événement non trouvé' },
        { status: 404 }
      )
    }

    // Créer l'URL de gestion
    const eventUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/${eventId}`

    // Créer l'email avec le template
    const emailContent = createEventLinkEmail(event.name, eventUrl)

    // Envoyer l'email
    const result = await sendEmail({
      to: trimmedEmail,
      subject: emailContent.subject,
      html: emailContent.html
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Lien de gestion envoyé par email avec succès !',
        messageId: result.messageId
      })
    } else {
      console.error('Échec envoi email send-link:', result.error)
      return NextResponse.json(
        { error: 'Échec de l\'envoi de l\'email', details: result.error },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Erreur envoi lien événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du lien' },
      { status: 500 }
    )
  }
}
