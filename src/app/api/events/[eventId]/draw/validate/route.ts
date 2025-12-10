import { NextResponse } from 'next/server'
import { db } from '@/db'
import { assignments, persons } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params

    const [allPersons, allAssignments] = await Promise.all([
      db.select().from(persons).where(eq(persons.eventId, eventId)),
      db.select().from(assignments).where(eq(assignments.eventId, eventId)),
    ])

    if (allAssignments.length === 0) {
      return NextResponse.json(
        { ok: false, issues: ['Aucune assignation trouvée pour cet événement.'], summary: null },
        { status: 404 }
      )
    }

    const personMap = new Map(allPersons.map((p) => [p.id, p]))
    const personIds = new Set(personMap.keys())
    const giverToReceiver = new Map<string, string>()
    const receiverCounts = new Map<string, number>()
    const issues: string[] = []

    for (const assign of allAssignments) {
      giverToReceiver.set(assign.giverId, assign.receiverId)
      receiverCounts.set(assign.receiverId, (receiverCounts.get(assign.receiverId) || 0) + 1)

      if (assign.giverId === assign.receiverId) {
        issues.push('Une assignation a une personne qui se tire elle-même.')
      }
      if (!personIds.has(assign.giverId) || !personIds.has(assign.receiverId)) {
        issues.push('Assignation avec un participant inexistant dans cet événement.')
      }
    }

    // Givers sans assignation ou en double
    const unassignedGivers = allPersons
      .filter((p) => !giverToReceiver.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, email: p.email }))
    if (unassignedGivers.length > 0) {
      issues.push('Certains participants n’ont pas d’assignation.')
    }

    // Receivers manquants ou attribués plusieurs fois
    const receiversMissing = allPersons
      .filter((p) => !receiverCounts.has(p.id))
      .map((p) => ({ id: p.id, name: p.name, email: p.email }))
    if (receiversMissing.length > 0) {
      issues.push('Certains participants ne reçoivent aucun cadeau.')
    }

    const receiversMulti = allPersons
      .filter((p) => (receiverCounts.get(p.id) || 0) > 1)
      .map((p) => ({ id: p.id, name: p.name, email: p.email, count: receiverCounts.get(p.id) }))
    if (receiversMulti.length > 0) {
      issues.push('Certains participants reçoivent plusieurs cadeaux.')
    }

    // Couples réciproques (A→B et B→A)
    const reciprocalPairs: Array<{
      giverId: string
      receiverId: string
      giverName: string
      receiverName: string
    }> = []
    for (const [giver, receiver] of giverToReceiver.entries()) {
      const back = giverToReceiver.get(receiver)
      if (back === giver && giver < receiver) {
        reciprocalPairs.push({
          giverId: giver,
          receiverId: receiver,
          giverName: personMap.get(giver)?.name || giver,
          receiverName: personMap.get(receiver)?.name || receiver,
        })
      }
    }
    if (reciprocalPairs.length > 0) {
      issues.push('Des paires réciproques ont été détectées (A tire B et B tire A).')
    }

    // Vérification des emails envoyés
    const emailsSent = allAssignments.filter((a) => a.emailSentAt !== null)
    const emailsFailed = allAssignments
      .filter((a) => a.emailError !== null)
      .map((a) => {
        const giver = personMap.get(a.giverId)
        return {
          assignmentId: a.id,
          giverName: giver?.name || a.giverId,
          giverEmail: giver?.email || 'inconnu',
          error: a.emailError,
          resendId: a.emailResendId,
        }
      })
    const emailsPending = allAssignments.filter(
      (a) => a.emailSentAt === null && a.emailError === null
    )

    if (emailsFailed.length > 0) {
      issues.push(`${emailsFailed.length} email(s) n'ont pas pu être envoyés.`)
    }
    if (emailsPending.length > 0) {
      issues.push(`${emailsPending.length} email(s) sont en attente d'envoi.`)
    }

    const ok =
      issues.length === 0 &&
      unassignedGivers.length === 0 &&
      receiversMissing.length === 0 &&
      receiversMulti.length === 0 &&
      reciprocalPairs.length === 0

    return NextResponse.json({
      ok,
      issues,
      summary: {
        participants: allPersons.length,
        assignments: allAssignments.length,
        unassignedGivers,
        receiversMissing,
        receiversMulti,
        reciprocalPairs,
        emails: {
          sent: emailsSent.length,
          failed: emailsFailed.length,
          pending: emailsPending.length,
          failedDetails: emailsFailed,
        },
      },
    })
  } catch (error) {
    console.error('Erreur validation tirage:', error)
    return NextResponse.json(
      { ok: false, issues: ['Erreur lors de la validation du tirage.'] },
      { status: 500 }
    )
  }
}

