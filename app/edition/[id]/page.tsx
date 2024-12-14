"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Mail, Image as ImageIcon, Check } from "lucide-react";
import { Person } from "@prisma/client";
import { Share } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Edition = {
  id: string;
  name: string;
  createdAt: Date;
  status: string;
  people: Person[];
};

export default function EditionPage({ params }: { params: { id: string } }) {
  const [edition, setEdition] = useState<Edition | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [email, setEmail] = useState("");
  const [giftIdeas, setGiftIdeas] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const inputFileRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);

  useEffect(() => {
    const fetchEdition = async () => {
      const response = await fetch(`/api/editions/${params.id}`);
      const data = await response.json();
      setEdition(data);
      setIsLoading(false);
    };
    fetchEdition();
  }, [params.id]);

  const handlePersonSelect = (person: Person) => {
    setSelectedPerson(person);
    setEmail(person.email || "");
    setGiftIdeas(person.giftIdeas || "");
    setImageUrl(person.imageUrl || "");
  };

  const handleSubmit = async () => {
    if (!selectedPerson) return;

    setIsSubmitting(true);

    const formData = new FormData();
    formData.append("personId", selectedPerson.id);
    formData.append("email", email);
    formData.append("giftIdeas", giftIdeas);

    if (inputFileRef.current?.files) {
      const file = inputFileRef.current.files[0];
      if (file) {
        formData.append("image", file);
      }
    }

    try {
      const response = await fetch(`/api/editions/${params.id}/person`, {
        method: "PUT",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to update person:", errorData.error);
        toast({
          title: "Échec de la mise à jour.",
          description: "Il y a eu un problème avec votre demande.",
        });
        return;
      }

      const updatedPerson = await response.json();
      setEdition((prev) =>
        prev
          ? {
              ...prev,
              people: prev.people.map((p: Person) =>
                p.id === updatedPerson.id ? updatedPerson : p
              ),
            }
          : null
      );
      setSelectedPerson(null);
      toast({
        title: "Mise à jour réussie !",
        description: `${updatedPerson.name} a été mise à jour avec succès.`,
      });
    } catch (error) {
      console.error("Failed to update person:", error);
      toast({
        title: "Erreur lors de la mise à jour.",
        description:
          "Une erreur s'est produite lors de la mise à jour de la personne.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/edition/${params.id}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Lien copié",
        description: "Le lien a été copié dans votre presse-papiers.",
      });
    } catch (error) {
      console.error("Erreur lors de la copie :", error);
      toast({
        title: "Erreur",
        description: "Impossible de copier le lien.",
      });
    }
  };

  const handleDraw = async () => {
    if (!isReadyToDraw) {
      setShowWarningModal(true);
      return;
    }

    setShowConfirmationModal(true);
  };

  const handleDrawConfirmed = async () => {
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/editions/${params.id}/draw`, {
        method: "POST",
      });

      if (response.ok) {
        setEdition((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
        toast({
          title: "Succès !",
          description: "Les résultats ont été envoyés avec succès.",
        });
      } else {
        toast({
          title: "Échec de l'envoi.",
          description: "Il y a eu un problème lors de l'envoi des résultats.",
        });
      }
    } catch (error) {
      console.error("Failed to draw names:", error);
      toast({
        title: "Erreur lors de l'envoi.",
        description: "Une erreur s'est produite lors de l'envoi des résultats.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReadyToDraw = edition?.people.every(
    (person: Person) => person.email && person.giftIdeas
  );

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin h-10 w-10 text-primary" />
      </div>
    );

  return (
    <>
      {isLoading && (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="animate-spin h-10 w-10 text-primary" />
        </div>
      )}

      <AlertDialog
        open={showWarningModal}
        onOpenChange={() => setShowWarningModal(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Avertissement</AlertDialogTitle>
            <AlertDialogDescription>
              Certaines personnes n'ont pas encore complété leurs informations.
              Veuillez vous assurer que tous les participants sont correctement
              renseignés avant de continuer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWarningModal(false)}>
              J'ai compris
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showConfirmationModal}
        onOpenChange={() => setShowConfirmationModal(false)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer l'envoi</AlertDialogTitle>
            <AlertDialogDescription>
              En confirmant, le tirage au sort sera effectué, et les résultats
              seront envoyés par e-mail à tous les participants. Cette action
              est irréversible. Souhaitez-vous continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowConfirmationModal(false)}>
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDrawConfirmed}>
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Gift className="mx-auto h-16 w-16 text-primary" />
            <h1 className="mt-6 text-4xl font-bold text-gray-900">
              {edition?.name}
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              {edition?.status === "COMPLETED"
                ? "Les attributions du Secret Santa ont été envoyées !"
                : "Cliquez sur votre nom pour ajouter vos informations"}
            </p>
          </div>

          <div className="max-w-xl mx-auto grid sm:grid-cols-1 gap-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Participants</h2>
              <div className="space-y-2">
                {edition?.people.map((person: Person) => {
                  const isPersonCompleted =
                    !!person.email && !!person.giftIdeas;

                  return (
                    <Button
                      key={person.id}
                      variant={isPersonCompleted ? "default" : "outline"}
                      className="w-full justify-between"
                      onClick={() => handlePersonSelect(person)}
                      disabled={Boolean(
                        isPersonCompleted || edition.status === "COMPLETED"
                      )}
                    >
                      <span>{person.name}</span>
                      {isPersonCompleted && <Check className="h-4 w-4" />}
                    </Button>
                  );
                })}
              </div>

              {edition?.status === "PENDING" && (
                <>
                  <Button
                    onClick={handleShare}
                    variant="outline"
                    className="flex items-center mt-4 justify-center w-full"
                    disabled={isSubmitting}
                  >
                    <Share className="mr-2 h-4 w-4" />
                    Copier le lien du Secret Santa
                  </Button>
                  <Button
                    className="w-full mt-6"
                    onClick={handleDraw}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="animate-spin h-5 w-5 text-white" />
                    ) : (
                      "Clôturer et envoyer les résultats du tirage"
                    )}
                  </Button>
                </>
              )}
            </Card>
          </div>

          <Dialog
            open={!!selectedPerson}
            onOpenChange={() => setSelectedPerson(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Détail de {selectedPerson?.name}</DialogTitle>
                <DialogDescription>
                  Complétez les informations suivantes pour participer.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <Mail className="inline-block w-4 h-4 mr-2" />
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <Gift className="inline-block w-4 h-4 mr-2" />
                    Idées de cadeaux
                  </label>
                  <Textarea
                    value={giftIdeas}
                    onChange={(e) => setGiftIdeas(e.target.value)}
                    placeholder="Partagez vos idées de cadeaux..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <ImageIcon className="inline-block w-4 h-4 mr-2" />
                    Image (optionnelle)
                  </label>
                  <Input
                    ref={inputFileRef}
                    type="file"
                    accept="image/*"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  className="w-full mt-4"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                  ) : (
                    "Envoyer"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {edition?.status === "COMPLETED" && (
            <div className="pt-4 ">
              <div
                className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative"
                role="alert"
              >
                <strong className="font-bold">Succès !</strong>
                <span className="block sm:inline">
                  {" "}
                  Le tirage au sort a été effectué avec succès, et tous les
                  participants ont reçu un email avec les détails.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
