// Utilitaires pour la gestion et le formatage des erreurs

interface ApiErrorResponse {
  error: string
  type?: string
  details?: any
}

/**
 * Formate un message d'erreur pour l'affichage utilisateur
 */
export function formatErrorMessage(error: unknown, context = ''): string {
  if (!error) return 'Une erreur inconnue est survenue'

  if (error instanceof Error) {
    return formatKnownError(error.message, context)
  }

  if (typeof error === 'string') {
    return formatKnownError(error, context)
  }

  return 'Une erreur inattendue est survenue'
}

/**
 * Formate les erreurs connues avec des icônes et messages appropriés
 */
function formatKnownError(message: string, context: string): string {
  const lowerMessage = message.toLowerCase()
  const lowerContext = context.toLowerCase()

  // Erreurs de doublon d'email
  if (lowerMessage.includes('déjà utilisé') || lowerMessage.includes('participe déjà')) {
    return `❌ ${message}`
  }

  // Erreurs de validation email
  if (lowerMessage.includes('email') && (lowerMessage.includes('valide') || lowerMessage.includes('format'))) {
    return `📧 ${message.includes('Veuillez') ? message : 'Veuillez saisir une adresse email valide'}`
  }

  // Erreurs de champs obligatoires
  if (lowerMessage.includes('obligatoire')) {
    if (lowerMessage.includes('nom')) {
      return `👤 ${message}`
    }
    if (lowerMessage.includes('email')) {
      return `📧 ${message}`
    }
    return `⚠️ ${message}`
  }

  // Erreurs de tirage au sort
  if (lowerContext.includes('tirage') || lowerContext.includes('draw')) {
    if (lowerMessage.includes('au moins 2')) {
      return '👥 Il faut au moins 2 participants pour effectuer un tirage au sort'
    }
    if (lowerMessage.includes('déjà été effectué')) {
      return '🎲 Le tirage au sort a déjà été effectué pour cet événement'
    }
    return `🎲 ${message}`
  }

  // Erreurs d'email
  if (lowerContext.includes('email') || lowerContext.includes('mail')) {
    return `📧 ${message}`
  }

  // Erreurs de connexion
  if (lowerMessage.includes('connexion') || lowerMessage.includes('réseau') || lowerMessage.includes('fetch')) {
    return `🌐 Problème de connexion. Vérifiez votre connexion internet et réessayez.`
  }

  // Erreurs d'autorisation
  if (lowerMessage.includes('autoris') || lowerMessage.includes('permission')) {
    return `🔒 ${message}`
  }

  // Message générique avec contexte si disponible
  if (context) {
    return `⚠️ Erreur ${context}: ${message}`
  }

  return message
}

/**
 * Extrait et formate une erreur depuis une réponse API
 */
export async function handleApiError(response: Response, context = ''): Promise<string> {
  try {
    const errorData: ApiErrorResponse = await response.json()
    return formatErrorMessage(errorData.error, context)
  } catch {
    // Si on ne peut pas parser la réponse JSON
    switch (response.status) {
      case 400:
        return '⚠️ Données invalides. Vérifiez les informations saisies.'
      case 401:
        return '🔒 Accès non autorisé'
      case 403:
        return '🔒 Action non autorisée'
      case 404:
        return '🔍 Ressource non trouvée'
      case 409:
        return '❌ Conflit - cette ressource existe déjà'
      case 500:
        return '🛠️ Erreur serveur. Veuillez réessayer plus tard.'
      default:
        return `⚠️ Erreur ${response.status}. Veuillez réessayer.`
    }
  }
}

/**
 * Types d'erreurs communes pour le Secret Santa
 */
export const ErrorTypes = {
  DUPLICATE_EMAIL: 'DUPLICATE_EMAIL',
  DUPLICATE_IN_EVENT: 'DUPLICATE_IN_EVENT',
  INVALID_EMAIL: 'INVALID_EMAIL',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_DRAWN: 'ALREADY_DRAWN',
  NOT_ENOUGH_PARTICIPANTS: 'NOT_ENOUGH_PARTICIPANTS',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED'
} as const

/**
 * Messages d'erreur prédéfinis
 */
export const ErrorMessages = {
  [ErrorTypes.DUPLICATE_EMAIL]: '❌ Cet email est déjà utilisé. Chaque participant doit avoir un email unique.',
  [ErrorTypes.DUPLICATE_IN_EVENT]: '❌ Cette personne participe déjà à cet événement.',
  [ErrorTypes.INVALID_EMAIL]: '📧 Veuillez saisir une adresse email valide.',
  [ErrorTypes.REQUIRED_FIELD]: '⚠️ Ce champ est obligatoire.',
  [ErrorTypes.NOT_FOUND]: '🔍 Élément non trouvé.',
  [ErrorTypes.ALREADY_DRAWN]: '🎲 Le tirage au sort a déjà été effectué.',
  [ErrorTypes.NOT_ENOUGH_PARTICIPANTS]: '👥 Il faut au moins 2 participants pour un tirage au sort.',
  [ErrorTypes.EMAIL_SEND_FAILED]: '📧 Impossible d\'envoyer l\'email. Réessayez plus tard.'
} as const

/**
 * Messages de succès prédéfinis
 */
export const SuccessMessages = {
  PERSON_ADDED: '✅ Participant ajouté avec succès !',
  PERSON_ADDED_WITH_EMAIL: '✅ Participant ajouté et invitation envoyée par email !',
  EMAIL_SENT: '📧 Email envoyé avec succès !',
  DRAW_COMPLETED: '🎯 Tirage au sort effectué avec succès !',
  DRAW_WITH_EMAILS: '🎯 Tirage au sort effectué ! Emails d\'assignation envoyés à tous les participants !',
  EVENT_CREATED: '🎉 Événement créé avec succès !',
  LINK_COPIED: '📋 Lien copié dans le presse-papier !',
  REGISTRATION_SUCCESS: '🎉 Inscription réussie ! Vous participez maintenant au Secret Santa.'
} as const
