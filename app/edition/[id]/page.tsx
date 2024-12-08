"use client";

import { useEffect, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Mail, Image as ImageIcon, Check } from "lucide-react";
import { Person } from "@prisma/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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
    } catch (error) {
      console.error("Failed to update person:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDraw = async () => {
    try {
      const response = await fetch(`/api/editions/${params.id}/draw`, {
        method: "POST",
      });

      if (response.ok) {
        setEdition((prev) => (prev ? { ...prev, status: "COMPLETED" } : null));
      }
    } catch (error) {
      console.error("Failed to draw names:", error);
    }
  };

  const isReadyToDraw = edition?.people.every(
    (person: Person) => person.email && person.giftIdeas
  );

  if (isLoading) return <div>Loading...</div>;

  return (
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
                const isPersonCompleted = !!person.email && !!person.giftIdeas;

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
              <Button
                className="w-full mt-6"
                onClick={handleDraw}
                disabled={!isReadyToDraw}
              >
                Envoyer les résultats par e-mail
              </Button>
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

              <Button onClick={handleSubmit} className="w-full mt-4">
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5 text-white" />
                ) : (
                  "Envoyer"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
