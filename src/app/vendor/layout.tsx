
"use client";

import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function VendorLayout({ children }: { children: ReactNode }) {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // This effect handles the redirection safely after the component has rendered.
  useEffect(() => {
    // Only redirect if we're on the client, user loading is finished, and there's no user.
    if (isClient && !loadingUser && !currentUser) {
      const currentPath = window.location.pathname;
      router.push(`/auth/login?redirect=${currentPath}`);
    }
  }, [isClient, loadingUser, currentUser, router]);

  // Show a loading state while we wait for user info or client-side hydration
  if (!isClient || loadingUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Verifying access...</p>
      </div>
    );
  }
  
  // If there's no user after loading, show a redirecting message while the useEffect does its job.
  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // If the user is not a vendor, block access.
  if (currentUser.role !== 'vendor') {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You must be a vendor to access this page.</p>
      </div>
    );
  }

  // If all checks pass, render the protected vendor content.
  return <div className="space-y-8">{children}</div>;
}
