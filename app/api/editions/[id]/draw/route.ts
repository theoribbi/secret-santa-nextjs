import { NextResponse } from 'next/server';
import { PrismaClient, Person, Edition } from '@prisma/client';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function assignSecretSanta(people: Person[]): Person[] {
  const shuffled = shuffleArray([...people]);

  for (let i = 0; i < people.length; i++) {
    if (people[i].id === shuffled[i].id) {
      const temp = shuffled[i];
      shuffled[i] = shuffled[shuffled.length - 1];
      shuffled[shuffled.length - 1] = temp;
    }
  }

  return shuffled;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
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
): Promise<Response> {
  try {
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

    const shuffled = assignSecretSanta(people);

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < people.length; i++) {
        await tx.person.update({
          where: { id: people[i].id },
          data: {
            assignedToId: shuffled[i].id,
          },
        });

        if (people[i].email) {
          try {
            await transporter.sendMail({
              from: process.env.SMTP_FROM,
              to: people[i]?.email?.toString(),
              subject: `Votre Secret Santa pour ${edition.name}`,
              html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <h1 style="color: #e63946;">🎅 Secret Santa 🎁</h1>
                  <p>Bonjour,</p>
                  <p>
                    Vous êtes le Secret Santa pour : 
                    <strong style="color: #1d3557;">${shuffled[i].name}</strong>
                  </p>
                  <h2 style="color: #457b9d;">Idées de cadeaux :</h2>
                  <p style="background-color: #f1faee; padding: 10px; border-radius: 5px;">
                    ${shuffled[i].giftIdeas || 'Aucune idée spécifique fournie'}
                  </p>
                  ${
                    shuffled[i].imageUrl
                      ? `<div style="margin-top: 20px; text-align: center;">
                           <img src="${shuffled[i].imageUrl}" alt="Idée de cadeau" style="max-width: 300px; border: 1px solid #ccc; border-radius: 5px;">
                         </div>`
                      : ''
                  }
                  <p style="margin-top: 20px;">Amusez-vous bien et bonnes fêtes ! 🎄</p>
                </div>
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

      // Mettre à jour le statut de l'édition
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