"use client";

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Gift } from "lucide-react";
import { useRouter } from 'next/navigation';

export default function Home() {
  const [editionName, setEditionName] = useState('');
  const [participants, setParticipants] = useState(['']);
  const router = useRouter();

  const addParticipant = () => {
    setParticipants([...participants, '']);
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
    const validParticipants = participants.filter(name => name.trim() !== '');
    if (validParticipants.length < 3) {
      alert('Please add at least 3 participants');
      return;
    }

    try {
      const response = await fetch('/api/editions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editionName,
          people: validParticipants,
        }),
      });

      const data = await response.json();
      router.push(`/edition/${data.id}`);
    } catch (error) {
      console.error('Failed to create edition:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Gift className="mx-auto h-16 w-16 text-primary" />
          <h1 className="mt-6 text-4xl font-bold text-gray-900">Secret Santa Organizer</h1>
          <p className="mt-2 text-lg text-gray-600">Create your Secret Santa event and invite participants</p>
        </div>

        <Card className="p-6 bg-white shadow-lg rounded-lg">
          <div className="space-y-6">
            <div>
              <label htmlFor="editionName" className="block text-sm font-medium text-gray-700">
                Event Name
              </label>
              <Input
                id="editionName"
                type="text"
                value={editionName}
                onChange={(e) => setEditionName(e.target.value)}
                placeholder="Christmas 2024"
                className="mt-1"
              />
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Participants
              </label>
              {participants.map((participant, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={participant}
                    onChange={(e) => updateParticipant(index, e.target.value)}
                    placeholder="Participant name"
                  />
                  {participants.length > 1 && (
                    <Button
                      variant="destructive"
                      onClick={() => removeParticipant(index)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
              <Button
                variant="outline"
                onClick={addParticipant}
                className="w-full"
              >
                Add Participant
              </Button>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full"
              disabled={!editionName || participants.filter(p => p.trim()).length < 3}
            >
              Create Secret Santa Event
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}