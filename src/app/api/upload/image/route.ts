import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('image') as File

    if (!file) {
      return NextResponse.json(
        { error: 'Aucun fichier image fourni' },
        { status: 400 }
      )
    }

    // Vérification du type de fichier
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Le fichier doit être une image (JPEG, PNG, WebP, etc.)' },
        { status: 400 }
      )
    }

    // Vérification de la taille (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024 // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'L\'image est trop volumineuse. Taille maximum : 5MB' },
        { status: 400 }
      )
    }

    // Générer un nom de fichier unique
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(2)
    const extension = path.extname(file.name) || '.jpg'
    const filename = `gift-${timestamp}-${randomId}${extension}`

    let imageUrl: string

    if (process.env.NODE_ENV === 'production' && process.env.BLOB_READ_WRITE_TOKEN) {
      // Mode production : Upload vers Vercel Blob
      console.log('📤 Upload vers Vercel Blob:', filename)
      
      const blob = await put(filename, file, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN,
      })

      imageUrl = blob.url
      console.log('✅ Image uploadée sur Vercel Blob:', imageUrl)

    } else {
      // Mode développement : Stockage local
      console.log('📤 Stockage local:', filename)
      
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      
      // Créer le dossier uploads s'il n'existe pas
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }

      // Convertir le fichier en buffer et le sauvegarder
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const filePath = path.join(uploadsDir, filename)
      
      await writeFile(filePath, buffer)
      
      imageUrl = `/uploads/${filename}`
      console.log('✅ Image sauvegardée localement:', imageUrl)
    }

    return NextResponse.json({
      success: true,
      url: imageUrl,
      filename,
      size: file.size,
      type: file.type
    })

  } catch (error) {
    console.error('❌ Erreur upload image:', error)
    
    if (error && typeof error === 'object' && 'code' in error) {
      const uploadError = error as { code: string; message?: string }
      
      switch (uploadError.code) {
        case 'ENOSPC':
          return NextResponse.json(
            { error: 'Espace de stockage insuffisant sur le serveur' },
            { status: 507 }
          )
        case 'EACCES':
          return NextResponse.json(
            { error: 'Permissions insuffisantes pour sauvegarder le fichier' },
            { status: 403 }
          )
      }
    }

    return NextResponse.json(
      { error: 'Erreur lors de l\'upload de l\'image. Veuillez réessayer.' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Endpoint d\'upload d\'images pour Secret Santa',
    supportedFormats: ['JPEG', 'PNG', 'WebP', 'GIF'],
    maxSize: '5MB',
    mode: process.env.NODE_ENV === 'production' ? 'Vercel Blob' : 'Local Storage'
  })
}
