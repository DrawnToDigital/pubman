"use client"

import { useState } from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useThingiverseAuth } from '../../contexts/ThingiverseAuthContext';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import Image from 'next/image';
import * as React from "react";

export function ThingiverseAuth() {
  const { isAuthenticated, user, login, logout, refreshToken } = useThingiverseAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      await login();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      await refreshToken();
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <Button
        onClick={handleLogin}
        disabled={isLoading}
        variant="outline"
        className="m-4 flex items-center gap-2 pl-0 relative"
      >
        <Image
          src="/thingiverse-logo.png"
          alt="Thingiverse"
          width={48}
          height={36}
          className="rounded-md"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
        {isLoading ? 'Connecting...' : 'Login with Thingiverse'}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="m-4 flex items-center gap-2 relative"
        style={{ paddingLeft: 0 }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center">
          <Image
            src="/thingiverse-logo.png"
            alt="Thingiverse"
            width={48}
            height={36}
            className="mr-2 rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <Avatar className="h-6 w-6 mr-2">
            <AvatarImage src={user.thumbnail} alt={user.name} />
            <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{user.name}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-500 transition-transform ml-2 ${isOpen ? 'rotate-180' : ''}`}
        />
      </Button>

      {isOpen && (
        <div className="absolute top-15 right-2 mt-1 w-56 bg-white border border-gray-200 rounded-md shadow-lg z-10 py-1">
          <Link
            href="/thingiverse/profile"
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            onClick={() => setIsOpen(false)}
          >
            View Thingiverse Profile
          </Link>
          <button
            onClick={handleRefresh}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Refresh Connection
          </button>
          <button
            onClick={logout}
            className="block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-gray-100 hover:text-red-700"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}