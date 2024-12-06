import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { personId, email, giftIdeas, imageUrl } = await request.json();
    
    const person = await prisma.person.update({
      where: { id: personId },
      data: {
        email,
        giftIdeas,
        imageUrl,
      },
    });

    return NextResponse.json(person);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update person' }, { status: 500 });
  }
}