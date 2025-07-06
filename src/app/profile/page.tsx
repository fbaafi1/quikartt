
"use client";

import ProfileForm from '@/components/profile/ProfileForm';
import AddressForm from '@/components/profile/AddressForm';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCircle, MapPin } from 'lucide-react'; // Added Spinner
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Spinner } from '@/components/ui/spinner';

export default function ProfilePage() {
  const { currentUser, loadingUser } = useUser(); // Added loadingUser
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Wait for user loading to complete before checking currentUser
    if (!loadingUser && !currentUser) {
      router.push('/auth/login?redirect=/profile');
    }
  }, [currentUser, loadingUser, router]);
  
  const getInitials = (name?: string) => {
    if (!name) return 'QK';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };


  if (!isClient || loadingUser || !currentUser) { // Updated loading condition
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 p-6 bg-card rounded-lg shadow-md">
        <Avatar className="h-24 w-24 text-4xl border-2 border-primary">
           <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(currentUser.name)}`} alt={currentUser.name || "User"} data-ai-hint="avatar profile"/>
           <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
        </Avatar>
        <div className="text-center sm:text-left">
            <h1 className="text-3xl font-bold">{currentUser.name || 'QuiKart User'}</h1>
            <p className="text-muted-foreground">{currentUser.email}</p>
            {currentUser.phone && <p className="text-muted-foreground">Phone: {currentUser.phone}</p>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-8">
        <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><UserCircle/> Profile Information</h2>
            <ProfileForm />
        </div>
        <div>
            <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2"><MapPin/> Delivery Address</h2>
            <AddressForm />
        </div>
      </div>
    </div>
  );
}
