'use client';

import { useEffect, useState } from 'react';
import {ThingiverseThing, useThingiverseAuth} from '../../contexts/ThingiverseAuthContext';
import { Button } from '../../components/ui/button';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';

export default function ThingiverseProfilePage() {
  const { isAuthenticated, user, accessToken } = useThingiverseAuth();
  const [things, setThings] = useState<ThingiverseThing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchThings = async () => {
      if (!isAuthenticated || !accessToken || !user?.name) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/thingiverse/things?name=${user.name}`, {
          headers: {
            'x-thingiverse-token': accessToken
          }
        });

        if (response.ok) {
          const data = await response.json();
          setThings(data);
        }
      } catch (error) {
        console.error('Failed to fetch things:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThings();
  }, [isAuthenticated, accessToken, user?.name]);

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Not Connected to Thingiverse</h1>
        <Link href="/dashboard">
          <Button>Return to Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <Link href="/dashboard">
        <Button variant="outline" className="mb-6">← Back to Dashboard</Button>
      </Link>

      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user?.thumbnail} alt={user?.name} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{user?.first_name} {user?.last_name}</CardTitle>
              <p className="text-gray-600">@{user?.name}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mt-4">
            <a href={`https://www.thingiverse.com/${user?.name}`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline">View on Thingiverse</Button>
            </a>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-bold mb-4">My Things</h2>
      {loading ? (
        <div>Loading your designs...</div>
      ) : things.length === 0 ? (
        <div>No designs found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {things.map((thing) => (
            <Card key={thing.id}>
              <CardHeader>
                <CardTitle className="text-lg">{thing.name}</CardTitle>
              </CardHeader>
              <CardContent>
                {thing.thumbnail && (
                  <img src={thing.thumbnail} alt={thing.name} className="mb-4 rounded-md" />
                )}
                <p className="text-sm text-gray-600 mb-2 truncate">{thing.description}</p>
                <a href={thing.public_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="link" className="p-0">View on Thingiverse</Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}