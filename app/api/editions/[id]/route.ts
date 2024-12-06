import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const edition = await prisma.edition.findUnique({
      where: { id: params.id },
      include: { people: true },
    });

    if (!edition) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    return NextResponse.json(edition);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch edition' }, { status: 500 });
  }
}