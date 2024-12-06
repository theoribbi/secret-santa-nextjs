"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Mail, Image as ImageIcon, Check } from "lucide-react";
import { Person } from "@prisma/client";

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

  useEffect(() => {
    const fetchEdition = async () => {
      const response = await fetch(`/api/editions/${params.id}`);
      const data = await response.json();
      setEdition(data);
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

    try {
      const response = await fetch(`/api/editions/${params.id}/person`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          personId: selectedPerson.id,
          email,
          giftIdeas,
          imageUrl,
        }),
      });

      if (response.ok) {
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
      }
    } catch (error) {
      console.error("Failed to update person:", error);
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

  if (!edition) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Gift className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-6 text-4xl font-bold text-gray-900">
            {edition.name}
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            {edition.status === "COMPLETED"
              ? "Secret Santa assignments have been sent!"
              : "Click on your name to add your details"}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Participants</h2>
            <div className="space-y-2">
              {edition.people.map((person: Person) => (
                <Button
                  key={person.id}
                  variant={
                    person.email && person.giftIdeas ? "default" : "outline"
                  }
                  className="w-full justify-between"
                  onClick={() => handlePersonSelect(person)}
                  disabled={edition.status === "COMPLETED"}
                >
                  <span>{person.name}</span>
                  {person.email && person.giftIdeas && (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>

            {edition.status === "PENDING" && (
              <Button
                className="w-full mt-6"
                onClick={handleDraw}
                disabled={!isReadyToDraw}
              >
                Send Secret Santa Assignments
              </Button>
            )}
          </Card>

          {selectedPerson && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Your Details</h2>
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
                    placeholder="your@email.com"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <Gift className="inline-block w-4 h-4 mr-2" />
                    Gift Ideas
                  </label>
                  <Textarea
                    value={giftIdeas}
                    onChange={(e) => setGiftIdeas(e.target.value)}
                    placeholder="Share your gift ideas..."
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    <ImageIcon className="inline-block w-4 h-4 mr-2" />
                    Image URL (optional)
                  </label>
                  <Input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="mt-1"
                  />
                </div>

                <Button onClick={handleSubmit} className="w-full">
                  Save Details
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
