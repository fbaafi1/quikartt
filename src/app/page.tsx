
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import ProductCard from '@/components/products/ProductCard';
import CategoryFilter from '@/components/products/CategoryFilter';
import type { Product, Category, Advertisement } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, AlertTriangle, Image as ImageIconLucide, Video, Package as PackageIcon, Tag as TagIcon, Rocket, Filter, Store } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import NextImage from 'next/image';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useRouter } from 'next/navigation';

const DEBOUNCE_DELAY = 300; // ms

interface Suggestion {
  id: string;
  type: 'product' | 'category' | 'vendor';
  name: string;
  image?: string; // For product suggestions
  categoryName?: string; // For product suggestions
  aiHint?: string;
}

const shuffleArray = <T extends any[]>(array: T): T => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray as T;
};

// Helper to get image src and ai-hint from product.images[0]
const getProductImageAttributes = (imageString: string | undefined, productName: string) => {
  if (imageString) {
    const parts = imageString.split('" data-ai-hint="');
    const src = parts[0];
    const hint = parts[1]?.replace('"', '').trim() || productName.split(' ').slice(0,2).join(' ').toLowerCase();
    return { src, hint };
  }
  return { src: `https://placehold.co/40x40.png?text=${encodeURIComponent(productName.slice(0,1))}`, hint: productName.split(' ').slice(0,2).join(' ').toLowerCase() };
};


export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [allDbVisibleCategories, setAllDbVisibleCategories] = useState<Category[]>([]);
  const [displayedTopLevelCategories, setDisplayedTopLevelCategories] = useState<Category[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [minPriceInput, setMinPriceInput] = useState('');
  const [maxPriceInput, setMaxPriceInput] = useState('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, Infinity]);
  const [selectedRating, setSelectedRating] = useState<number>(0);

  // Search and navigation
  const router = useRouter();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // State for advertisement carousel
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const errorMessages: string[] = [];

      try {
        // Fetch Categories
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('*')
          .eq('is_visible', true)
          .order('name', { ascending: true });

        if (categoriesError) {
          errorMessages.push(`Error fetching categories: ${categoriesError.message}`);
        } else {
          const fetchedAllVisibleDbCategories = categoriesData || [];
          setAllDbVisibleCategories(fetchedAllVisibleDbCategories);
          // Only show top-level categories in the filter bar
          setDisplayedTopLevelCategories(
            shuffleArray(fetchedAllVisibleDbCategories.filter(c => !c.parent_id)).slice(0, 5)
          );
        }

        // Fetch Products with Vendor info
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('id, name, description, price, images, categoryId: category_id, stock, average_rating, review_count, vendor_id, is_boosted, boosted_until, vendors (id, store_name)');
        
        if (productsError) {
          errorMessages.push(`Error fetching products: ${productsError.message}`);
        } else {
          const fetchedProducts: Product[] = productsData?.map(p => ({
              id: p.id,
              name: p.name,
              description: p.description,
              price: p.price,
              images: p.images || [],
              categoryId: p.categoryId,
              stock: p.stock,
              average_rating: p.average_rating,
              review_count: p.review_count,
              vendor_id: p.vendor_id,
              is_boosted: p.is_boosted,
              boosted_until: p.boosted_until,
              vendors: p.vendors,
          })) || [];
          setProducts(fetchedProducts);
        }

        // Fetch Active Advertisements
        const { data: adsData, error: adsError } = await supabase
          .from('advertisements')
          .select('id, title, media_url, media_type, link_url')
          .eq('is_active', true)
          .limit(5); // Fetch a few ads for the carousel
        
        if (adsError) {
            if (adsError.code === '42P01') {
                console.warn("Advertisements table not found or RLS prevents access. This is fine if not using ads.");
            } else {
                errorMessages.push(`Error fetching advertisements: ${adsError.message}`);
            }
        } else {
          setAdvertisements(adsData || []);
        }

      } catch (err: any) {
        console.error("Generic error in fetchData:", err);
        errorMessages.push(err.message || 'An unknown error occurred during data fetching.');
      } finally {
        if (errorMessages.length > 0) {
          setError(errorMessages.join('\n---\n'));
        }
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);
  
  // useEffect for the ad carousel
  useEffect(() => {
    if (advertisements.length <= 1) return;

    const intervalId = setInterval(() => {
      setCurrentAdIndex(prevIndex => (prevIndex + 1) % advertisements.length);
    }, 6000); // 6 seconds

    return () => clearInterval(intervalId); // Cleanup on unmount
  }, [advertisements.length]);


  // Debounced effect for updating suggestions
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(async () => {
      const termLower = searchTerm.toLowerCase();

      // Product Suggestions - limited to 3
      const productSuggestions: Suggestion[] = products
        .filter(p => p.name.toLowerCase().includes(termLower) && (p.categoryId ? allDbVisibleCategories.some(c => c.id === p.categoryId) : true))
        .slice(0, 3) // Limit to 3 product suggestions
        .map(p => {
          const { src, hint } = getProductImageAttributes(p.images?.[0], p.name);
          return {
            id: p.id,
            type: 'product',
            name: p.name,
            image: src,
            aiHint: hint,
            categoryName: allDbVisibleCategories.find(c => c.id === p.categoryId)?.name || 'N/A'
          };
        });
      
      // Vendor Suggestions - limited to 2
      const { data: vendorSugs, error: vendorError } = await supabase
        .from('vendors')
        .select('id, store_name')
        .ilike('store_name', `%${termLower}%`)
        .limit(2); // Limit to 2 vendor suggestions

      if (vendorError) {
        console.warn("Could not search for vendors:", vendorError.message);
      }
      
      const vendorSuggestions: Suggestion[] = (vendorSugs || []).map(v => ({
          id: v.id,
          type: 'vendor' as const,
          name: v.store_name,
      }));

      // Category Suggestions - limited to 2
      const categorySuggestions: Suggestion[] = allDbVisibleCategories
        .filter(c => c.name.toLowerCase().includes(termLower))
        .slice(0, 2) // Limit to 2 category suggestions
        .map(c => ({ id: c.id, type: 'category', name: c.name }));
      
      // The total is now naturally limited to a max of 7 (3+2+2)
      const combinedSuggestions = [...productSuggestions, ...vendorSuggestions, ...categorySuggestions];
      setSuggestions(combinedSuggestions);
      setShowSuggestions(combinedSuggestions.length > 0);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [searchTerm, products, allDbVisibleCategories]);

  // Effect for handling clicks outside the search suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const applyPriceFilter = useCallback(() => {
    const parsedMin = parseFloat(minPriceInput);
    const parsedMax = parseFloat(maxPriceInput);
    const newMin = (isNaN(parsedMin) || parsedMin < 0) ? 0 : parsedMin;
    const newMax = (isNaN(parsedMax) || parsedMax < 0) ? Infinity : parsedMax; 
    setPriceRange([newMin, newMax]);
  }, [minPriceInput, maxPriceInput]);

  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setMinPriceInput('');
    setMaxPriceInput('');
    setPriceRange([0, Infinity]);
    setSelectedRating(0);
    setShowSuggestions(false);
  }, []);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setShowSuggestions(false);
    if (suggestion.type === 'product') {
      router.push(`/products/${suggestion.id}`);
    } else if (suggestion.type === 'category') {
      // Navigate to category page for direct clicks on category suggestions
      router.push(`/products/category/${suggestion.id}`);
    } else if (suggestion.type === 'vendor') {
      router.push(`/vendors/${suggestion.id}`);
    }
  };

  const isProductBoosted = (p: Product) => p.is_boosted && p.boosted_until && new Date(p.boosted_until) > new Date();
  
  const boostedProducts = useMemo(() => {
    return products.filter(isProductBoosted);
  }, [products]);

  const filteredProducts = useMemo(() => {
    const boostedProductIds = new Set(boostedProducts.map(p => p.id));

    let processedProducts = products
      .filter(product => {
        // Exclude products that are already in the boosted section
        if (boostedProductIds.has(product.id)) {
            return false;
        }

        // Filter by category visibility
        if (product.categoryId && !allDbVisibleCategories.some(cat => cat.id === product.categoryId && cat.is_visible)) {
          return false;
        }

        const [minP, maxP] = priceRange;
        if (product.price < minP || product.price > maxP) return false;
        if (selectedRating > 0 && (!product.average_rating || product.average_rating < selectedRating)) return false;
        
        if (searchTerm.trim() === '') return true;
        const searchTermLower = searchTerm.toLowerCase();
        const nameMatch = product.name.toLowerCase().includes(searchTermLower);
        
        const categoryOfProduct = product.categoryId ? allDbVisibleCategories.find(cat => cat.id === product.categoryId) : null;
        const categoryName = categoryOfProduct ? categoryOfProduct.name : '';
        const categoryNameMatch = categoryName ? categoryName.toLowerCase().includes(searchTermLower) : false;
        
        const vendorName = product.vendors?.store_name || '';
        const vendorNameMatch = vendorName.toLowerCase().includes(searchTermLower);
        
        return nameMatch || categoryNameMatch || vendorNameMatch;
      });

    return shuffleArray(processedProducts);
  }, [products, allDbVisibleCategories, searchTerm, priceRange, selectedRating, boostedProducts]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse h-10 w-full bg-muted rounded-md mb-4"></div>
        <div className="animate-pulse h-24 w-full bg-muted rounded-md mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-card p-4 rounded-lg shadow-md space-y-3">
              <div className="aspect-[4/3] bg-muted rounded-md"></div>
              <div className="h-6 w-3/4 bg-muted rounded-md"></div>
              <div className="h-4 w-1/2 bg-muted rounded-md"></div>
              <div className="h-4 w-1/4 bg-muted rounded-md mt-1"></div>
              <div className="h-8 w-full bg-muted rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center py-8 bg-accent/30 rounded-lg shadow">
        <h1 className="text-3xl sm:text-4xl font-bold text-primary">Welcome to QuiKart!</h1>
        <p className="text-base sm:text-lg text-foreground mt-2">Discover amazing products at unbeatable prices.</p>
      </div>
      
      {/* Search and Filters moved to the top */}
      <section className="p-4 bg-card rounded-lg shadow-md border max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row gap-4 items-start">
            <div ref={searchContainerRef} className="relative flex-grow w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                type="text"
                placeholder="Search products, categories, or stores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.trim() && suggestions.length > 0 && setShowSuggestions(true)}
                className="pl-10 w-full border-primary focus-visible:ring-primary/50"
                />
                {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
                    <ul>
                    {suggestions.map((suggestion) => (
                        <li
                        key={`${suggestion.type}-${suggestion.id}`}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        >
                        {suggestion.type === 'product' && suggestion.image && (
                            <div className="relative w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
                            <NextImage 
                                src={suggestion.image} 
                                alt={suggestion.name} 
                                fill 
                                sizes="40px" 
                                className="object-cover"
                                data-ai-hint={suggestion.aiHint || 'product suggestion'}
                            />
                            </div>
                        )}
                        {suggestion.type === 'category' && (
                            <TagIcon className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        {suggestion.type === 'vendor' && (
                            <Store className="h-5 w-5 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium truncate">{suggestion.name}</p>
                            {suggestion.type === 'product' && suggestion.categoryName && (
                            <p className="text-xs text-muted-foreground truncate">in {suggestion.categoryName}</p>
                            )}
                            {suggestion.type === 'vendor' && (
                                <p className="text-xs text-muted-foreground truncate">Store</p>
                            )}
                        </div>
                        {suggestion.type === 'product' && <PackageIcon className="h-4 w-4 text-muted-foreground/70 ml-auto shrink-0" />}
                        {suggestion.type === 'vendor' && <Store className="h-4 w-4 text-muted-foreground/70 ml-auto shrink-0" />}
                        </li>
                    ))}
                    </ul>
                </div>
                )}
                {showSuggestions && searchTerm.trim() !== '' && suggestions.length === 0 && (
                <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg z-20 p-3 text-center text-sm text-muted-foreground">
                    No suggestions found for "{searchTerm}".
                </div>
                )}
            </div>

            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="outline" className="w-full md:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                </SheetTrigger>
                <SheetContent 
                    side="left" 
                    className="w-[85vw] max-w-sm sm:w-[350px] bg-background"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <SheetHeader>
                        <SheetTitle>Filter Products</SheetTitle>
                        <SheetDescription>
                            Refine your search to find exactly what you need.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-6">
                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Browse Categories</h3>
                            <CategoryFilter
                                categories={displayedTopLevelCategories} 
                                onClearFilters={clearAllFilters}
                            />
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Price Range (GH₵)</h3>
                            <div className="grid grid-cols-2 gap-4 items-center">
                                <div className="space-y-1">
                                    <Label htmlFor="minPrice" className="text-xs text-muted-foreground">Min Price</Label>
                                    <Input
                                    id="minPrice"
                                    type="number"
                                    value={minPriceInput}
                                    onChange={(e) => setMinPriceInput(e.target.value)}
                                    placeholder="e.g., 50"
                                    min="0"
                                    className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="maxPrice" className="text-xs text-muted-foreground">Max Price</Label>
                                    <Input
                                    id="maxPrice"
                                    type="number"
                                    value={maxPriceInput}
                                    onChange={(e) => setMaxPriceInput(e.target.value)}
                                    placeholder="e.g., 500"
                                    min="0"
                                    className="h-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <Separator />

                        <div className="space-y-3">
                            <h3 className="text-sm font-semibold text-foreground">Minimum Rating</h3>
                            <Select
                                value={selectedRating.toString()}
                                onValueChange={(value) => setSelectedRating(Number(value))}
                            >
                                <SelectTrigger id="ratingFilter" className="text-sm">
                                <SelectValue placeholder="Any Rating" />
                                </SelectTrigger>
                                <SelectContent>
                                <SelectItem value="0">Any Rating</SelectItem>
                                <SelectItem value="5">5 Stars Only</SelectItem>
                                <SelectItem value="4">4 Stars & Up</SelectItem>
                                <SelectItem value="3">3 Stars & Up</SelectItem>
                                <SelectItem value="2">2 Stars & Up</SelectItem>
                                <SelectItem value="1">1 Star & Up</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <Separator />
                        <div className='flex flex-col gap-2'>
                           <Button onClick={applyPriceFilter}>Apply Filters</Button>
                           <Button onClick={clearAllFilters} variant="outline">Clear All Filters</Button>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </section>

      
      {advertisements.length > 0 && (
        <div className="my-8">
          <h2 className="text-2xl font-semibold mb-4 text-center md:text-left">Special Offers</h2>
          <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-lg shadow-lg bg-muted aspect-video">
            {advertisements.map((ad, index) => (
              <a
                key={ad.id}
                href={ad.link_url || '#'}
                target={ad.link_url ? "_blank" : "_self"}
                rel="noopener noreferrer"
                className="absolute inset-0 w-full h-full transition-transform duration-1000 ease-in-out"
                style={{
                  transform: `translateX(${(index - currentAdIndex) * 100}%)`,
                }}
              >
                <div className="relative w-full h-full">
                  {ad.media_type === 'image' && ad.media_url ? (
                    <NextImage
                      src={ad.media_url}
                      alt={ad.title}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      data-ai-hint="advertisement banner"
                      priority={index === 0}
                    />
                  ) : ad.media_type === 'video' && ad.media_url ? (
                    <video
                      src={ad.media_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <NextImage
                      src={`https://placehold.co/1280x720.png?text=${encodeURIComponent(ad.title)}`}
                      alt={ad.title}
                      fill
                      sizes="100vw"
                      className="object-cover"
                      data-ai-hint="advertisement placeholder"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex items-end p-6">
                    <div>
                      <h3 className="font-semibold text-white text-xl drop-shadow-md">{ad.title}</h3>
                    </div>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold">Could not load all page data</h2>
          <pre className="whitespace-pre-wrap text-left text-sm">{error}</pre>
          <p className="mt-2 text-sm">Please check your Supabase connection and tables (products, categories, advertisements, reviews) and their Row Level Security policies.</p>
        </div>
      )}
      
      {boostedProducts.length > 0 && (
        <div className="space-y-4 pt-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2"><Rocket className="text-primary"/> Featured Products</h2>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                {boostedProducts.map(product => <ProductCard key={product.id} product={product} />)}
            </div>
            <Separator className="pt-4"/>
        </div>
      )}

      {!error && filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
          {filteredProducts.map(product => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        !error && !isLoading && 
        <div className="text-center text-muted-foreground text-lg py-10 border-2 border-dashed border-border rounded-md">
            <ImageIconLucide className="mx-auto h-16 w-16 text-muted-foreground/70 mb-4" />
            <p className="font-semibold">No Products Found</p>
            <p className="text-sm">Try adjusting your search or filters, or check back later!</p>
             {(searchTerm || priceRange[0] !== 0 || priceRange[1] !== Infinity || selectedRating > 0) && (
                <Button onClick={clearAllFilters} variant="ghost" className="mt-4 text-primary hover:text-primary">
                    Clear all filters to see more products
                </Button>
            )}
        </div>
      )}
    </div>
  );
}
