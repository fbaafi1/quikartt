
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';

// This page just redirects to the vendor dashboard.
export default function VendorRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/vendor/dashboard');
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Redirecting to your dashboard...</p>
    </div>
  );
}
