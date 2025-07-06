
"use client";

import AdvertisementForm from '@/components/admin/AdvertisementForm';
import type { Advertisement } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui/spinner';

interface PageParams {
  id: string;
}

interface EditAdvertisementPageProps {
  params: Promise<PageParams>;
}

export default function EditAdvertisementPage({ params: paramsPromise }: EditAdvertisementPageProps) {
  const params = use(paramsPromise);
  const { id } = params;

  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [advertisement, setAdvertisement] = useState<Advertisement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push(`/auth/login?redirect=/admin/advertisements/${id}/edit`);
      return;
    }

    const fetchAdvertisement = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('advertisements')
          .select('*') // Select all fields including media_url and media_type
          .eq('id', id)
          .single();

        if (supabaseError) throw supabaseError;
        
        if (data) {
          // Ensure media_type is correctly cast if it's not strictly 'image' | 'video' from DB
          const fetchedAd = data as any;
          const validMediaType = (fetchedAd.media_type === 'image' || fetchedAd.media_type === 'video') ? fetchedAd.media_type : 'image'; // Default to image if invalid
          
          setAdvertisement({
            ...fetchedAd,
            media_type: validMediaType,
          } as Advertisement);

        } else {
          setError("Advertisement not found in database.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch advertisement details.");
        console.error("Error fetching advertisement:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && currentUser?.role === 'admin') {
      fetchAdvertisement();
    } else if (!id) {
      setError("Advertisement ID is missing.");
      setIsLoading(false);
    }
  }, [currentUser, loadingUser, router, id]);

  if (!isClient || loadingUser || (!currentUser && !loadingUser && !error)) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading or redirecting...</p>
        </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin') {
     return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-muted-foreground">Loading advertisement details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
         <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Error Loading Advertisement</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
         <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/advertisements"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Advertisement List</Link>
        </Button>
      </div>
    );
  }
  
  if (!advertisement && !isLoading) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Advertisement not found</h1>
        <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/advertisements"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Advertisement List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/advertisements"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Advertisement List</Link>
        </Button>
        <AdvertisementForm advertisement={advertisement!} />
    </div>
  );
}
