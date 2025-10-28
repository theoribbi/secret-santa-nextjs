'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'

interface TestResult {
  success: boolean
  step: string
  message: string
  details?: any
  suggestions?: string[]
}

export default function TestSMTPPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<TestResult[]>([])
  const [smtpConfig, setSMTpConfig] = useState<any>(null)

  const loadSMTPConfig = async () => {
    try {
      const response = await fetch('/api/admin/test-smtp')
      const data = await response.json()
      setSMTpConfig(data.config)
    } catch (error) {
      console.error('Erreur chargement config:', error)
    }
  }

  const runSMTPTest = async () => {
    if (!email.trim()) {
      alert('Veuillez saisir une adresse email de test')
      return
    }

    setIsLoading(true)
    setResults([])

    try {
      const response = await fetch('/api/admin/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() })
      })

      const data = await response.json()
      
      if (data.results) {
        setResults(data.results)
      } else {
        setResults([{
          success: false,
          step: 'API',
          message: data.error || 'Erreur inconnue',
          suggestions: ['Vérifiez les logs du serveur', 'Vérifiez la configuration SMTP']
        }])
      }
    } catch (error) {
      setResults([{
        success: false,
        step: 'Réseau',
        message: 'Impossible de contacter le serveur',
        suggestions: ['Vérifiez votre connexion internet', 'Rechargez la page et réessayez']
      }])
    } finally {
      setIsLoading(false)
    }
  }

  // Charger la config au montage du composant
  useEffect(() => {
    loadSMTPConfig()
  }, [])

  const getStepIcon = (success: boolean, step: string) => {
    if (step === 'Configuration') return '⚙️'
    if (step === 'Connexion') return '🔌'
    if (step === 'Authentification') return '🔐'
    if (step === 'Envoi') return '📧'
    return success ? '✅' : '❌'
  }

  const getAlertVariant = (success: boolean): "default" | "destructive" => {
    return success ? "default" : "destructive"
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🧪 Test SMTP - Secret Santa
          </h1>
          <p className="text-gray-600">
            Testez votre configuration email de production
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Configuration actuelle */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                ⚙️ Configuration SMTP
              </CardTitle>
              <CardDescription>
                Configuration chargée depuis les variables d'environnement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {smtpConfig ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="font-medium">Host:</span>
                    <Badge variant="outline">{smtpConfig.host || '❌ Non défini'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Port:</span>
                    <Badge variant="outline">{smtpConfig.port || '❌ Non défini'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Sécurisé:</span>
                    <Badge variant={smtpConfig.secure ? "default" : "destructive"}>
                      {smtpConfig.secure ? '🔒 SSL/TLS' : '🔓 Non sécurisé'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Utilisateur:</span>
                    <Badge variant="outline">{smtpConfig.user || '❌ Non défini'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Mot de passe:</span>
                    <Badge variant={smtpConfig.hasPassword ? "default" : "destructive"}>
                      {smtpConfig.hasPassword ? '✅ Configuré' : '❌ Manquant'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Expéditeur:</span>
                    <Badge variant="outline">{smtpConfig.from || '❌ Non défini'}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Environnement:</span>
                    <Badge variant={smtpConfig.environment === 'production' ? "default" : "secondary"}>
                      {smtpConfig.environment}
                    </Badge>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="animate-pulse">⏳ Chargement de la configuration...</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Formulaire de test */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                🧪 Lancer le test
              </CardTitle>
              <CardDescription>
                Envoyez un email de test pour valider la configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse email de test</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'email de test sera envoyé à cette adresse
                </p>
              </div>

              <Button 
                onClick={runSMTPTest}
                disabled={isLoading || !email.trim()}
                className="w-full"
                size="lg"
              >
                {isLoading ? (
                  <>⏳ Test en cours...</>
                ) : (
                  <>🚀 Lancer le test SMTP</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Résultats du test */}
        {results.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📋 Résultats du test
              </CardTitle>
              <CardDescription>
                Détail des étapes du test SMTP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {results.map((result, index) => (
                  <Alert key={index} variant={getAlertVariant(result.success)}>
                    <AlertDescription>
                      <div className="space-y-2">
                        {/* En-tête du résultat */}
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{getStepIcon(result.success, result.step)}</span>
                          <span className="font-semibold">{result.step}:</span>
                          <span className={result.success ? "text-green-700" : "text-red-700"}>
                            {result.success ? "Réussi" : "Échec"}
                          </span>
                        </div>
                        
                        {/* Message */}
                        <div className="text-sm">
                          {result.message}
                        </div>
                        
                        {/* Détails techniques */}
                        {result.details && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-gray-600 hover:text-gray-800">
                              Détails techniques
                            </summary>
                            <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(result.details, null, 2)}
                            </pre>
                          </details>
                        )}
                        
                        {/* Suggestions */}
                        {result.suggestions && result.suggestions.length > 0 && (
                          <div className="mt-2">
                            <div className="text-sm font-medium text-gray-700 mb-1">💡 Suggestions:</div>
                            <ul className="text-sm text-gray-600 space-y-1">
                              {result.suggestions.map((suggestion, i) => (
                                <li key={i} className="flex items-start gap-1">
                                  <span>•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>

              {/* Résumé */}
              <div className="mt-6 pt-4 border-t">
                {results.every(r => r.success) ? (
                  <Alert>
                    <AlertDescription className="flex items-center gap-2">
                      <span className="text-lg">🎉</span>
                      <span className="font-semibold text-green-700">
                        Configuration SMTP parfaitement fonctionnelle !
                      </span>
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert variant="destructive">
                    <AlertDescription className="flex items-center gap-2">
                      <span className="text-lg">⚠️</span>
                      <span className="font-semibold">
                        Problèmes détectés dans la configuration SMTP
                      </span>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>🔒 Cette page est uniquement accessible en développement ou avec les droits admin</p>
        </div>
      </div>
    </div>
  )
}
