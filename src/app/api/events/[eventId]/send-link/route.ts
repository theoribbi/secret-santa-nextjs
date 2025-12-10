import { NextRequest, NextResponse } from 'next/server'
import { sendEmail, createEventLinkEmail } from '@/lib/email'
import { db } from '@/db'
import { events } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Helper pour obtenir l'URL de base depuis les headers (fonctionne sur Vercel)
function getBaseUrl(request: NextRequest): string {
  // 1. Variable d'environnement serveur (runtime)
  if (process.env.APP_URL) {
    return process.env.APP_URL
  }
  // 2. Header Vercel (automatique)
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
  const protocol = request.headers.get('x-forwarded-proto') || 'https'
  if (host) {
    return `${protocol}://${host}`
  }
  return 'http://localhost:3000'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const baseUrl = getBaseUrl(request)
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

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY manquante pour send-link')
      return NextResponse.json(
        { error: 'Configuration email incomplète (RESEND_API_KEY manquante)' },
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
    const eventUrl = `${baseUrl}/events/${eventId}`

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
