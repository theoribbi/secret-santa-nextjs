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
  secure: process.env.SMTP_PORT === '465',
  auth: process.env.SMTP_USER && process.env.SMTP_PASS
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});


export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch edition and people
    const edition = await prisma.edition.findUnique({
      where: { id: params.id },
      include: { people: true },
    });

    if (!edition) {
      return NextResponse.json({ error: 'Edition not found' }, { status: 404 });
    }

    const people = [...edition.people];
    if (people.length < 2) {
      return NextResponse.json(
        { error: 'At least two participants are required' },
        { status: 400 }
      );
    }

    const shuffled = shuffleArray([...people]);

    // Use a transaction for atomicity
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < people.length; i++) {
        // Update Secret Santa pair
        await tx.person.update({
          where: { id: people[i].id },
          data: {
            assignedToId: shuffled[i].id,
          },
        });

        // Send email
        if (people[i].email) {
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM,
              to: people[i].email?.toString(),
              subject: `Secret Santa Assignment for ${edition.name}`,
              html: `
                <h1>Your Secret Santa Assignment</h1>
                <p>You are the Secret Santa for: <strong>${shuffled[i].name}</strong></p>
                <h2>Their Gift Ideas:</h2>
                <p>${shuffled[i].giftIdeas || 'No specific ideas provided'}</p>
                ${
                  shuffled[i].imageUrl
                    ? `<img src="${shuffled[i].imageUrl}" alt="Gift idea image" style="max-width: 300px;">`
                    : ''
                }
              `,
            });
          } catch (emailError) {
            console.error(
              `Failed to send email to ${people[i].email}:`,
              emailError
            );
          }
        }
      }

      // Mark edition as completed
      await tx.edition.update({
        where: { id: params.id },
        data: { status: 'COMPLETED' },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error during Secret Santa assignment:", error);
    return NextResponse.json(
      { error: 'Failed to draw names and send emails' },
      { status: 500 }
    );
  }
}