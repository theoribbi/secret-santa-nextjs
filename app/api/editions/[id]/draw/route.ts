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
      const swapIndex = (i + 1) % people.length;
      [shuffled[i], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[i]];
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
              subject: `🎅 Découvrez votre Secret Santa pour ${edition.name}! 🎁`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff; border: 1px solid #dddddd; border-radius: 10px;">
                  <header style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #eeeeee;">
                    <h1 style="color: #2c3e50; font-size: 24px; margin: 0;">🎅 Votre Secret Santa 🎁</h1>
                    <p style="color: #7f8c8d; font-size: 16px; margin: 0;">Une surprise vous attend cette année !</p>
                  </header>
                  <main style="padding: 20px 0;">
                    <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Bonjour <strong>${people[i].name}</strong>,
                    </p>
                    <p style="color: #34495e; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                      Vous avez tirer au sort :
                    </p>
                    <div style="text-align: center; margin: 20px 0; padding: 20px; background-color: #f4f6f7; border-radius: 10px; border: 1px solid #cccccc;">
                      <h2 style="color: #2c3e50; font-size: 20px; margin: 0;">🎁 ${shuffled[i].name} 🎁</h2>
                      <p style="color: #7f8c8d; font-size: 14px; margin: 10px 0;">Voici quelques idées de cadeaux renseigné par ${shuffled[i].name} : </p>
                      <p style="color: #2c3e50; font-size: 16px; font-style: italic;">"${shuffled[i].giftIdeas || 'Aucune idée spécifique fournie'}"</p>
                      ${
                        shuffled[i].imageUrl
                          ? `<div style="margin-top: 20px;">
                               <img src="${shuffled[i].imageUrl}" alt="Idée de cadeau" style="max-width: 100%; height: auto; border-radius: 5px; border: 1px solid #ddd;">
                             </div>`
                          : ''
                      }
                    </div>
                  </main>
                  <footer style="text-align: center; padding-top: 20px; border-top: 1px solid #eeeeee; margin-top: 20px;">
                    <p style="color: #95a5a6; font-size: 14px; margin: 0;">
                      Merci de votre participation à ${edition.name}. Et joyeuses fêtes ! 🎉
                    </p>
                  </footer>
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