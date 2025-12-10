'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import imageCompression from 'browser-image-compression'

interface ImageUploadProps {
  onImageUploaded: (imageUrl: string) => void
  onUploadingChange?: (isUploading: boolean) => void
  currentImage?: string
  label?: string
  className?: string
}

export default function ImageUpload({ 
  onImageUploaded, 
  onUploadingChange,
  currentImage, 
  label = "Image du cadeau (optionnel)",
  className = ""
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isCompressing, setIsCompressing] = useState(false)
  
  // Notifier le parent quand l'état d'upload change
  const setUploadingState = (uploading: boolean, compressing: boolean) => {
    setIsUploading(uploading)
    setIsCompressing(compressing)
    onUploadingChange?.(uploading || compressing)
  }
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<string>(currentImage || '')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setError('')
    
    try {
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        setError('📸 Veuillez sélectionner un fichier image (JPEG, PNG, WebP, etc.)')
        return
      }

      // Vérifier la taille initiale (50MB max avant compression)
      const MAX_INITIAL_SIZE = 50 * 1024 * 1024 // 50MB
      if (file.size > MAX_INITIAL_SIZE) {
        setError('📸 L\'image est trop volumineuse (maximum 50MB)')
        return
      }

      setUploadingState(false, true)

      // Options de compression
      const options = {
        maxSizeMB: 1, // Taille max après compression : 1MB
        maxWidthOrHeight: 1920, // Résolution max : 1920px
        useWebWorker: true,
        fileType: 'image/jpeg' as const, // Convertir en JPEG pour une meilleure compression
        quality: 0.8 // Qualité à 80%
      }

      console.log(`📸 Compression de l'image: ${(file.size / 1024 / 1024).toFixed(2)}MB`)
      
      // Compresser l'image
      const compressedFile = await imageCompression(file, options)
      
      console.log(`✅ Image compressée: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`)
      
      setUploadingState(true, false)

      // Créer preview local
      const previewUrl = URL.createObjectURL(compressedFile)
      setPreview(previewUrl)

      // Upload vers le serveur
      const formData = new FormData()
      formData.append('image', compressedFile)

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de l\'upload')
      }

      const result = await response.json()
      
      // Nettoyer l'URL de preview temporaire
      URL.revokeObjectURL(previewUrl)
      
      // Utiliser l'URL du serveur pour le preview final
      setPreview(result.url)
      onImageUploaded(result.url)

      console.log('✅ Upload réussi:', result.url)

    } catch (err) {
      console.error('❌ Erreur upload:', err)
      setError(
        err instanceof Error 
          ? `📸 ${err.message}` 
          : '📸 Erreur lors de l\'upload de l\'image'
      )
      
      // Reset le preview en cas d'erreur
      setPreview(currentImage || '')
      
    } finally {
      setUploadingState(false, false)
      
      // Reset l'input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveImage = () => {
    setPreview('')
    onImageUploaded('')
    setError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const triggerFileInput = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <Label htmlFor="image-upload">{label}</Label>
      
      {/* Zone de prévisualisation */}
      {preview && (
        <div className="relative">
          <div className="border-2 border-gray-200 rounded-lg p-2 bg-gray-50">
            <img 
              src={preview} 
              alt="Aperçu du cadeau" 
              className="w-full h-32 object-cover rounded"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleRemoveImage}
            className="absolute top-1 right-1"
            disabled={isUploading || isCompressing}
          >
            ✕
          </Button>
        </div>
      )}

      {/* Input file caché */}
      <Input
        id="image-upload"
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading || isCompressing}
      />

      {/* Bouton d'upload */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={triggerFileInput}
          disabled={isUploading || isCompressing}
          className="flex-1"
        >
          {isCompressing ? (
            <>⏳ Compression...</>
          ) : isUploading ? (
            <>📤 Upload...</>
          ) : preview ? (
            <>📸 Changer l'image</>
          ) : (
            <>📸 Choisir une image</>
          )}
        </Button>
      </div>

      {/* Message d'info */}
      <p className="text-xs text-gray-500">
        {isCompressing ? (
          <>⏳ Compression en cours pour optimiser la taille...</>
        ) : isUploading ? (
          <>📤 Upload en cours...</>
        ) : (
          <>📸 Formats supportés : JPEG, PNG, WebP. Compression automatique.</>
        )}
      </p>

      {/* Messages d'erreur */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
