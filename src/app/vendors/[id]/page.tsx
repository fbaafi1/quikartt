
"use client";

import { useEffect, useState, use } from 'react';
import type { Product, Vendor } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, ChevronLeft, Store, Phone, Info, ShieldCheck } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import ProductCard from '@/components/products/ProductCard';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import ContactVendorButton from '@/components/vendors/ContactVendorButton';
import { Spinner } from '@/components/ui/spinner';

interface PageParams {
  id: string;
}

export default function VendorStorefrontPage({ params: paramsPromise }: { params: Promise<PageParams> }) {
  const resolvedParams = use(paramsPromise);
  const { id: vendorId } = resolvedParams;

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vendorId) {
      setError("Vendor ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchVendorData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // The RLS policy on the 'vendors' table automatically prevents fetching
        // of vendors with expired subscriptions for non-admin users.
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('*')
          .eq('id', vendorId)
          .single();

        if (vendorError && vendorError.code !== 'PGRST116') {
          throw new Error(`Vendor: ${vendorError.message}`);
        }

        if (!vendorData) {
            setError("This vendor could not be found or their storefront is currently inactive.");
            setIsLoading(false);
            return;
        }
        
        setVendor(vendorData as Vendor);

        // RLS on 'products' table will also filter out products based on vendor's subscription
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, categories(is_visible)')
          .eq('vendor_id', vendorId);

        if (productsError) throw new Error(`Products: ${productsError.message}`);

        // Additional client-side check to ensure products from hidden categories are not shown
        const visibleProducts = productsData?.filter(p => (p as any).categories?.is_visible !== false) || [];
        setProducts(visibleProducts as Product[]);

      } catch (err: any) {
        setError(err.message || "Failed to fetch vendor data.");
        console.error("Error fetching vendor data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendorData();
  }, [vendorId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-muted-foreground">Loading vendor storefront...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error loading page</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Vendor not found</h1>
        <p className="text-muted-foreground mt-2">The storefront you are looking for does not exist or is not verified.</p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Card className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 shadow-lg bg-accent/20 border-primary">
        <Avatar className="h-32 w-32 text-4xl border-4 border-primary shadow-md">
           <AvatarFallback className="bg-muted text-muted-foreground">{vendor.store_name.slice(0,2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="text-center md:text-left space-y-2">
            <div className="flex items-center gap-3 justify-center md:justify-start">
              <h1 className="text-4xl font-bold text-primary flex items-center gap-3">
                  <Store size={36}/> {vendor.store_name}
              </h1>
              {vendor.is_verified && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white">
                  <ShieldCheck className="mr-1 h-4 w-4"/> Verified
                </Badge>
              )}
            </div>
            {vendor.description && <p className="text-muted-foreground max-w-2xl"><Info size={16} className="inline mr-1" />{vendor.description}</p>}
            
            {vendor.contact_number && (
              <div className="pt-4 flex justify-center md:justify-start">
                <ContactVendorButton 
                  contactNumber={vendor.contact_number}
                  storeName={vendor.store_name}
                />
              </div>
            )}
        </div>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-6">Products from {vendor.store_name}</h2>
        {products.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-16 border-2 border-dashed rounded-lg">
            <p className="text-lg">This vendor has no products listed at the moment.</p>
            <p>Check back later!</p>
          </div>
        )}
      </div>
    </div>
  );
}
