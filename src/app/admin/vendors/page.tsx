"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Vendor } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Store, AlertTriangle, ExternalLink, ShieldCheck, ShieldOff, Search, UserCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

const DEBOUNCE_DELAY = 300;
const MAX_SUGGESTIONS = 7;
const ITEMS_PER_PAGE = 10;

interface Suggestion {
  id: string;
  type: 'vendor' | 'user';
  name: string;
  secondaryText?: string;
}

// Mobile Card Component
function VendorMobileCard({ vendor, onToggleVerification, onDelete }: { vendor: Vendor, onToggleVerification: (vendor: Vendor) => void, onDelete: (vendor: Vendor) => void }) {
  const isSubExpired = vendor.subscription_end_date && new Date(vendor.subscription_end_date) < new Date();
  return (
    <Card key={vendor.id} className="shadow-md mb-4">
      <CardHeader>
        <div className="flex items-start justify-between">
            <CardTitle>{vendor.store_name}</CardTitle>
            {vendor.is_verified && (
                <Badge className="bg-green-600 hover:bg-green-700 text-white text-xs">
                    <ShieldCheck className="mr-1 h-3 w-3"/> Verified
                </Badge>
            )}
        </div>
        <CardDescription>
            {vendor.user?.name || 'N/A'} ({vendor.user?.email || 'N/A'})
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm space-y-3">
        <div>
            <p className="font-medium">Subscription End</p>
             {vendor.subscription_end_date ? (
                <Badge variant={isSubExpired ? "destructive" : "secondary"}>
                  {format(new Date(vendor.subscription_end_date), "PPP")}
                </Badge>
              ) : (
                <span className="text-xs text-muted-foreground italic">No end date</span>
              )}
        </div>
        <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
                <Label htmlFor={`verify-switch-card-${vendor.id}`} className="font-medium">Verification Status</Label>
            </div>
            <Switch
                id={`verify-switch-card-${vendor.id}`}
                checked={vendor.is_verified}
                onCheckedChange={() => onToggleVerification(vendor)}
                aria-label={`Toggle verification for ${vendor.store_name}`}
            />
        </div>
      </CardContent>
      <CardFooter className="p-3 border-t grid grid-cols-3 gap-2">
          <Button variant="ghost" size="sm" asChild className="w-full" title="View Public Storefront" disabled={isSubExpired}>
              <Link href={`/vendors/${vendor.id}`} target="_blank"><ExternalLink className="mr-2 h-4 w-4"/> Store</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="w-full" title="Edit Vendor">
              <Link href={`/admin/vendors/${vendor.id}/edit`}><Edit className="mr-2 h-4 w-4"/> Edit</Link>
          </Button>
          <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full" title="Delete Vendor"><Trash2 className="mr-2 h-4 w-4"/> Del</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete "{vendor.store_name}"?</AlertDialogTitle>
                  <AlertDialogDescription>This will permanently delete the vendor, all of their products, and revert the user's role to 'customer'. This action cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => onDelete(vendor)}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export default function AdminVendorsPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalVendors, setTotalVendors] = useState(0);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);
  
  // Effect for suggestion fetching
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(async () => {
      const term = `%${searchTerm}%`;
      const { data: vendorSugs } = await supabase.from('vendors').select('id, store_name').ilike('store_name', term).limit(4);
      const { data: userSugs } = await supabase.from('user_profiles').select('id, name, email').or(`name.ilike.${term},email.ilike.${term}`).limit(3);

      const combined: Suggestion[] = [
        ...(vendorSugs || []).map(v => ({ id: v.id, name: v.store_name, type: 'vendor' as const, secondaryText: 'Store' })),
        ...(userSugs || []).map(u => ({ id: u.id, name: u.name || 'N/A', type: 'user' as const, secondaryText: u.email })),
      ];

      setSuggestions(combined.slice(0, MAX_SUGGESTIONS));
      setShowSuggestions(combined.length > 0);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [searchTerm]);

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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const fetchVendors = useCallback(async () => {
      if (!currentUser || currentUser.role !== 'admin') return;

      setIsLoading(true);
      setError(null);
      try {
          let baseQuery = supabase.from('vendors');

          let countQuery = baseQuery.select('*', { count: 'exact', head: true });
          let dataQuery = baseQuery.select('*').order('created_at', { ascending: false });

          if (debouncedSearchTerm) {
              const searchTermLower = `%${debouncedSearchTerm.toLowerCase()}%`;
              const { data: matchingUsers, error: userSearchError } = await supabase
                  .from('user_profiles')
                  .select('id')
                  .or(`name.ilike.${searchTermLower},email.ilike.${searchTermLower}`);

              if (userSearchError) console.warn("Could not search user profiles:", userSearchError.message);
              
              const matchingUserIds = (matchingUsers || []).map(u => u.id);
              let orFilter = `store_name.ilike.${searchTermLower}`;
              if (matchingUserIds.length > 0) {
                  orFilter += `,user_id.in.(${matchingUserIds.join(',')})`;
              }
              countQuery = countQuery.or(orFilter);
              dataQuery = dataQuery.or(orFilter);
          }

          const { count, error: countError } = await countQuery;
          if (countError) throw countError;
          setTotalVendors(count || 0);

          const from = (currentPage - 1) * ITEMS_PER_PAGE;
          const to = from + ITEMS_PER_PAGE - 1;
          dataQuery = dataQuery.range(from, to);

          const { data: vendorsData, error: vendorsError } = await dataQuery;
          if (vendorsError) throw vendorsError;
          if (!vendorsData) {
              setVendors([]);
              setIsLoading(false);
              return;
          }

          const userIds = vendorsData.map(v => v.user_id).filter(Boolean);
          if (userIds.length > 0) {
              const { data: usersData, error: usersError } = await supabase.from('user_profiles').select('id, email, name').in('id', userIds);
              if (usersError) throw usersError;

              const usersMap = new Map(usersData.map(u => [u.id, u]));
              const combinedVendors: Vendor[] = vendorsData.map(vendor => ({
                  ...vendor,
                  user: usersMap.get(vendor.user_id) || null,
              }));
              setVendors(combinedVendors);
          } else {
              setVendors(vendorsData as Vendor[]);
          }
      } catch (err: any) {
          setError(err.message || 'An unknown error occurred fetching vendors.');
          console.error("Error fetching vendors:", err);
      } finally {
          setIsLoading(false);
      }
  }, [currentUser, debouncedSearchTerm, currentPage]);

  useEffect(() => {
    if (!loadingUser) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/auth/login?redirect=/admin/vendors');
      } else {
        fetchVendors();
      }
    }
  }, [currentUser, loadingUser, router, fetchVendors]);

  const handleDeleteVendor = async (vendor: Vendor) => {
    try {
      const { error: deleteError } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendor.id);
      
      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ role: 'customer' })
        .eq('id', vendor.user_id);

      if (updateError) {
        console.error(`Vendor profile for "${vendor.store_name}" was deleted, but their role could not be reverted. Error: ${updateError.message}`);
      } else {
         console.log(`Vendor "${vendor.store_name}" and all their products have been removed. The user's role has been reverted to 'customer'.`);
      }
      fetchVendors(); // Refresh the list
    } catch (err: any) {
      console.error("Deletion Failed", err.message);
    }
  };
  
  const handleToggleVerification = async (vendor: Vendor) => {
    try {
      const newStatus = !vendor.is_verified;
      const { error: updateError } = await supabase
        .from('vendors')
        .update({ is_verified: newStatus, updated_at: new Date().toISOString() })
        .eq('id', vendor.id);

      if (updateError) throw updateError;
      
      setVendors(prev =>
        prev.map(v =>
          v.id === vendor.id ? { ...v, is_verified: newStatus } : v
        )
      );
    } catch (err: any) {
      console.error("Error Updating Status", err.message);
      fetchVendors();
    }
  };
  
  const totalPages = Math.ceil(totalVendors / ITEMS_PER_PAGE);

  if (!isClient || loadingUser || (!currentUser && !loadingUser && !error)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading vendors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold">Could not load vendors</h2>
        <p>{error}</p>
        <Button onClick={fetchVendors} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Store size={30}/> Vendor Management</h1>
        <Button asChild>
          <Link href="/admin/vendors/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Vendor
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Vendor List</CardTitle>
          <CardDescription>Manage sellers registered on the platform. Toggle the switch to verify a vendor for special status.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <div ref={searchContainerRef} className="relative flex-grow w-full md:w-auto">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by store name, user name/email..."
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
                          key={`${suggestion.type}-${suggestion.id}`}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="flex items-center gap-3 p-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                        >
                          {suggestion.type === 'vendor' ? <Store className="h-4 w-4 text-muted-foreground"/> : <UserCircle className="h-4 w-4 text-muted-foreground"/>}
                          <div className="flex-grow min-w-0">
                            <p className="text-sm font-medium truncate">{suggestion.name}</p>
                            {suggestion.secondaryText && <p className="text-xs text-muted-foreground truncate">{suggestion.secondaryText}</p>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
          <div className="md:hidden space-y-4">
            {vendors.length > 0 ? (
              vendors.map(vendor => (
                <VendorMobileCard 
                  key={vendor.id} 
                  vendor={vendor} 
                  onToggleVerification={handleToggleVerification} 
                  onDelete={handleDeleteVendor} 
                />
              ))
            ) : (
              <p className="text-center text-muted-foreground py-10">No vendors found matching your search. Click "Add New Vendor" to get started.</p>
            )}
          </div>
          
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Store Name</TableHead>
                  <TableHead>Vendor (User)</TableHead>
                  <TableHead>Subscription End</TableHead>
                  <TableHead className="text-center">Verified</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendors.length > 0 ? vendors.map(vendor => {
                  const isSubExpired = vendor.subscription_end_date && new Date(vendor.subscription_end_date) < new Date();
                  return (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">{vendor.store_name}</TableCell>
                      <TableCell>
                        <div>{vendor.user?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">{vendor.user?.email || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        {vendor.subscription_end_date ? (
                          <Badge variant={isSubExpired ? "destructive" : "secondary"}>
                            {format(new Date(vendor.subscription_end_date), "PPP")}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No end date</span>
                        )}
                      </TableCell>
                       <TableCell className="text-center">
                          <Switch
                              checked={vendor.is_verified}
                              onCheckedChange={() => handleToggleVerification(vendor)}
                              aria-label={`Toggle verification for ${vendor.store_name}`}
                              title={vendor.is_verified ? "Verified" : "Not Verified"}
                          />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Button variant="ghost" size="icon" asChild title="View Public Storefront" disabled={isSubExpired}>
                            <Link href={`/vendors/${vendor.id}`} target="_blank"><ExternalLink className="h-4 w-4" /></Link>
                          </Button>
                          <Button variant="outline" size="icon" asChild title="Edit Vendor">
                            <Link href={`/admin/vendors/${vendor.id}/edit`}><Edit className="h-4 w-4" /></Link>
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" title="Delete Vendor"><Trash2 className="h-4 w-4" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete "{vendor.store_name}"?</AlertDialogTitle>
                                <AlertDialogDescription>This will permanently delete the vendor, all of their products, and revert the user's role to 'customer'. This action cannot be undone.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteVendor(vendor)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                }) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      No vendors found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {totalPages > 1 && (
            <CardFooter>
                 <div className="flex items-center justify-center space-x-2 w-full mt-6 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}>
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
            </CardFooter>
        )}
      </Card>
    </div>
  );
}
