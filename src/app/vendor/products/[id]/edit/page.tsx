
"use client";

import ProductForm from '@/components/admin/ProductForm';
import type { Product } from '@/lib/types';
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

interface EditProductPageProps {
  params: Promise<PageParams>;
}

export default function VendorEditProductPage({ params: paramsPromise }: EditProductPageProps) {
  const params = use(paramsPromise); 
  const { id } = params;

  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Role checks are handled by VendorLayout.
    
    const fetchProduct = async () => {
      if (!currentUser) return;

      setIsLoading(true);
      setError(null);
      try {
        // RLS will ensure the vendor can only fetch their own product.
        const { data, error: supabaseError } = await supabase
          .from('products')
          .select(`
            id,
            name,
            description,
            price,
            images,
            stock,
            categoryId: category_id,
            vendor_id
          `)
          .eq('id', id)
          .single();

        if (supabaseError) throw supabaseError;
        
        if (data) {
          setProduct(data as Product);
        } else {
          setError("Product not found or you don't have permission to edit it.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch product details.");
        console.error("Error fetching product:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && currentUser) {
      fetchProduct();
    }
  }, [currentUser, id]);

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
        <h1 className="text-2xl font-semibold">Error Loading Product</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
         <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/vendor/products"><ChevronLeft className="mr-2 h-4 w-4" /> Back to My Products</Link>
        </Button>
      </div>
    );
  }
  
  if (!product) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Product not found</h1>
         <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/vendor/products"><ChevronLeft className="mr-2 h-4 w-4" /> Back to My Products</Link>
        </Button>
      </div>
    );
  }


  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/vendor/products"><ChevronLeft className="mr-2 h-4 w-4" /> Back to My Products</Link>
        </Button>
        <ProductForm product={product} />
    </div>
  );
}
