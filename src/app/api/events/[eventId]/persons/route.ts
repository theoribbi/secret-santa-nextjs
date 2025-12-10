import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { db } from '@/db'
import { persons, events, type NewPerson } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { sendEmail, createEventInvitationEmail, createJoinConfirmationEmail } from '@/lib/email'

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
  // 3. Fallback
  return 'http://localhost:3000'
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const baseUrl = getBaseUrl(request)
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

    const missingSmtp = [
      ['SMTP_HOST', process.env.SMTP_HOST],
      ['SMTP_PORT', process.env.SMTP_PORT],
      ['SMTP_USER', process.env.SMTP_USER],
      ['SMTP_PASS', process.env.SMTP_PASS],
      ['SMTP_FROM_EMAIL', process.env.SMTP_FROM_EMAIL],
    ]
      .filter(([, v]) => !v)
      .map(([k]) => k)

    let invitationSent = false
    let confirmationSent = false

    if (shouldSendInvitation && missingSmtp.length === 0) {
      // Créer l'URL de participation
      const joinUrl = `${baseUrl}/join/${eventId}`
      
      // Créer et envoyer l'email d'invitation
      const emailContent = createEventInvitationEmail(
        event.name,
        new Date(event.date),
        event.description || undefined,
        joinUrl
      )

      // IMPORTANT: await pour que l'email parte vraiment avant la réponse (serverless)
      const result = await sendEmail({
        to: newPerson.email,
        subject: emailContent.subject,
        html: emailContent.html
      })
      if (result.success) {
        console.log(`Email d'invitation envoyé à ${newPerson.email} pour l'événement ${event.name}`)
        invitationSent = true
      } else {
        console.error(`Échec envoi email à ${newPerson.email}:`, result.error)
      }
    }

    if (shouldSendJoinConfirmation && missingSmtp.length === 0) {
      const confirmationContent = createJoinConfirmationEmail(
        newPerson.name,
        event.name,
        new Date(event.date),
        newPerson.giftIdea || undefined,
        newPerson.giftImage || undefined
      )

      // IMPORTANT: await pour que l'email parte vraiment avant la réponse (serverless)
      const result = await sendEmail({
        to: newPerson.email,
        subject: confirmationContent.subject,
        html: confirmationContent.html
      })
      if (result.success) {
        console.log(`Email de confirmation envoyé à ${newPerson.email} pour l'événement ${event.name}`)
        confirmationSent = true
      } else {
        console.error(`Échec envoi email de confirmation à ${newPerson.email}:`, result.error)
      }
    }

    return NextResponse.json(
      {
        ...createdPerson,
        emailSent: invitationSent || confirmationSent,
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
