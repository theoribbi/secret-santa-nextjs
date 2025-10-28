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

    if (!email) {
      return NextResponse.json(
        { error: 'L\'adresse email est requise' },
        { status: 400 }
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
      to: email,
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
