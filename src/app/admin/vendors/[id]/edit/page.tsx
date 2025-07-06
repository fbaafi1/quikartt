"use client";

import VendorForm from '@/components/admin/VendorForm';
import type { Vendor } from '@/lib/types';
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

interface EditVendorPageProps {
  params: Promise<PageParams>;
}

export default function EditVendorPage({ params: paramsPromise }: EditVendorPageProps) {
  const params = use(paramsPromise);
  const { id } = params;

  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push(`/auth/login?redirect=/admin/vendors/${id}/edit`);
      return;
    }

    const fetchVendor = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Step 1: Fetch the vendor profile from the 'vendors' table.
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', id)
          .single();
        
        if (vendorError) {
          // If the error is that no row was found, we can give a user-friendly message.
          if (vendorError.code === 'PGRST116') {
             setError("Vendor not found.");
             setIsLoading(false);
             return;
          }
          throw vendorError; // Re-throw other errors.
        }

        if (!vendorData) {
          setError("Vendor not found.");
          setIsLoading(false);
          return;
        }

        // Step 2: Fetch the associated user's profile from 'user_profiles' table.
        const { data: userData, error: userError } = await supabase
          .from('user_profiles')
          .select('email, name')
          .eq('id', vendorData.user_id)
          .single();

        // If user profile isn't found, it's not a fatal error for the page.
        // We can still show the vendor details. We'll just log a warning.
        if (userError && userError.code !== 'PGRST116') {
          console.warn(`Could not fetch user profile for vendor ${id}: ${userError.message}`);
        }
        
        // Step 3: Combine the data to match the 'Vendor' type.
        const combinedVendorData: Vendor = {
          ...vendorData,
          user: userData || null, // Assign the fetched user data, or null if not found.
        };

        setVendor(combinedVendorData);

      } catch (err: any) {
        setError(err.message || "Failed to fetch vendor details.");
        console.error("Error fetching vendor details:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && currentUser?.role === 'admin') {
      fetchVendor();
    }
  }, [currentUser, loadingUser, router, id]);

  if (!isClient || loadingUser || isLoading) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
        </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
         <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Error Loading Vendor</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
         <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/vendors"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Vendor List</Link>
        </Button>
      </div>
    );
  }
  
  if (!vendor) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Vendor not found</h1>
        <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/vendors"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Vendor List</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/vendors"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Vendor List</Link>
        </Button>
        <VendorForm vendor={vendor} />
    </div>
  );
}
