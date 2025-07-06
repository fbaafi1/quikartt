
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Sparkles, Check, X, ThumbsUp, ThumbsDown, ChevronLeft, ChevronRight } from 'lucide-react';
import type { BoostRequest } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import Image from 'next/image';
import { Spinner } from '@/components/ui/spinner';

const ITEMS_PER_PAGE = 10;

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

export default function AdminBoostRequestsPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [requests, setRequests] = useState<BoostRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalRequests, setTotalRequests] = useState(0);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Step 1: Count total boost requests
      const { count, error: countError } = await supabase
        .from('boost_requests')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalRequests(count || 0);

      // Step 2: Fetch paginated boost requests
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      const { data: requestsData, error: reqError } = await supabase
        .from('boost_requests')
        .select(`*`)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (reqError) throw reqError;

      if (!requestsData || requestsData.length === 0) {
        setRequests([]);
        setIsLoading(false);
        return;
      }

      const productIds = [...new Set(requestsData.map(r => r.product_id).filter(Boolean))];
      const vendorIds = [...new Set(requestsData.map(r => r.vendor_id).filter(Boolean))];

      const productsPromise = supabase.from('products').select('id, name, images').in('id', productIds);
      const vendorsPromise = supabase.from('vendors').select('id, store_name').in('id', vendorIds);
      
      const [productsResult, vendorsResult] = await Promise.all([productsPromise, vendorsPromise]);

      if (productsResult.error) throw new Error(`Products fetch failed: ${productsResult.error.message}`);
      if (vendorsResult.error) throw new Error(`Vendors fetch failed: ${vendorsResult.error.message}`);
      
      const productsMap = new Map(productsResult.data?.map(p => [p.id, p]));
      const vendorsMap = new Map(vendorsResult.data?.map(v => [v.id, v]));

      const combinedRequests = requestsData.map(req => ({
        ...req,
        products: productsMap.get(req.product_id) || null,
        vendors: vendorsMap.get(req.vendor_id) || null,
      }));

      setRequests(combinedRequests as any[]);

    } catch (err: any) {
      setError(err.message || 'Failed to fetch boost requests');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);


  useEffect(() => {
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/auth/login?redirect=/admin/boost-requests');
    } else if (currentUser) {
      fetchRequests();
    }
  }, [currentUser, loadingUser, router, fetchRequests]);

  const handleApprove = async (request: BoostRequest) => {
    const boostedUntil = new Date();
    boostedUntil.setDate(boostedUntil.getDate() + request.plan_duration_days);

    const updateRequestPromise = supabase
      .from('boost_requests')
      .update({ request_status: 'approved', updated_at: new Date().toISOString() })
      .eq('id', request.id);

    const updateProductPromise = supabase
      .from('products')
      .update({
        is_boosted: true,
        boost_status: 'active',
        boosted_until: boostedUntil.toISOString(),
      })
      .eq('id', request.product_id);

    try {
      await Promise.all([updateRequestPromise, updateProductPromise]);
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleReject = async (request: BoostRequest) => {
    const updateRequestPromise = supabase
      .from('boost_requests')
      .update({ request_status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', request.id);
    
    const updateProductPromise = supabase
      .from('products')
      .update({ boost_status: 'none' })
      .eq('id', request.product_id);

    try {
      await Promise.all([updateRequestPromise, updateProductPromise]);
      fetchRequests();
    } catch (err: any) {
      setError(err.message);
    }
  };
  
  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'pending': return "default";
      case 'approved': return "secondary";
      case 'rejected': return "destructive";
      default: return "outline";
    }
  };

  const totalPages = Math.ceil(totalRequests / ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Boost Requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h1 className="text-2xl font-semibold">Error Loading Requests</h1>
        <p>{error}</p>
        <Button onClick={fetchRequests} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Sparkles size={30}/> Boost Requests</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vendor Boost Requests</CardTitle>
          <CardDescription>Review, approve, or reject boost requests from vendors. Approve requests after confirming offline payment.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Requested On</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map(req => {
                   const { src: productImageUrl } = getProductImageAttributes(req.products?.images?.[0], req.products?.name || "Product");
                  return (
                    <TableRow key={req.id}>
                       <TableCell className="flex items-center gap-2">
                        <Image src={productImageUrl} alt={req.products?.name || 'product'} width={40} height={40} className="rounded-md object-cover" />
                        <span className="font-medium">{req.products?.name || 'Unknown Product'}</span>
                      </TableCell>
                      <TableCell>{req.vendors?.store_name || 'Unknown Vendor'}</TableCell>
                      <TableCell>{req.plan_duration_days} days (GH₵{req.plan_price})</TableCell>
                      <TableCell>{format(new Date(req.created_at), "PP")}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(req.request_status)} className="capitalize">{req.request_status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {req.request_status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleApprove(req)}><ThumbsUp className="mr-2 h-4 w-4"/> Approve</Button>
                            <Button variant="destructive" size="sm" onClick={() => handleReject(req)}><ThumbsDown className="mr-2 h-4 w-4"/> Reject</Button>
                          </div>
                        )}
                         {req.request_status === 'approved' && <Badge variant="secondary"><Check className="mr-2 h-4 w-4"/>Approved</Badge>}
                         {req.request_status === 'rejected' && <Badge variant="destructive"><X className="mr-2 h-4 w-4"/>Rejected</Badge>}
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">No boost requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
         {totalPages > 1 && (
          <CardFooter>
            <div className="flex items-center justify-center space-x-2 w-full mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

    