import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function POST(
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

    const people = [...edition.people];
    const shuffled = shuffleArray([...people]);

    // Assign secret santa pairs
    for (let i = 0; i < people.length; i++) {
      await prisma.person.update({
        where: { id: people[i].id },
        data: {
          assignedToId: shuffled[i].id,
        },
      });

      // Send email
      if (people[i].email) {
        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: people[i].email?.toString(),
          subject: `Secret Santa Assignment for ${edition.name}`,
          html: `
            <h1>Your Secret Santa Assignment</h1>
            <p>You are the Secret Santa for: <strong>${shuffled[i].name}</strong></p>
            <h2>Their Gift Ideas:</h2>
            <p>${shuffled[i].giftIdeas || 'No specific ideas provided'}</p>
            ${shuffled[i].imageUrl ? `<img src="${shuffled[i].imageUrl}" alt="Gift idea image" style="max-width: 300px;">` : ''}
          `,
        });
      }
    }

    await prisma.edition.update({
      where: { id: params.id },
      data: { status: 'COMPLETED' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to draw names' }, { status: 500 });
  }
}