
"use client";

import { useEffect, useState, use } from 'react';
import type { Product, Category } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import ProductCard from '@/components/products/ProductCard';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface PageParams {
  id: string;
}

export default function CategoryPage({ params: paramsPromise }: { params: Promise<PageParams> }) {
  const params = use(paramsPromise);
  const { id: categoryId } = params;

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!categoryId) {
      setError("Category ID is missing.");
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch category details
        const { data: categoryData, error: categoryError } = await supabase
          .from('categories')
          .select('*')
          .eq('id', categoryId)
          .single();
        
        if (categoryError && categoryError.code !== 'PGRST116') { // PGRST116 is 'No rows found'
            throw new Error(`Category: ${categoryError.message}`);
        }
        if (!categoryData) {
            setError('Category not found.');
            setIsLoading(false);
            return;
        }
        setCategory(categoryData);

        let categoryIdsToFetch: string[] = [];

        // Check if the fetched category is a main category (no parent)
        if (categoryData.parent_id === null) {
            // It's a main category, so fetch its subcategories
            const { data: subcategories, error: subError } = await supabase
              .from('categories')
              .select('id')
              .eq('parent_id', categoryId);

            if (subError) throw new Error(`Subcategories: ${subError.message}`);
            
            // The list of IDs includes the main category and all its children
            categoryIdsToFetch = [categoryId, ...(subcategories?.map(sc => sc.id) || [])];
        } else {
            // It's a subcategory, so only fetch products for this specific category
            categoryIdsToFetch = [categoryId];
        }

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, vendors(id, store_name)')
          .in('category_id', categoryIdsToFetch);

        if (productsError) throw new Error(`Products: ${productsError.message}`);

        const fetchedProducts: Product[] = productsData?.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            images: p.images || [],
            categoryId: p.category_id,
            stock: p.stock,
            average_rating: p.average_rating,
            review_count: p.review_count,
            vendor_id: p.vendor_id,
            is_boosted: p.is_boosted,
            boosted_until: p.boosted_until,
            vendors: p.vendors,
        })) || [];

        setProducts(fetchedProducts);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [categoryId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error Loading Page</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to All Products</Link>
        </Button>
        <h1 className="text-3xl font-bold">
          {category?.name || 'Category'}
        </h1>
      </div>

      {products.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
          {products.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <p className="text-lg font-semibold">No products found in this category.</p>
          <p className="text-muted-foreground">Check back later or explore other categories.</p>
        </div>
      )}
    </div>
  );
}
