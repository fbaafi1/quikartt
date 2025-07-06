"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Product, Category, BoostPlan } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import {
  PlusCircle, Edit, Trash2, Package, Search, ImageIcon, AlertTriangle,
  ChevronLeft, ChevronRight, Rocket, Sparkles, X
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui/spinner';
import BoostCountdownBadge from '@/components/vendors/BoostCountdownBadge';

const LOW_STOCK_THRESHOLD = 5;
const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;
const MAX_SUGGESTIONS = 5;

interface Suggestion {
  id: string;
  name: string;
}

const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, productName: string = "Product") => {
  let src: string = `https://placehold.co/100x75.png?text=${encodeURIComponent(productName.split(' ').slice(0,1).join('') || 'Item')}`;
  let hint: string = productName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/') || potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc;
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = productName.split(' ').slice(0, 2).join(' ') || 'Product';
      src = `https://placehold.co/100x75.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || productName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};


export default function VendorProductsPage() {
  const { currentUser, loadingUser } = useUser();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [boostPlans, setBoostPlans] = useState<BoostPlan[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalProducts, setTotalProducts] = useState(0);
  const [refetchIndex, setRefetchIndex] = useState(0);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const [boostRequestCandidate, setBoostRequestCandidate] = useState<Product | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<BoostPlan | null>(null);
  const [isSubmittingBoost, setIsSubmittingBoost] = useState(false);


  // Effect for suggestion fetching
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(async () => {
      if(!currentUser) return;
      
      const { data: vendorData } = await supabase.from('vendors').select('id').eq('user_id', currentUser.id).single();
      if(!vendorData) return;

      const { data: productSugs } = await supabase
        .from('products')
        .select('id, name')
        .eq('vendor_id', vendorData.id)
        .ilike('name', `%${searchTerm}%`)
        .limit(MAX_SUGGESTIONS);
      
      setSuggestions(productSugs || []);
      setShowSuggestions((productSugs || []).length > 0);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [searchTerm, currentUser]);

  // Effect for hiding suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setSearchTerm(suggestion.name);
    setDebouncedSearchTerm(suggestion.name);
    setShowSuggestions(false);
  };
  
  const handleSearchCommit = () => {
    setDebouncedSearchTerm(searchTerm);
    setShowSuggestions(false);
  };

  // Effect to reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  // Effect to fetch static dependencies (categories & boost plans)
  useEffect(() => {
    const fetchDependencies = async () => {
        try {
            const { data: catData, error: catError } = await supabase.from('categories').select('id, name');
            if (catError) console.error("Could not fetch categories", catError.message);
            else setAllCategories(catData || []);

            const { data: plansData, error: plansError } = await supabase.from('boost_plans').select('*').eq('is_active', true).order('price');
            if(plansError) console.error("Could not fetch boost plans", plansError.message);
            else setBoostPlans(plansData || []);

        } catch (err: any) {
            setError(err.message);
        }
    };
    fetchDependencies();
  }, []);

  // Main data fetching effect for products
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      setError(null);

      try {
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', currentUser.id)
          .single();
        
        if (vendorError || !vendorData) {
          throw new Error("Could not find a vendor profile for your user account. Please contact support.");
        }
        const vendorId = vendorData.id;

        let productQuery = supabase
          .from('products')
          .select('*, categories(name)', { count: 'exact' })
          .eq('vendor_id', vendorId);

        if (debouncedSearchTerm) {
          productQuery = productQuery.ilike('name', `%${debouncedSearchTerm}%`);
        }

        const { count, error: countError } = await productQuery;
        if (countError) throw new Error(`Products count: ${countError.message}`);
        setTotalProducts(count || 0);

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        productQuery = productQuery.range(from, to).order('created_at', { ascending: false });
        
        const { data: productsData, error: productsError } = await productQuery;
        if (productsError) throw new Error(`Products data: ${productsError.message}`);

        const fetchedProducts: Product[] = productsData?.map((p: any) => ({
          ...p,
          categoryId: p.category_id,
          categoryName: p.categories?.name || 'N/A',
        })) || [];
        
        setProducts(fetchedProducts);

      } catch (err: any) {
        setError(err.message);
        console.error("Error in fetchData:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if(currentUser && !loadingUser) {
        fetchData();
    }
  }, [currentUser, loadingUser, debouncedSearchTerm, currentPage, refetchIndex]);

  
  const getCategoryNameDisplay = useCallback((product: Product): string => {
    if ((product as any).categories?.name) return (product as any).categories.name;
    const category = allCategories.find(c => c.id === product.categoryId);
    return category ? category.name : 'N/A';
  }, [allCategories]);

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setRefetchIndex(prev => prev + 1);
    } catch (error: any) {
       if (error.code === '23503') { // Foreign key violation
         console.error("Deletion Failed", "This product cannot be deleted because it is part of one or more existing orders. Consider setting its stock to 0 instead.");
       } else {
         console.error("Error Deleting Product", error.message);
       }
    }
  };
  
  const handleRequestBoost = async () => {
    if (!boostRequestCandidate || !selectedPlan || !currentUser) return;

    setIsSubmittingBoost(true);
    try {
        const { data: vendorData } = await supabase.from('vendors').select('id').eq('user_id', currentUser.id).single();
        if(!vendorData) throw new Error("Could not find vendor profile.");

        // Insert into boost_requests
        const { error: insertError } = await supabase
            .from('boost_requests')
            .insert({
                product_id: boostRequestCandidate.id,
                vendor_id: vendorData.id,
                user_id: currentUser.id,
                plan_duration_days: selectedPlan.duration_days,
                plan_price: selectedPlan.price,
                request_status: 'pending',
            });
        if(insertError) throw insertError;

        // Update product status
        const { error: updateError } = await supabase
            .from('products')
            .update({ boost_status: 'requested' })
            .eq('id', boostRequestCandidate.id);
        if(updateError) throw updateError;
        
        setRefetchIndex(p => p + 1);
        setBoostRequestCandidate(null);
        setSelectedPlan(null);

    } catch (err: any) {
        console.error("Failed to submit boost request:", err.message);
    } finally {
        setIsSubmittingBoost(false);
    }
  };


  const totalPages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

  const renderStockBadge = (stock: number) => {
    const isLowStock = stock <= LOW_STOCK_THRESHOLD;
    const isOutOfStock = stock === 0;
    let variant: "destructive" | "secondary" | "default" = "secondary";
    if (isOutOfStock) variant = "destructive";
    else if (isLowStock) variant = "default";

    return (
      <Badge variant={variant} className="flex items-center gap-1 w-fit">
        {(isLowStock || isOutOfStock) && <AlertTriangle className="h-3 w-3" />}
        Stock: {stock}
      </Badge>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your products...</p>
      </div>
    );
  }

  if (error) {
    return (
        <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold">Could not load your products</h2>
          <p>{error}</p>
           <Button onClick={() => setRefetchIndex(prev => prev + 1)} className="mt-4">Try Again</Button>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Package size={30}/> My Products</h1>
        <Button asChild>
          <Link href="/vendor/products/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>My Product List</CardTitle>
          <CardDescription>View, edit, or delete your products. You can also boost a product to feature it across the site.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div ref={searchContainerRef} className="relative flex-grow">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by product name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => searchTerm.trim() && suggestions.length > 0 && setShowSuggestions(true)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchCommit()}
                    className="pl-10 w-full"
                  />
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-md shadow-lg z-20 max-h-80 overflow-y-auto">
                      <ul>
                        {suggestions.map((suggestion) => (
                          <li
                            key={suggestion.id}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                          >
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium truncate">{suggestion.name}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {products.length > 0 ? (
                products.map(product => {
                  const { src: productImageUrl, hint: productImageHint } = getImageAttributes(product.images?.[0], product.name);
                  const isBoosted = product.is_boosted && product.boosted_until && new Date(product.boosted_until) > new Date();

                  return (
                    <Card key={product.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            {productImageUrl ? (
                              <Image src={productImageUrl} alt={product.name} fill sizes="96px" className="object-cover" data-ai-hint={productImageHint} />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-grow space-y-1 min-w-0">
                            <h3 className="font-semibold text-base truncate" title={product.name}>{product.name}</h3>
                            <p className="text-sm text-muted-foreground">{getCategoryNameDisplay(product)}</p>
                            <p className="text-base font-medium">GH₵{product.price.toFixed(2)}</p>
                            {renderStockBadge(product.stock)}
                          </div>
                        </div>
                        <div className="mt-4 flex flex-col sm:flex-row gap-2">
                           {isBoosted && product.boosted_until ? (
                              <BoostCountdownBadge boostedUntil={product.boosted_until} />
                          ) : product.boost_status === 'requested' ? (
                              <Badge variant="secondary" className="justify-center">Request Pending</Badge>
                          ) : (
                              <Button variant="outline" size="sm" onClick={() => setBoostRequestCandidate(product)} className="flex-grow">
                                  <Sparkles size={14} className="mr-1"/> Request Boost
                              </Button>
                          )}
                          <div className="flex-grow flex gap-2">
                            <Button variant="outline" size="sm" asChild className="flex-grow">
                              <Link href={`/vendor/products/${product.id}/edit`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                  <AlertDialogDescription>This action will permanently delete "{product.name}".</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <p className="text-center text-muted-foreground py-10">You have not added any products yet.</p>
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Image</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Boost Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.length > 0 ? products.map(product => {
                      const { src: productImageUrl, hint: productImageHint } = getImageAttributes(product.images?.[0], product.name);
                      const isBoosted = product.is_boosted && product.boosted_until && new Date(product.boosted_until) > new Date();
                      
                      return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <div className="relative w-14 h-14 rounded-md overflow-hidden bg-muted flex items-center justify-center">
                              {productImageUrl ? (
                                <Image src={productImageUrl} alt={product.name} fill sizes="56px" className="object-cover" data-ai-hint={productImageHint} />
                              ) : (
                                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                              )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium max-w-[200px] truncate" title={product.name}>{product.name}</TableCell>
                        <TableCell>{getCategoryNameDisplay(product)}</TableCell>
                        <TableCell>
                           {isBoosted && product.boosted_until ? (
                              <BoostCountdownBadge boostedUntil={product.boosted_until} />
                          ) : product.boost_status === 'requested' ? (
                              <Badge variant="secondary">Request Pending</Badge>
                          ) : (
                              <Button variant="outline" size="sm" onClick={() => setBoostRequestCandidate(product)}>
                                  <Sparkles size={14} className="mr-1"/> Request Boost
                              </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">GH₵{product.price.toFixed(2)}</TableCell>
                        <TableCell className="text-center">{renderStockBadge(product.stock)}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                              <Button variant="outline" size="icon" asChild title="Edit Product">
                                  <Link href={`/vendor/products/${product.id}/edit`}><Edit className="h-4 w-4" /></Link>
                              </Button>
                              <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                      <Button variant="destructive" size="icon" title="Delete Product"><Trash2 className="h-4 w-4" /></Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                      <AlertDialogHeader>
                                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                      <AlertDialogDescription>This action will permanently delete "{product.name}".</AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteProduct(product.id)}>Delete</AlertDialogAction>
                                      </AlertDialogFooter>
                                  </AlertDialogContent>
                              </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}) : (
                      <TableRow>
                          <TableCell colSpan={7} className="text-center h-24">
                             You have not added any products yet.
                          </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
        </CardContent>
      </Card>
      <AlertDialog open={!!boostRequestCandidate} onOpenChange={(isOpen) => { if (!isOpen) { setBoostRequestCandidate(null); setSelectedPlan(null); }}}>
        <AlertDialogContent className="sm:max-w-md">
            <AlertDialogHeader>
                <AlertDialogTitle>Request Product Boost</AlertDialogTitle>
                <AlertDialogDescription>
                    Select a plan to feature your product on the homepage and at the top of search/category results.
                    An admin will contact you for payment to approve the request.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
                <h3 className="font-semibold">Select a Plan</h3>
                <div className="space-y-3">
                    {boostPlans.map(plan => (
                        <Card 
                          key={plan.id}
                          onClick={() => setSelectedPlan(plan)}
                          className={`cursor-pointer transition-all ${selectedPlan?.id === plan.id ? 'border-primary ring-2 ring-primary' : 'hover:border-primary/50'}`}
                        >
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <p className="font-bold">{plan.name} Boost</p>
                                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                                </div>
                                <p className="text-lg font-bold text-primary">GH₵{plan.price.toFixed(2)}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setBoostRequestCandidate(null)}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleRequestBoost} disabled={!selectedPlan || isSubmittingBoost}>
                    {isSubmittingBoost && <Spinner className="mr-2 h-4 w-4"/>}
                    Submit Request
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
