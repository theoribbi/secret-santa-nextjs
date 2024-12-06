import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, people } = await request.json();
    
    const edition = await prisma.edition.create({
      data: {
        name,
        people: {
          create: people.map((personName: string) => ({
            name: personName,
          })),
        },
      },
      include: {
        people: true,
      },
    });

    return NextResponse.json(edition);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create edition' }, { status: 500 });
  }
}