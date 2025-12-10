import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { performSecretSantaDraw, resetSecretSantaDraw, getAllAssignments } from '@/lib/secret-santa'
import { db } from '@/db'
import { events, persons, assignments } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { sendEmail, createAssignmentNotificationEmail } from '@/lib/email'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    if (!process.env.RESEND_API_KEY) {
      console.error('RESEND_API_KEY manquante pour envoi des assignations')
      return NextResponse.json(
        { error: 'Configuration email incomplète (RESEND_API_KEY manquante)' },
        { status: 500 }
      )
    }

    const result = await performSecretSantaDraw(eventId)

    if (result.success) {
      // Envoyer les emails d'assignation à tous les participants
      await sendAssignmentEmails(eventId)
      
      return NextResponse.json({
        ...result,
        emailsSent: true
      })
    } else {
      return NextResponse.json(result, { status: 400 })
    }
  } catch (error) {
    console.error('Erreur tirage au sort:', error)
    return NextResponse.json(
      { error: 'Erreur lors du tirage au sort' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params
    const result = await resetSecretSantaDraw(eventId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Erreur reset tirage:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la réinitialisation' },
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
    const assignments = await getAllAssignments(eventId)
    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Erreur récupération assignations:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des assignations' },
      { status: 500 }
    )
  }
}

// Fonction pour envoyer les emails d'assignation à tous les participants
async function sendAssignmentEmails(eventId: string) {
  try {
    // Récupérer l'événement
    const [event] = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1)

    if (!event) {
      console.error('Événement non trouvé pour envoi emails')
      return
    }

    // Récupérer toutes les assignations
    const allAssignments = await db
      .select()
      .from(assignments)
      .where(eq(assignments.eventId, eventId))

    // Récupérer tous les participants
    const allPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.eventId, eventId))

    // Créer un map pour les personnes
    const personsMap = new Map(allPersons.map(p => [p.id, p]))

    console.log(`Envoi de ${allAssignments.length} emails d'assignation pour l'événement ${event.name}`)

    // Envoyer les emails et mettre à jour le statut en DB
    const emailPromises = allAssignments.map(async (assignment) => {
      const giver = personsMap.get(assignment.giverId)
      const receiver = personsMap.get(assignment.receiverId)

      if (!giver || !receiver) {
        console.error(`Personne manquante pour assignation: giver=${assignment.giverId}, receiver=${assignment.receiverId}`)
        // Enregistrer l'erreur dans la DB
        await db
          .update(assignments)
          .set({ emailError: 'Personne manquante (giver ou receiver)' })
          .where(eq(assignments.id, assignment.id))
        return { success: false, error: 'Personne manquante' }
      }

      try {
        const emailContent = createAssignmentNotificationEmail(
          giver.name,
          event.name,
          receiver.name,
          receiver.giftIdea || undefined,
          receiver.giftImage || undefined
        )

        const result = await sendEmail({
          to: giver.email,
          subject: emailContent.subject,
          html: emailContent.html
        })

        if (result.success) {
          console.log(`✅ Email d'assignation envoyé à ${giver.name} (${giver.email}) - ID: ${result.messageId}`)
          // Enregistrer le succès dans la DB
          await db
            .update(assignments)
            .set({
              emailSentAt: new Date(),
              emailResendId: result.messageId || null,
              emailError: null
            })
            .where(eq(assignments.id, assignment.id))
        } else {
          console.error(`❌ Échec envoi email à ${giver.name}:`, result.error)
          // Enregistrer l'erreur dans la DB
          await db
            .update(assignments)
            .set({ emailError: result.error || 'Erreur inconnue' })
            .where(eq(assignments.id, assignment.id))
        }

        return result
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue'
        console.error(`❌ Erreur envoi email à ${giver.name}:`, error)
        // Enregistrer l'erreur dans la DB
        await db
          .update(assignments)
          .set({ emailError: errorMessage })
          .where(eq(assignments.id, assignment.id))
        return { success: false, error: errorMessage }
      }
    })

    // Attendre tous les envois
    const results = await Promise.all(emailPromises)
    const successCount = results.filter(r => r.success).length
    
    console.log(`📧 Emails d'assignation: ${successCount}/${allAssignments.length} envoyés avec succès`)

  } catch (error) {
    console.error('Erreur lors de l\'envoi des emails d\'assignation:', error)
  }
}
