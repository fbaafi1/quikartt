"use client";

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Order, OrderStatus, OrderProductItem, Address as DeliveryAddress, PaymentMethod } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { ChevronLeft, AlertTriangle, ImageIcon, Package, UserCircle, MapPin, CreditCard, CalendarDays, Download } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ResponsiveContainer } from 'recharts/types/component/ResponsiveContainer';
import { Spinner } from '@/components/ui/spinner';

// Reusable getImageAttributes helper
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/64x64.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`;
  let hint: string = itemName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/') || potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc;
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = itemName.split(' ').slice(0, 2).join(' ') || 'Item';
      src = `https://placehold.co/64x64.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};

// Reusable getStatusBadgeVariant helper
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

interface PageParams {
  orderId: string;
}

interface OrderDetailPageProps {
  params: Promise<PageParams>;
}

export default function CustomerOrderDetailPage({ params: paramsPromise }: OrderDetailPageProps) {
  const params = use(paramsPromise);
  const { orderId } = params;

  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!loadingUser && !currentUser) {
      router.push(`/auth/login?redirect=/orders/${orderId}`);
      return;
    }

    const fetchOrderDetails = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      setError(null);
      try {
        let query = supabase
          .from('orders')
          .select(`
            *,
            order_items (
              product_id,
              quantity,
              price_at_purchase,
              product_name,
              product_image,
              products (id, name, description, price, images, category_id, stock)
            )
          `)
          .eq('id', orderId);

        // Security check: Customers can only see their own orders.
        // Vendors/Admins rely on RLS policies to filter results.
        if (currentUser.role === 'customer') {
          query = query.eq('user_id', currentUser.id);
        }

        const { data: ordersData, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;

        if (ordersData && ordersData.length === 1) {
          const data = ordersData[0];
          const formattedOrder: Order = {
            id: data.id,
            userId: data.user_id,
            items: data.order_items?.map((oi: any) => ({
              id: oi.products?.id || oi.product_id,
              name: oi.product_name || oi.products?.name || 'Unknown Product',
              description: oi.products?.description,
              price: oi.price_at_purchase,
              images: oi.product_image ? [oi.product_image] : (oi.products?.images || []),
              categoryId: oi.products?.category_id,
              quantity: oi.quantity,
            })) as OrderProductItem[] || [],
            totalAmount: data.total_amount,
            status: data.status as OrderStatus,
            orderDate: data.order_date,
            shippingAddress: data.shipping_address as DeliveryAddress,
            paymentMethod: data.payment_method as PaymentMethod,
            transactionId: data.transaction_id,
            // For customer page, user_profiles are the currentUser
            user_profiles: { name: currentUser.name, email: currentUser.email, phone: currentUser.phone },
            order_items: data.order_items,
          };
          setOrder(formattedOrder);
        } else {
          setError("Order not found or you don't have permission to view it.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch order details.");
      } finally {
        setIsLoading(false);
      }
    };

    if (orderId && currentUser) {
      fetchOrderDetails();
    }
  }, [currentUser, loadingUser, router, orderId]);


  if (!isClient || loadingUser) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading order details...</p>
        </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
         <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Error Loading Order</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
         <Button asChild className="mt-4" variant="outline">
            <Link href="/orders"><ChevronLeft className="mr-2 h-4 w-4" /> Back to My Orders</Link>
        </Button>
      </div>
    );
  }

  if (!order && !isLoading) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Order not found</h1>
         <Button asChild className="mt-4" variant="outline">
            <Link href="/orders"><ChevronLeft className="mr-2 h-4 w-4" /> Back to My Orders</Link>
        </Button>
      </div>
    );
  }

  if (!order) return null;


  return (
    <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex justify-between items-center">
            <Button variant="outline" asChild>
                <Link href="/orders"><ChevronLeft className="mr-2 h-4 w-4" /> Back to My Orders</Link>
            </Button>
        </div>

        <Card className="shadow-lg">
            <CardHeader className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                    <CardTitle className="text-2xl">Order ID: {order.id}</CardTitle>
                    <CardDescription className="flex items-center gap-1"><CalendarDays size={14}/> {format(new Date(order.orderDate), "PPP p")}</CardDescription>
                </div>
                <Badge variant={getStatusBadgeVariant(order.status)} className="text-base px-3 py-1">{order.status}</Badge>
            </CardHeader>
            <CardContent className="space-y-6">
                <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><MapPin size={20}/> Delivery Address</h3>
                    <div className="text-sm space-y-1 pl-2 border-l-2">
                        <p><strong>Street:</strong> {order.shippingAddress.street}</p>
                        <p><strong>City:</strong> {order.shippingAddress.city}</p>
                        <p><strong>Region:</strong> {order.shippingAddress.region}</p>
                        {order.shippingAddress.postalCode && <p><strong>Postal Code:</strong> {order.shippingAddress.postalCode}</p>}
                        <p><strong>Country:</strong> {order.shippingAddress.country}</p>
                    </div>
                </section>
                <Separator/>
                 <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><CreditCard size={20}/> Payment Details</h3>
                    <div className="text-sm space-y-1 pl-2 border-l-2">
                        <p><strong>Method:</strong> {order.paymentMethod}</p>
                        {order.transactionId && <p><strong>Transaction ID:</strong> {order.transactionId}</p>}
                        <p><strong>Total Amount:</strong> <span className="font-bold text-primary">GH₵{order.totalAmount.toFixed(2)}</span></p>
                    </div>
                </section>
                <Separator/>
                <section>
                    <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><Package size={20}/> Order Items ({order.items.length})</h3>
                    <div className="space-y-3">
                        {order.items.map((item, index) => {
                            const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images?.[0], item.name);
                            return (
                                <div key={`${item.id}-${index}`} className="flex items-center gap-4 p-2 border rounded-md">
                                    <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                                        {itemImageUrl ? (
                                        <Image src={itemImageUrl} alt={item.name} fill sizes="64px" className="object-cover" data-ai-hint={itemImageHint} />
                                        ) : <ImageIcon className="w-8 h-8 text-muted-foreground m-auto" />}
                                    </div>
                                    <div className="flex-grow">
                                        <p className="font-medium text-sm">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">Qty: {item.quantity} x GH₵{item.price.toFixed(2)}</p>
                                    </div>
                                    <p className="text-sm font-semibold">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                                </div>
                            );
                        })}
                    </div>
                </section>
            </CardContent>
        </Card>
    </div>
  );
}
