import { NextResponse } from 'next/server'
import { db } from '@/db'
import { events, persons } from '@/db/schema'

export async function GET() {
  try {
    // Test de la connexion à la base de données
    const eventCount = await db.select().from(events)
    const personCount = await db.select().from(persons)
    
    return NextResponse.json({ 
      message: 'Connexion Drizzle réussie!',
      eventCount: eventCount.length,
      personCount: personCount.length,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Erreur de connexion à la base:', error)
    return NextResponse.json(
      { error: 'Échec de la connexion à la base de données', details: error },
      { status: 500 }
    )
  }
}