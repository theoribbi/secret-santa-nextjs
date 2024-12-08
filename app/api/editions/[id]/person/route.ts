import { put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface PersonRequest {
  personId: string;
  email: string;
  giftIdeas: string;
  image?: File;
}

const vercelBlobToken = process.env.VERCEL_BLOB_TOKEN;

async function uploadToVercelBlobStorage(file: File, filename: string): Promise<string> {
  try {
    const blob = await put(filename, file.stream(), {
      access: 'public',
      token: vercelBlobToken
    });

    return blob.url;
  } catch (error) {
    console.error("Échec de l'upload de l'image:", error);
    throw new Error("Echec de l'upload de l'image");
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }): Promise<NextResponse> {
  try {
    const contentType = request.headers.get('content-type');
    console.log('Content-Type:', contentType);

    if (!contentType?.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
    }

    const formData = await request.formData();
    const personId = formData.get('personId') as string;
    const email = formData.get('email') as string;
    const giftIdeas = formData.get('giftIdeas') as string;
    const image = formData.get('image') as File | null;

    console.log('Received data:', { personId, email, giftIdeas, image });

    if (!personId) {
      return NextResponse.json({ error: 'personId is required' }, { status: 400 });
    }

    let imageUrl: string | null = null;

    if (image) {
      const filename = image.name || `image_${Date.now()}`;
      imageUrl = await uploadToVercelBlobStorage(image, filename);
    }

    const person = await prisma.person.update({
      where: { id: personId },
      data: {
        email,
        giftIdeas,
        imageUrl: imageUrl || undefined,
      },
    });

    return NextResponse.json(person);
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la personne:', error);
    return NextResponse.json({ error: 'Échec de la mise à jour de la personne' }, { status: 500 });
  }
}