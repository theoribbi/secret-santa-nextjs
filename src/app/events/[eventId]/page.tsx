'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import DuplicateEmailDialog from '@/components/DuplicateEmailDialog'

interface Event {
  id: string
  name: string
  description?: string
  date: string
  createdAt: string
}

interface Person {
  id: string
  name: string
  email: string
  giftIdea?: string
  giftImage?: string
}

export default function EventManagePage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [persons, setPersons] = useState<Person[]>([])
  const [isLoadingEvent, setIsLoadingEvent] = useState(true)
  const [isLoadingPersons, setIsLoadingPersons] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [drawStatus, setDrawStatus] = useState<'not_done' | 'done' | 'loading'>('not_done')

  // Formulaire d'ajout de personne
  const [personForm, setPersonForm] = useState({
    name: '',
    email: '',
    giftIdea: '',
    giftImage: ''
  })
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  const [emailForm, setEmailForm] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  
  // États pour la gestion des doublons d'emails
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    existingPersonName: '',
    email: '',
    pendingFormData: null as any
  })

  const shareUrl = `${window.location.origin}/join/${eventId}`

  useEffect(() => {
    loadEvent()
    loadPersons()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  const loadEvent = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const events = await response.json()
        const foundEvent = events.find((e: Event) => e.id === eventId)
        setEvent(foundEvent || null)
      }
    } catch {
      setError('Erreur lors du chargement de l\'événement')
    } finally {
      setIsLoadingEvent(false)
    }
  }

  const loadPersons = async () => {
    try {
      const response = await fetch(`/api/events/${eventId}/persons`)
      if (response.ok) {
        const data = await response.json()
        setPersons(data)
      }
    } catch {
      setError('Erreur lors du chargement des participants')
    } finally {
      setIsLoadingPersons(false)
    }
  }

  const handleAddPerson = async (e: React.FormEvent) => {
    e.preventDefault()
    await addPersonWithData(personForm, false)
  }

  const addPersonWithData = async (formData: any, force: boolean = false) => {
    setIsAddingPerson(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/persons`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, force })
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Gérer le cas de doublon d'email
        if (errorData.type === 'DUPLICATE_IN_EVENT' && errorData.requiresConfirmation && !force) {
          setDuplicateDialog({
            open: true,
            existingPersonName: errorData.existingPerson.name,
            email: errorData.existingPerson.email,
            pendingFormData: formData
          })
          return
        }
        
        throw new Error(errorData.error || 'Erreur lors de l\'ajout de la personne')
      }

      const data = await response.json()
      if (data.emailSent) {
        setSuccess('Participant ajouté. Invitation envoyée par email.')
      } else {
        setSuccess('Participant ajouté.')
      }
      setPersonForm({ name: '', email: '', giftIdea: '', giftImage: '' })
      loadPersons()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Une erreur inattendue est survenue')
      }
    } finally {
      setIsAddingPerson(false)
    }
  }

  const handleDuplicateConfirm = () => {
    if (duplicateDialog.pendingFormData) {
      addPersonWithData(duplicateDialog.pendingFormData, true)
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
    setIsAddingPerson(false)
  }

  const handleDraw = async () => {
    const hasMissingGiftInfo = persons.some(
      (person) => !person.giftIdea?.trim() && !person.giftImage?.trim()
    )

    if (hasMissingGiftInfo) {
      const proceed = confirm(
        'Certaines personnes n’ont pas complété leur idée cadeau. Lancer le tirage malgré tout ?'
      )
      if (!proceed) return
    }

    setDrawStatus('loading')
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/draw`, {
        method: 'POST'
      })

      const result = await response.json()
      
      if (response.ok) {
        if (result.emailsSent) {
          setSuccess(`${result.message} — emails d'assignation envoyés.`)
        } else {
          setSuccess(result.message)
        }
        setDrawStatus('done')
      } else {
        const alreadyDone = result.message?.includes('déjà été effectué')
        if (result.message?.includes('au moins 2')) {
          setError('Il faut au moins 2 participants pour effectuer un tirage au sort.')
        } else if (alreadyDone) {
          setError('Le tirage au sort a déjà été effectué pour cet événement.')
        } else {
          setError(result.message || 'Une erreur est survenue lors du tirage au sort.')
        }
        setDrawStatus(alreadyDone ? 'done' : 'not_done')
      }
    } catch (err) {
      setError('Impossible d\'effectuer le tirage au sort. Vérifiez votre connexion et réessayez.')
      setDrawStatus('not_done')
    }
  }

  const handleResetDraw = async () => {
    if (!confirm('Êtes-vous sûr de vouloir réinitialiser le tirage au sort ?')) return

    setDrawStatus('loading')
    try {
      const response = await fetch(`/api/events/${eventId}/draw`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setSuccess('Tirage au sort réinitialisé')
        setDrawStatus('not_done')
      }
    } catch (err) {
      setError('Erreur lors de la réinitialisation')
    }
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setSuccess('Lien copié dans le presse-papier.')
  }

  const handleSendEventLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailForm) return

    setIsSendingEmail(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailForm })
      })

      if (response.ok) {
        setSuccess('Lien de gestion envoyé par email.')
        setEmailForm('')
      } else {
        const errorData = await response.json()
        if (errorData.error.includes('email')) {
          setError('Veuillez saisir une adresse email valide.')
        } else {
          setError(errorData.error || 'Erreur lors de l\'envoi du lien par email')
        }
      }
    } catch (err) {
      setError('Impossible d\'envoyer l\'email. Vérifiez votre connexion et réessayez.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isLoadingEvent) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Événement non trouvé</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push(`/events/${eventId}/onboarding`)}
            >
              📋 Guide d'installation
            </Button>
          </div>
          <p className="text-gray-600">
            📅 {new Date(event.date).toLocaleDateString('fr-FR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          {event.description && (
            <p className="text-gray-600 mt-2">{event.description}</p>
          )}
        </div>

        <Card className="mb-6 border-dashed">
          <CardHeader>
            <CardTitle>Deux façons d'ajouter des participants</CardTitle>
            <CardDescription>
              Choisissez l'option la plus simple selon la situation.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Inviter avec le lien</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Copiez le lien et envoyez-le aux participants.</li>
                <li>Ils remplissent eux-mêmes leurs infos et idée cadeau.</li>
                <li>Moins d'erreurs, vous gagnez du temps.</li>
              </ul>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-gray-900">Ajout manuel</p>
              <ul className="list-disc list-inside space-y-1">
                <li>À utiliser si vous inscrivez quelqu'un à sa place.</li>
                <li>Pratique si la personne ne peut pas accéder au lien.</li>
                <li>Vous restez responsable de l'exactitude des infos.</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section lien de partage */}
          <Card>
            <CardHeader>
              <CardTitle>Inviter des participants</CardTitle>
              <CardDescription>
                Partagez ce lien pour que les participants s'inscrivent eux-mêmes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input 
                  value={shareUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button onClick={copyShareUrl} variant="outline">
                  Copier
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section ajout manuel */}
          <Card>
            <CardHeader>
              <CardTitle>Ajouter manuellement</CardTitle>
              <CardDescription>
                À utiliser si vous complétez les infos à la place de quelqu'un.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPerson} className="space-y-3">
                <div>
                  <Label htmlFor="name">Nom *</Label>
                  <Input
                    id="name"
                    value={personForm.name}
                    onChange={(e) => setPersonForm(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={personForm.email}
                    onChange={(e) => setPersonForm(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isAddingPerson}>
                  {isAddingPerson ? 'Ajout...' : 'Ajouter'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Liste des participants */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Participants ({persons.length})</CardTitle>
            {persons.length >= 2 && (
              <div className="flex gap-2">
                {drawStatus === 'not_done' && (
                  <Button onClick={handleDraw} className="bg-green-600 hover:bg-green-700">
                    Lancer le tirage au sort
                  </Button>
                )}
                {drawStatus === 'done' && (
                  <Button onClick={handleResetDraw} variant="outline">
                    Réinitialiser le tirage
                  </Button>
                )}
                {drawStatus === 'loading' && (
                  <Button disabled>Tirage en cours...</Button>
                )}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {isLoadingPersons ? (
              <p>Chargement des participants...</p>
            ) : persons.length === 0 ? (
              <p className="text-gray-500">Aucun participant pour le moment.</p>
            ) : (
              <div className="space-y-2">
                {persons.map((person) => {
                  const hasGiftDetails = Boolean(person.giftIdea?.trim() || person.giftImage?.trim())
                  return (
                    <div key={person.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{person.name}</p>
                        <p className="text-sm text-gray-600">{person.email}</p>
                      </div>
                      <Badge variant={hasGiftDetails ? 'default' : 'secondary'}>
                        {hasGiftDetails ? 'Inscrit' : 'Cadeau à compléter'}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}

            {persons.length > 0 && persons.length < 2 && (
              <Alert className="mt-4">
                <AlertDescription>
                  Il faut au moins 2 participants pour effectuer un tirage au sort.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Messages d'état */}
        {error && (
          <Alert variant="destructive" className="mt-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mt-4">
            <AlertDescription>{success}</AlertDescription>
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
