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
}

interface Person {
  id: string
  name: string
  email: string
}

export default function OnboardingPage() {
  const params = useParams()
  const router = useRouter()
  const eventId = params.eventId as string
  
  const [event, setEvent] = useState<Event | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Step 1 - Participants
  const [persons, setPersons] = useState<Person[]>([])
  const [personForm, setPersonForm] = useState({ name: '', email: '' })
  const [isAddingPerson, setIsAddingPerson] = useState(false)
  
  // Step 2 - Email obligatoire
  const [organizerEmail, setOrganizerEmail] = useState('')
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  // États pour la gestion des doublons d'emails
  const [duplicateDialog, setDuplicateDialog] = useState({
    open: false,
    existingPersonName: '',
    email: '',
    pendingFormData: null as any
  })

  // URLs générées côté client uniquement (évite erreur SSR "window is not defined")
  const [shareUrl, setShareUrl] = useState('')
  const [eventUrl, setEventUrl] = useState('')

  useEffect(() => {
    // Initialiser les URLs côté client
    setShareUrl(`${window.location.origin}/join/${eventId}`)
    setEventUrl(`${window.location.origin}/events/${eventId}`)
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
      setIsLoading(false)
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
      // Pas grave, on continue
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
      setSuccess(data.emailSent ? 'Participant ajouté et invité par email !' : 'Participant ajouté !')
      setPersonForm({ name: '', email: '' })
      loadPersons()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Une erreur inattendue est survenue lors de l\'ajout du participant')
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

  const handleSendEventLink = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organizerEmail) return

    setIsSendingEmail(true)
    setError('')

    try {
      const response = await fetch(`/api/events/${eventId}/send-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: organizerEmail })
      })

      if (response.ok) {
        setSuccess('Lien de gestion envoyé par email.')
        setEmailSent(true)
      } else {
        const errorData = await response.json()
        if (errorData.error?.includes('email')) {
          setError('Veuillez saisir une adresse email valide.')
        } else {
          setError(errorData.error || 'Erreur lors de l\'envoi du lien par email')
        }
      }
    } catch {
      setError('Impossible d\'envoyer l\'email. Vérifiez votre connexion et réessayez.')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const copyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setSuccess('Lien d\'invitation copié !')
  }

  const goToEventPage = () => {
    router.push(`/events/${eventId}`)
  }

  const goToJoinPage = () => {
    router.push(`/join/${eventId}`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin" />
        <p className="text-gray-600 text-lg">Chargement...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Événement non trouvé</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/')}>Retour à l'accueil</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-4">
      <div className="max-w-4xl mx-auto pt-8">
        
        {/* En-tête */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Événement créé</h1>
          <h2 className="text-xl text-green-700 font-semibold">{event.name}</h2>
          <p className="text-gray-600 mt-2">Suivez ces étapes pour le préparer.</p>
        </div>

        {/* Indicateur d'étapes */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step === currentStep 
                    ? 'bg-green-600 text-white' 
                    : step < currentStep 
                      ? 'bg-green-400 text-white'
                      : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && <div className="w-12 h-1 bg-gray-300 mx-2" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Inviter des participants */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
          <CardTitle>Étape 1 : Inviter des participants</CardTitle>
          <CardDescription>Ajoutez des personnes ou partagez le lien d’inscription.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Participants actuels */}
              {persons.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">
                    Participants déjà inscrits ({persons.length})
                  </h3>
                  <div className="space-y-1">
                    {persons.map((person) => (
                      <div key={person.id} className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-green-700">
                          {person.name}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Alert>
                <AlertDescription>
                  Astuce : combinez les deux. Ajoutez certains manuellement et partagez le lien pour les autres.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Ajout manuel */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Ajouter manuellement</h3>
                  <p className="text-sm text-gray-600">Pour inscrire quelqu’un à sa place.</p>
                  <form onSubmit={handleAddPerson} className="space-y-3">
                    <div>
                      <Label htmlFor="name">Nom</Label>
                      <Input
                        id="name"
                        value={personForm.name}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={personForm.email}
                        onChange={(e) => setPersonForm(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isAddingPerson}>
                      {isAddingPerson ? 'Ajout...' : 'Ajouter et inviter'}
                    </Button>
                  </form>
                </div>

                {/* Lien de partage */}
                <div className="space-y-4">
                  <h3 className="font-semibold">Partager le lien</h3>
                  <p className="text-sm text-gray-600">Envoi simple : ils remplissent eux-mêmes.</p>
                  <div className="flex gap-2">
                    <Input 
                      value={shareUrl} 
                      readOnly 
                      className="font-mono text-xs"
                    />
                    <Button onClick={copyShareUrl} variant="outline">
                      Copier
                    </Button>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => router.push('/')}>
                  Retour
                </Button>
                <Button onClick={() => setCurrentStep(2)}>
                  Continuer
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Explication et email obligatoire */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
          <CardTitle>Étape 2 : Conservez l’accès</CardTitle>
          <CardDescription>Vous reviendrez ici pour lancer le tirage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <Alert>
                <AlertDescription>
                  1) Les participants s’inscrivent (manuellement ou via le lien).<br/>
                  2) Quand c’est complet, revenez sur la page de gestion.<br/>
                  3) Lancez le tirage au sort.<br/>
                  4) Chaque participant reçoit son assignation par email.
                </AlertDescription>
              </Alert>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Recevez le lien par email (obligatoire)
                </h3>
                <p className="text-yellow-700 text-sm mb-4">
                  Pour ne pas perdre l'accès à votre événement, nous devons vous envoyer le lien de gestion.
                </p>
                
                {!emailSent ? (
                  <form onSubmit={handleSendEventLink} className="space-y-3">
                    <div>
                      <Label htmlFor="organizerEmail">Votre email</Label>
                      <Input
                        id="organizerEmail"
                        type="email"
                        placeholder="votre@email.com"
                        value={organizerEmail}
                        onChange={(e) => setOrganizerEmail(e.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={isSendingEmail || !organizerEmail}>
                      {isSendingEmail ? 'Envoi...' : 'Recevoir le lien par email'}
                    </Button>
                  </form>
                ) : (
                  <div className="text-green-700">
                    Email envoyé. Vérifiez votre boîte de réception.
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">
                  Lien de gestion
                </h3>
                <p className="text-blue-700 text-sm mb-2">
                  Vous pouvez aussi sauvegarder ce lien directement :
                </p>
                <div className="flex gap-2">
                  <Input 
                    value={eventUrl} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    onClick={() => navigator.clipboard.writeText(eventUrl)} 
                    variant="outline"
                  >
                    Copier
                  </Button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(1)}>
                  ← Précédent
                </Button>
                <Button 
                  onClick={() => setCurrentStep(3)} 
                  disabled={!emailSent}
                >
                  Continuer →
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: S'inscrire soi-même (optionnel) */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
          <CardTitle>Étape 3 : Participez (optionnel)</CardTitle>
          <CardDescription>Inscrivez-vous aussi si vous voulez jouer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="text-center space-y-4">
                <p className="text-lg">
                  En tant qu'organisateur, vous pouvez aussi participer au Secret Santa.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={goToJoinPage}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Je participe
                  </Button>
                  <Button 
                    onClick={goToEventPage}
                    variant="outline"
                    size="lg"
                  >
                    Passer cette étape
                  </Button>
                </div>
              </div>

              <div className="text-center">
                <Button 
                  onClick={goToEventPage}
                  size="lg"
                  variant="default"
                >
                  Accéder à la page de gestion
                </Button>
              </div>

              {/* Navigation */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep(2)}>
                  Précédent
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

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
