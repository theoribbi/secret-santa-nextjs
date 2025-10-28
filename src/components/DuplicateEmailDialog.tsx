'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface DuplicateEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  existingPersonName: string
  email: string
  eventContext?: string
}

export default function DuplicateEmailDialog({
  open,
  onOpenChange,
  onConfirm,
  existingPersonName,
  email,
  eventContext = "cet événement"
}: DuplicateEmailDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>⚠️ Email déjà utilisé</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              L'email <strong>{email}</strong> est déjà utilisé par{' '}
              <strong>{existingPersonName}</strong> dans {eventContext}.
            </p>
            <p>
              Voulez-vous quand même ajouter cette personne ? 
              Cela créera un doublon avec le même email.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            ❌ Annuler
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-orange-600 hover:bg-orange-700"
          >
            ✅ Ajouter quand même
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
