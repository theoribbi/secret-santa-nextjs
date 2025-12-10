import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { persons, events, type NewPerson } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sendEmail, createEventInvitationEmail, createJoinConfirmationEmail } from '@/lib/email'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const body = await request.json()
    const { name, email, giftIdea, giftImage, force, skipInvitationEmail, sendJoinConfirmation } = body

    // Validation des champs obligatoires
    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Le nom est obligatoire et ne peut pas être vide' },
        { status: 400 }
      )
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { error: 'L\'email est obligatoire' },
        { status: 400 }
      )
    }

    // Validation format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Le format de l\'email n\'est pas valide' },
        { status: 400 }
      )
    }

    // Vérifier si la personne existe déjà pour cet événement
    const existingPersonInEvent = await db
      .select()
      .from(persons)
      .where(and(
        eq(persons.email, email.trim().toLowerCase()),
        eq(persons.eventId, eventId)
      ))
      .limit(1)

    if (existingPersonInEvent.length > 0 && !force) {
      return NextResponse.json(
        { 
          error: `${existingPersonInEvent[0].name} utilise déjà l'email ${email} pour cet événement`,
          type: 'DUPLICATE_IN_EVENT',
          existingPerson: {
            name: existingPersonInEvent[0].name,
            email: existingPersonInEvent[0].email
          },
          requiresConfirmation: true
        },
        { status: 409 }
      )
    }

    const newPerson: NewPerson = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      giftIdea: giftIdea?.trim() || null,
      giftImage: giftImage?.trim() || null,
      eventId,
    }

    const [createdPerson] = await db.insert(persons).values(newPerson).returning()

    // Récupérer les détails de l'événement pour l'email
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    const shouldSendInvitation = Boolean(event && !skipInvitationEmail)
    const shouldSendJoinConfirmation = Boolean(event && sendJoinConfirmation)

    if (shouldSendInvitation) {
      // Créer l'URL de participation
      const joinUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/join/${eventId}`
      
      // Créer et envoyer l'email d'invitation
      const emailContent = createEventInvitationEmail(
        event.name,
        new Date(event.date),
        event.description || undefined,
        joinUrl
      )

      // Envoyer l'email en arrière-plan (ne pas bloquer la réponse)
      sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html
      }).then((result) => {
        if (result.success) {
          console.log(`Email d'invitation envoyé à ${email} pour l'événement ${event.name}`)
        } else {
          console.error(`Échec envoi email à ${email}:`, result.error)
        }
      })
    }

    if (shouldSendJoinConfirmation) {
      const confirmationContent = createJoinConfirmationEmail(
        newPerson.name,
        event.name,
        new Date(event.date),
        newPerson.giftIdea || undefined,
        newPerson.giftImage || undefined
      )

      sendEmail({
        to: email,
        subject: confirmationContent.subject,
        html: confirmationContent.html
      }).then((result) => {
        if (result.success) {
          console.log(`Email de confirmation envoyé à ${email} pour l'événement ${event.name}`)
        } else {
          console.error(`Échec envoi email de confirmation à ${email}:`, result.error)
        }
      })
    }

    return NextResponse.json(
      {
        ...createdPerson,
        emailSent: Boolean(shouldSendInvitation),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erreur ajout personne:', error)
    
    // Gestion des erreurs spécifiques de base de données
    if (error && typeof error === 'object' && 'code' in error) {
      const dbError = error as { code: string; detail?: string }
      
      switch (dbError.code) {
        case '23505': // Violation de contrainte unique PostgreSQL
          // Plus de contrainte unique sur email, mais on peut gérer d'autres contraintes
          return NextResponse.json(
            { error: 'Violation de contrainte de base de données' },
            { status: 409 }
          )
        case '23503': // Violation de contrainte de clé étrangère
          return NextResponse.json(
            { error: 'L\'événement spécifié n\'existe pas' },
            { status: 400 }
          )
        case '23514': // Violation de contrainte de vérification
          return NextResponse.json(
            { error: 'Les données fournies ne respectent pas les critères requis' },
            { status: 400 }
          )
      }
    }

    // Erreurs de validation JSON
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Format des données invalide' },
        { status: 400 }
      )
    }

    // Erreur générique
    return NextResponse.json(
      { error: 'Une erreur inattendue s\'est produite lors de l\'ajout du participant. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const eventPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.eventId, eventId))

    return NextResponse.json(eventPersons)
  } catch (error) {
    console.error('Erreur récupération personnes:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des personnes' },
      { status: 500 }
    )
  }
}
