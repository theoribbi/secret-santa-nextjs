import { NextRequest, NextResponse } from 'next/server'
import { getPersonAssignment } from '@/lib/secret-santa'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'eventId est requis en paramètre' },
        { status: 400 }
      )
    }

    const assignment = await getPersonAssignment(personId, eventId)

    if (!assignment) {
      return NextResponse.json(
        { message: 'Aucune assignation trouvée pour cette personne' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Voici la personne à qui vous devez offrir un cadeau!',
      receiver: assignment
    })
  } catch (error) {
    console.error('Erreur récupération assignation:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la récupération de l\'assignation' },
      { status: 500 }
    )
  }
}
