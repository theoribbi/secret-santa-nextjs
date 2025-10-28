import { db } from '@/db'
import { persons, assignments, type Person } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

/**
 * Algorithme de tirage au sort pour Secret Santa
 * Chaque personne donne un cadeau à quelqu'un d'autre (pas à elle-même)
 */
export async function performSecretSantaDraw(eventId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Récupérer toutes les personnes de l'événement
    const eventPersons = await db
      .select()
      .from(persons)
      .where(eq(persons.eventId, eventId))

    if (eventPersons.length < 2) {
      return {
        success: false,
        message: 'Il faut au moins 2 personnes pour faire un tirage au sort'
      }
    }

    // Vérifier s'il y a déjà des assignations pour cet événement
    const existingAssignments = await db
      .select()
      .from(assignments)
      .where(eq(assignments.eventId, eventId))

    if (existingAssignments.length > 0) {
      return {
        success: false,
        message: 'Le tirage au sort a déjà été effectué pour cet événement'
      }
    }

    // Algorithme de tirage au sort
    const shuffledPersons = shuffleArray([...eventPersons])
    const assignmentPairs: { giverId: string; receiverId: string }[] = []

    // Chaque personne offre un cadeau à la suivante dans la liste mélangée
    // La dernière personne offre à la première (pour faire un cercle)
    for (let i = 0; i < shuffledPersons.length; i++) {
      const giver = shuffledPersons[i]
      const receiver = shuffledPersons[(i + 1) % shuffledPersons.length]
      
      assignmentPairs.push({
        giverId: giver.id,
        receiverId: receiver.id
      })
    }

    // Sauvegarder les assignations
    const newAssignments = assignmentPairs.map(pair => ({
      giverId: pair.giverId,
      receiverId: pair.receiverId,
      eventId,
    }))

    await db.insert(assignments).values(newAssignments)

    return {
      success: true,
      message: `Tirage au sort effectué avec succès pour ${eventPersons.length} personnes`
    }
  } catch (error) {
    console.error('Erreur lors du tirage au sort:', error)
    return {
      success: false,
      message: 'Erreur lors du tirage au sort'
    }
  }
}

/**
 * Récupérer l'assignation d'une personne (à qui elle doit offrir un cadeau)
 */
export async function getPersonAssignment(personId: string, eventId: string) {
  const assignment = await db
    .select({
      receiver: persons,
    })
    .from(assignments)
    .innerJoin(persons, eq(assignments.receiverId, persons.id))
    .where(
      and(
        eq(assignments.giverId, personId),
        eq(assignments.eventId, eventId)
      )
    )
    .limit(1)

  return assignment[0]?.receiver || null
}

/**
 * Récupérer toutes les assignations d'un événement (pour les organisateurs)
 */
export async function getAllAssignments(eventId: string) {
  return await db
    .select({
      giver: {
        id: persons.id,
        name: persons.name,
        email: persons.email,
      },
      receiver: {
        id: persons.id,
        name: persons.name,
        email: persons.email,
        giftIdea: persons.giftIdea,
        giftImage: persons.giftImage,
      },
    })
    .from(assignments)
    .innerJoin(persons, eq(assignments.giverId, persons.id))
    .innerJoin(persons, eq(assignments.receiverId, persons.id))
    .where(eq(assignments.eventId, eventId))
}

/**
 * Supprimer toutes les assignations d'un événement (pour refaire le tirage)
 */
export async function resetSecretSantaDraw(eventId: string) {
  await db.delete(assignments).where(eq(assignments.eventId, eventId))
  return { success: true, message: 'Tirage au sort réinitialisé' }
}

/**
 * Fonction utilitaire pour mélanger un tableau
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
