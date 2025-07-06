
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import type { AdminOrderSummary, OrderStatus } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { ClipboardList, Search, AlertTriangle, Eye, CalendarIcon, X, ChevronLeft, ChevronRight, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { supabase } from '@/lib/supabaseClient';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';

const orderStatusOptions: (OrderStatus | 'All')[] = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Payment Failed'];
const ITEMS_PER_PAGE = 10;
const DEBOUNCE_DELAY = 300;
const MAX_SUGGESTIONS = 7;

interface Suggestion {
  id: string;
  type: 'order' | 'customer';
  name: string;
  secondaryText?: string;
}

const getStatusBadgeVariant = (status: OrderStatus): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Pending': return "default";
      case 'Processing': return "default";
      case 'Shipped': return "secondary";
      case 'Delivered': return "default";
      case 'Cancelled':
      case 'Payment Failed': return "destructive";
      default: return "outline";
    }
};

export default function VendorOrdersPage() {
  const { currentUser, loadingUser } = useUser();
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  
  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'All'>('All');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Loading and Error State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Suggestion State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Effect for suggestion fetching
  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const handler = setTimeout(async () => {
      const termLower = `%${searchTerm.toLowerCase()}%`;
      const { data: orderSuggestions } = await supabase.from('orders').select('id, user_id').ilike('id', termLower).limit(3);
      const { data: userSuggestions } = await supabase.from('user_profiles').select('id, name, email').or(`name.ilike.${termLower},email.ilike.${termLower}`).limit(4);

      const formattedOrderSuggestions: Suggestion[] = (orderSuggestions || []).map(o => ({
        id: o.id, type: 'order', name: `Order #${o.id.substring(0,8)}...`, secondaryText: `User ID: ${o.user_id.substring(0,8)}...`
      }));
      const formattedUserSuggestions: Suggestion[] = (userSuggestions || []).map(u => ({
        id: u.id, type: 'customer', name: u.name || 'N/A', secondaryText: u.email
      }));
      
      const combined = [...formattedOrderSuggestions, ...formattedUserSuggestions].slice(0, MAX_SUGGESTIONS);
      setSuggestions(combined);
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
  
  // Effect to reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, statusFilter, startDate, endDate]);

  const fetchVendorOrders = useCallback(async () => {
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
          throw new Error("Could not find a vendor profile for your user account.");
        }
        const vendorId = vendorData.id;

        const { data: productIdsData, error: productIdsError } = await supabase
          .from('products')
          .select('id')
          .eq('vendor_id', vendorId);

        if (productIdsError) throw productIdsError;
        const vendorProductIds = productIdsData.map(p => p.id);

        if (vendorProductIds.length === 0) {
          setOrders([]);
          setTotalOrders(0);
          setIsLoading(false);
          return;
        }

        const { data: orderItemsData, error: orderItemsError } = await supabase
          .from('order_items')
          .select('order_id')
          .in('product_id', vendorProductIds);

        if (orderItemsError) throw orderItemsError;
        const relevantOrderIds = [...new Set(orderItemsData.map(item => item.order_id))];

        if (relevantOrderIds.length === 0) {
          setOrders([]);
          setTotalOrders(0);
          setIsLoading(false);
          return;
        }
        
        let countQuery = supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .in('id', relevantOrderIds);

        let dataQuery = supabase
          .from('orders')
          .select(`
            id, user_id, total_amount, status, order_date,
            order_items (id)
          `)
          .in('id', relevantOrderIds)
          .order('order_date', { ascending: false });

        if (statusFilter !== 'All') {
          countQuery = countQuery.eq('status', statusFilter);
          dataQuery = dataQuery.eq('status', statusFilter);
        }
        if (startDate) {
          countQuery = countQuery.gte('order_date', startDate.toISOString());
          dataQuery = dataQuery.gte('order_date', startDate.toISOString());
        }
        if (endDate) {
          const endOfDay = new Date(endDate);
          endOfDay.setUTCHours(23, 59, 59, 999);
          countQuery = countQuery.lte('order_date', endOfDay.toISOString());
          dataQuery = dataQuery.lte('order_date', endOfDay.toISOString());
        }

       if (debouncedSearchTerm) {
        const searchTermLower = `%${debouncedSearchTerm.toLowerCase()}%`;
        const { data: matchingUsers, error: userSearchError } = await supabase
            .from('user_profiles')
            .select('id')
            .or(`name.ilike.${searchTermLower},email.ilike.${searchTermLower}`);

        const matchingUserIds = userSearchError ? [] : (matchingUsers || []).map(u => u.id);
        
        let orConditions = [`id.ilike.${searchTermLower}`];
        if (matchingUserIds.length > 0) {
            orConditions.push(`user_id.in.(${matchingUserIds.join(',')})`);
        }
        
        countQuery = countQuery.or(orConditions.join(','));
        dataQuery = dataQuery.or(orConditions.join(','));
      }
      
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      setTotalOrders(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      dataQuery = dataQuery.range(from, to);

      const { data: ordersData, error: ordersError } = await dataQuery;
      if (ordersError) throw ordersError;

      const userIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];
      let userProfilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase.from('user_profiles').select('id, email, name').in('id', userIds);
        if (profilesData) profilesData.forEach(p => userProfilesMap.set(p.id, p));
      }

      const fetchedOrders: AdminOrderSummary[] = (ordersData || []).map((o: any) => {
        const userProfile = userProfilesMap.get(o.user_id);
        return {
          id: o.id,
          user_id: o.user_id,
          customer_email: userProfile?.email || 'N/A',
          customer_name: userProfile?.name || 'Guest',
          orderDate: o.order_date,
          totalAmount: o.total_amount,
          status: o.status as OrderStatus,
          item_count: o.order_items.length,
        };
      });
      setOrders(fetchedOrders);

    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, statusFilter, startDate, endDate, debouncedSearchTerm, currentPage]);

  useEffect(() => {
    if (currentUser && !loadingUser) {
      fetchVendorOrders();
    }
  }, [currentUser, loadingUser, fetchVendorOrders]);

  const clearDateFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
  };
  
  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold">Could not load orders</h2>
        <p>{error}</p>
        <Button onClick={fetchVendorOrders} className="mt-4">Try Again</Button>
      </div>
    );
  }

  const renderOrderCard = (order: AdminOrderSummary) => (
    <Card key={order.id} className="overflow-hidden shadow-md mb-4">
      <CardHeader className="p-4 bg-muted/30">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-sm font-semibold">Order ID: {order.id.substring(0, 8)}...</CardTitle>
                <CardDescription className="text-xs">Customer: {order.customer_name}</CardDescription>
            </div>
            <Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 text-sm space-y-1">
        <p><strong>Date:</strong> {isValid(new Date(order.orderDate)) ? format(new Date(order.orderDate), "PPP") : "Invalid Date"}</p>
        <p><strong>Items in Order:</strong> {order.item_count}</p>
        <p><strong>Order Total:</strong> GH₵{order.totalAmount.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-4 border-t">
        <Button variant="outline" size="sm" asChild className="w-full">
          <Link href={`/orders/${order.id}`}>
            <Eye className="mr-2 h-4 w-4" /> View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><ClipboardList size={30}/> My Orders</h1>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Incoming Orders</CardTitle>
          <CardDescription>This list shows all orders that contain one or more of your products. Use search and filters below.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-start">
            <div ref={searchContainerRef} className="relative flex-grow w-full md:w-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by Order ID, customer name/email..."
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
                          {suggestion.type === 'order' ? <ClipboardList className="h-4 w-4 text-muted-foreground"/> : <UserCircle className="h-4 w-4 text-muted-foreground"/>}
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
            <div className="w-full md:w-auto md:min-w-[180px]">
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as OrderStatus | 'All')}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Filter by status..." />
                </SelectTrigger>
                <SelectContent>
                  {orderStatusOptions.map(option => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : <span>Start Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} disabled={(date) => (endDate && date > endDate) || date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full sm:w-[200px] justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : <span>End Date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} disabled={(date) => (startDate && date < startDate) || date > new Date()} initialFocus /></PopoverContent>
                </Popover>
                {(startDate || endDate) && (
                    <Button variant="ghost" onClick={clearDateFilters} className="w-full sm:w-auto" title="Clear date filters">
                        <X className="h-4 w-4" /><span className="sm:hidden ml-2">Clear Dates</span>
                    </Button>
                )}
            </div>
          </div>

          <div className="md:hidden space-y-4">
            {orders.length > 0
                ? orders.map(order => renderOrderCard(order))
                : <p className="text-center text-muted-foreground py-10">No orders found matching your criteria.</p>}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-center">Items</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length > 0 ? orders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.id.substring(0,8)}...</TableCell>
                    <TableCell>
                        <div>{order.customer_name}</div>
                        <div className="text-xs text-muted-foreground">{order.customer_email !== 'N/A' ? order.customer_email : (order.user_id ? `User ID: ${order.user_id.substring(0,8)}...` : 'N/A')}</div>
                    </TableCell>
                    <TableCell>{isValid(new Date(order.orderDate)) ? format(new Date(order.orderDate), "PP") : "Invalid Date"}</TableCell>
                    <TableCell className="text-right">GH₵{order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell className="text-center">{order.item_count}</TableCell>
                    <TableCell className="text-center"><Badge variant={getStatusBadgeVariant(order.status)}>{order.status}</Badge></TableCell>
                    <TableCell className="text-center">
                       <Button variant="outline" size="icon" asChild title="View Order Details">
                          <Link href={`/orders/${order.id}`}><Eye className="h-4 w-4" /><span className="sr-only">View Details</span></Link>
                        </Button>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={7} className="text-center h-24">No orders found matching your criteria.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
