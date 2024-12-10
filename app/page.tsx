"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gift, Plus, Trash2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [editionName, setEditionName] = useState("");
  const [participants, setParticipants] = useState([""]);
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addParticipant = () => {
    setParticipants([...participants, ""]);
  };

  const updateParticipant = (index: number, value: string) => {
    const newParticipants = [...participants];
    newParticipants[index] = value;
    setParticipants(newParticipants);
  };

  const removeParticipant = (index: number) => {
    const newParticipants = participants.filter((_, i) => i !== index);
    setParticipants(newParticipants);
  };

  const handleSubmit = async () => {
    const validParticipants = participants.filter((name) => name.trim() !== "");
    if (validParticipants.length < 3) {
      alert("Veuillez ajouter au moins 3 participants");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/editions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editionName,
          people: validParticipants,
        }),
      });

      const data = await response.json();
      router.push(`/edition/${data.id}`);
      toast({
        title: "Événement créé !",
        description: "Votre événement Secret Santa a été créé avec succès.",
      });
    } catch (error) {
      console.error("Failed to create edition:", error);
      toast({
        title: "Erreur lors de la création.",
        description:
          "Une erreur s'est produite lors de la création de l'événement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Gift className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-6 text-4xl font-bold text-gray-900">
            Secret Santa
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Créez votre événement Secret Santa et invitez des participants
          </p>
        </div>

        <Card className="p-6 bg-white shadow-lg rounded-lg">
          <div className="space-y-6">
            <div>
              <label
                htmlFor="editionName"
                className="block text-sm font-medium text-gray-700"
              >
                Nom de l'événement
              </label>
              <Input
                id="editionName"
                type="text"
                value={editionName}
                onChange={(e) => setEditionName(e.target.value)}
                placeholder="Noël 2024"
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Participants
              </label>
              {participants.map((participant, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={participant}
                    onChange={(e) => updateParticipant(index, e.target.value)}
                    placeholder="Prénom du participant"
                  />
                  {participants.length > 1 && (
                    <button
                      onClick={() => removeParticipant(index)}
                      className="text-red-500 hover:text-red-700 p-2 rounded-full flex items-center justify-center"
                      aria-label="Supprimer le participant"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addParticipant}
                className="w-full"
              >
                Ajouter un participant
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={
                !editionName || participants.filter((p) => p.trim()).length < 3
              }
            >
              {isSubmitting ? (
                <Loader2 className="animate-spin h-5 w-5 text-white" />
              ) : (
                "Créer l'événement"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
