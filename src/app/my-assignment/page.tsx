'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface Person {
  id: string
  name: string
  email: string
  giftIdea?: string
  giftImage?: string
}

interface Event {
  id: string
  name: string
  date: string
}

export default function MyAssignmentPage() {
  const [searchForm, setSearchForm] = useState({
    email: '',
    eventId: ''
  })
  const [events, setEvents] = useState<Event[]>([])
  const [assignment, setAssignment] = useState<Person | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  // Charger les événements pour la sélection
  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (response.ok) {
        const eventList = await response.json()
        setEvents(eventList)
      }
      } catch (error) {
        console.error('Erreur chargement événements:', error)
      }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setAssignment(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/persons/${searchForm.email}/assignment?eventId=${searchForm.eventId}`)
      
      if (response.ok) {
        const data = await response.json()
        setAssignment(data.receiver)
      } else if (response.status === 404) {
        setError('Aucune assignation trouvée. Vérifiez votre email et l\'événement sélectionné.')
      } else {
        throw new Error('Erreur lors de la recherche')
      }
    } catch (err) {
      setError('Erreur lors de la recherche de votre assignation')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-green-50 p-4">
      <div className="max-w-2xl mx-auto pt-20">
        
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🔍 Mon assignation Secret Santa
          </h1>
          <p className="text-lg text-gray-600">
            Retrouvez à qui vous devez offrir un cadeau
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Rechercher mon assignation</CardTitle>
            <CardDescription>
              Entrez votre email et sélectionnez l'événement pour retrouver votre assignation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Votre email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre.email@example.com"
                  value={searchForm.email}
                  onChange={(e) => setSearchForm(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventId">Événement Secret Santa</Label>
                <Select 
                  value={searchForm.eventId} 
                  onValueChange={(value) => setSearchForm(prev => ({ ...prev, eventId: value }))}
                  onOpenChange={(open) => open && events.length === 0 && loadEvents()}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un événement" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} - {new Date(event.date).toLocaleDateString('fr-FR')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !searchForm.eventId}>
                {isLoading ? 'Recherche...' : '🔍 Trouver mon assignation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Résultat de l'assignation */}
        {assignment && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>🎯 Votre mission Secret Santa</CardTitle>
              <CardDescription>
                Voici à qui vous devez offrir un cadeau :
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-green-50 rounded-lg">
                <h3 className="text-2xl font-semibold text-green-800 mb-2">{assignment.name}</h3>
                <p className="text-gray-700 mb-4">{assignment.email}</p>
                
                {assignment.giftIdea && (
                  <div className="mb-4">
                    <p className="font-semibold text-green-700 mb-1">💡 Idée de cadeau :</p>
                    <p className="text-gray-700 bg-white p-3 rounded border">{assignment.giftIdea}</p>
                  </div>
                )}

                {assignment.giftImage && (
                  <div className="mb-4">
                    <p className="font-semibold text-green-700 mb-2">🖼️ Image de référence :</p>
                    <Image 
                      src={assignment.giftImage} 
                      alt="Idée cadeau" 
                      width={300}
                      height={200}
                      className="max-w-full h-auto rounded border max-h-64 object-cover"
                    />
                  </div>
                )}

                <div className="bg-yellow-100 p-3 rounded mt-4">
                  <p className="text-sm text-yellow-800">
                    🤫 <strong>Gardez cette information secrète !</strong> La magie du Secret Santa réside dans la surprise.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Messages d'état */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {hasSearched && !assignment && !error && !isLoading && (
          <Alert className="mt-6">
            <AlertDescription>
              Le tirage au sort n'a peut-être pas encore été effectué pour cet événement, 
              ou vous n'êtes pas inscrit à cet événement.
            </AlertDescription>
          </Alert>
        )}

      </div>
    </div>
  )
}
