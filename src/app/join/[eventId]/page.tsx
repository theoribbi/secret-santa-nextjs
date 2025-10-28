'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import DuplicateEmailDialog from '@/components/DuplicateEmailDialog'
import ImageUpload from '@/components/ImageUpload'

interface Event {
  id: string
  name: string
  description?: string
  date: string
}

interface Person {
  id: string
  name: string
  email: string
  giftIdea?: string
}

export default function JoinEventPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [hasJoined, setHasJoined] = useState(false)
  const [userAssignment, setUserAssignment] = useState<Person | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    giftIdea: '',
    giftImage: ''
  })

  // États pour la gestion des doublons d'emails
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    existingPersonName: '',
    email: '',
    pendingFormData: null as any
  })

  useEffect(() => {
    loadEvent()
  }, [eventId])

  const loadEvent = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const events = await response.json()
        const foundEvent = events.find((e: Event) => e.id === eventId)
        setEvent(foundEvent || null)
      }
    } catch (err) {
      setError('Erreur lors du chargement de l\'événement')
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    await joinEventWithData(formData, false)
  }

  const joinEventWithData = async (dataToSubmit: any, force: boolean = false) => {
    setIsJoining(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...dataToSubmit, force })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Gérer le cas de doublon d'email
        if (errorData.type === 'DUPLICATE_IN_EVENT' && errorData.requiresConfirmation && !force) {
          setDuplicateDialog({
            open: true,
            existingPersonName: errorData.existingPerson.name,
            email: errorData.existingPerson.email,
            pendingFormData: dataToSubmit
          })
          return
        }
        
        throw new Error(errorData.error || 'Erreur lors de l\'inscription')
      }

      const newPerson = await response.json()
      setSuccess('🎉 Inscription réussie ! Vous participez maintenant au Secret Santa.')
      setHasJoined(true)

      // Essayer de récupérer l'assignation si le tirage a déjà eu lieu
      setTimeout(checkForAssignment, 1000)
      
    } catch (err) {
      if (err instanceof Error) {
        // Personnaliser certains messages d'erreur
        if (err.message.includes('email') && err.message.includes('valide')) {
          setError('📧 Veuillez saisir une adresse email valide')
        } else if (err.message.includes('nom') && err.message.includes('obligatoire')) {
          setError('👤 Le nom est obligatoire')
        } else {
          setError(err.message)
        }
      } else {
        setError('Une erreur inattendue est survenue lors de votre inscription. Veuillez réessayer.')
      }
    } finally {
      setIsJoining(false)
    }
  }

  const handleDuplicateConfirm = () => {
    if (duplicateDialog.pendingFormData) {
      joinEventWithData(duplicateDialog.pendingFormData, true)
    }
    setDuplicateDialog({
      open: false,
      existingPersonName: '',
      email: '',
      pendingFormData: null
    })
  }

  const handleDuplicateCancel = () => {
    setDuplicateDialog({
      open: false,
      existingPersonName: '',
      email: '',
      pendingFormData: null
    })
    setIsJoining(false)
  }

  const checkForAssignment = async () => {
    try {
      const response = await fetch(`/api/persons/${formData.email}/assignment?eventId=${eventId}`)
      if (response.ok) {
        const data = await response.json()
        setUserAssignment(data.receiver)
      }
    } catch (err) {
      // Pas d'assignation encore, c'est normal
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardContent className="pt-6">
            <p>Chargement de l'événement...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Événement non trouvé</CardTitle>
            <CardDescription>
              Cet événement Secret Santa n'existe pas ou a été supprimé.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')} className="w-full">
              Créer un nouvel événement
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto pt-12">
        
        {/* En-tête événement */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎅 Rejoindre le Secret Santa
          </h1>
          <Card>
            <CardHeader>
              <CardTitle>{event.name}</CardTitle>
              <CardDescription>
                📅 {new Date(event.date).toLocaleDateString('fr-FR', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </CardDescription>
            </CardHeader>
            {event.description && (
              <CardContent>
                <p className="text-gray-600">{event.description}</p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Formulaire d'inscription */}
        {!hasJoined ? (
          <Card>
            <CardHeader>
              <CardTitle>Participer à l'événement</CardTitle>
              <CardDescription>
                Remplissez vos informations pour rejoindre le Secret Santa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinEvent} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Votre nom *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Jean Dupont"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Votre email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jean.dupont@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="giftIdea">Idée de cadeau (optionnel)</Label>
                  <Textarea
                    id="giftIdea"
                    placeholder="Décrivez ce qui vous ferait plaisir (livres, gadgets, etc.)"
                    value={formData.giftIdea}
                    onChange={(e) => setFormData(prev => ({ ...prev, giftIdea: e.target.value }))}
                    rows={3}
                  />
                  <p className="text-sm text-gray-500">
                    Cette information aidera la personne qui vous tirera au sort
                  </p>
                </div>

                <ImageUpload
                  currentImage={formData.giftImage}
                  onImageUploaded={(url) => setFormData(prev => ({ ...prev, giftImage: url }))}
                  label="Photo de votre idée cadeau (optionnel)"
                />

                <Button type="submit" className="w-full" disabled={isJoining}>
                  {isJoining ? 'Inscription en cours...' : '🎁 Rejoindre le Secret Santa'}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          /* Confirmation d'inscription */
          <div className="space-y-6">
            <Alert>
              <AlertDescription className="text-lg">
                {success}
              </AlertDescription>
            </Alert>

            {userAssignment ? (
              <Card>
                <CardHeader>
                  <CardTitle>🎯 Votre mission</CardTitle>
                  <CardDescription>
                    Le tirage au sort a déjà eu lieu ! Voici à qui vous devez offrir un cadeau :
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-lg">{userAssignment.name}</h3>
                    <p className="text-gray-600">{userAssignment.email}</p>
                    {userAssignment.giftIdea && (
                      <div className="mt-3">
                        <p className="font-medium text-green-700">💡 Idée de cadeau :</p>
                        <p className="text-gray-700">{userAssignment.giftIdea}</p>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-3">
                    Gardez cette information secrète ! 🤫
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>⏳ En attente du tirage au sort</CardTitle>
                  <CardDescription>
                    L'organisateur n'a pas encore effectué le tirage au sort. 
                    Vous recevrez votre assignation par email une fois que ce sera fait.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Revenez sur cette page plus tard ou attendez la notification par email.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Messages d'erreur */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

      </div>

      {/* Dialog de confirmation pour les doublons d'email */}
      <DuplicateEmailDialog
        open={duplicateDialog.open}
        onOpenChange={(open) => !open && handleDuplicateCancel()}
        onConfirm={handleDuplicateConfirm}
        existingPersonName={duplicateDialog.existingPersonName}
        email={duplicateDialog.email}
        eventContext="cet événement"
      />
    </div>
  )
}
