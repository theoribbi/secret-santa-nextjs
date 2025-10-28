import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { events, type NewEvent } from '@/db/schema'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, date } = body

    if (!name || !date) {
      return NextResponse.json(
        { error: 'Le nom et la date sont obligatoires' },
        { status: 400 }
      )
    }

    const newEvent: NewEvent = {
      name,
      description,
      date: new Date(date),
    }

    const [createdEvent] = await db.insert(events).values(newEvent).returning()

    return NextResponse.json(createdEvent, { status: 201 })
  } catch (error) {
    console.error('Erreur création événement:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la création de l\'événement' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const allEvents = await db.select().from(events)
    return NextResponse.json(allEvents)
  } catch (error) {
    console.error('Erreur récupération événements:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des événements' },
      { status: 500 }
    )
  }
}
