
"use client";

import { useState, useEffect } from 'react';
import OrderListItem from '@/components/orders/OrderListItem';
import type { Order, CartItem as OrderItemType } from '@/lib/types'; // Ensure CartItem is OrderItemType if structure is same
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ListOrdered, ShoppingBag, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui/spinner';

const ITEMS_PER_PAGE = 10;

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    if (loadingUser) return;

    if (!currentUser) {
      router.push('/auth/login?redirect=/orders');
      return;
    }

    if (currentUser.role === 'admin') {
      router.replace('/admin/orders');
      return;
    }
    if (currentUser.role === 'vendor') {
      router.replace('/vendor/orders');
      return;
    }

    const fetchOrders = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const threeDaysAgo = new Date();
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        
        const filterClause = `status.neq.Delivered,updated_at.gte.${threeDaysAgo.toISOString()}`;

        // Get total count
        const { count, error: countError } = await supabase
          .from('orders')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .or(filterClause);

        if (countError) throw countError;
        setTotalOrders(count || 0);
        
        // Fetch paginated orders for the current user, and their related order_items
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;

        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id, user_id, total_amount, status, order_date, updated_at, shipping_address, payment_method, transaction_id,
            order_items (product_id, quantity, price_at_purchase, product_name, product_image, products (id, name, description, price, images, category_id, stock))
          `)
          .eq('user_id', currentUser.id)
          .or(filterClause)
          .order('order_date', { ascending: false })
          .range(from, to);

        if (ordersError) throw ordersError;

        const formattedOrders: Order[] = ordersData?.map((o: any) => ({
          id: o.id,
          userId: o.user_id,
          items: o.order_items.map((oi: any) => ({
            id: oi.products.id,
            name: oi.product_name || oi.products.name,
            description: oi.products.description,
            price: oi.price_at_purchase,
            images: [oi.product_image || (oi.products.images?.[0] || '')],
            categoryId: oi.products.category_id,
            stock: oi.products.stock,
            quantity: oi.quantity,
          })) as OrderItemType[],
          totalAmount: o.total_amount,
          status: o.status,
          orderDate: o.order_date,
          shippingAddress: o.shipping_address,
          paymentMethod: o.payment_method,
          transactionId: o.transaction_id,
        })) || [];
        
        setOrders(formattedOrders);
      } catch (err: any) {
        setError(err.message || "Failed to fetch orders.");
        console.error("Order fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (currentUser.role === 'customer') {
      fetchOrders();
    }

  }, [currentUser, loadingUser, router, currentPage]);

  if (isLoading || loadingUser || (currentUser && currentUser.role !== 'customer')) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your orders...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error loading orders</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild className="mt-4" variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }
  
  if (!currentUser && !loadingUser) {
    return (
      <div className="text-center py-20">
        <p className="text-lg text-muted-foreground">Please log in to view your orders.</p>
        <Button asChild className="mt-4"><Link href="/auth/login?redirect=/orders">Login</Link></Button>
      </div>
    );
  }

  const totalPages = Math.ceil(totalOrders / ITEMS_PER_PAGE);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2"><ListOrdered size={30}/> My Orders</h1>
        <Button asChild variant="outline">
          <Link href="/">Continue Shopping</Link>
        </Button>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-6">
          {orders.map(order => (
            <OrderListItem key={order.id} order={order} />
          ))}
           {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-8 pt-6 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <ShoppingBag className="mx-auto h-20 w-20 text-muted-foreground mb-6"/>
          <h2 className="text-2xl font-semibold text-muted-foreground">No orders yet!</h2>
          <p className="text-muted-foreground mt-2 mb-6">Looks like you haven't placed any orders. Start shopping to see them here.</p>
          <Button asChild size="lg">
            <Link href="/">Shop Now</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

    