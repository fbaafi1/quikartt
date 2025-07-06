
"use client";

import Image from 'next/image';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, CalendarDays, CreditCard, CheckCircle, AlertCircle, Loader2, Truck, ImageIcon, Eye } from 'lucide-react';
import Link from 'next/link';
import { Button } from '../ui/button';

interface OrderListItemProps {
  order: Order;
}

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/56x56.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`;
  let hint: string = itemName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/')) {
      src = potentialSrc; 
      hint = embeddedHint || hint; 
    } else if (potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc; 
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = itemName.split(' ').slice(0, 2).join(' ') || 'Item';
      src = `https://placehold.co/56x56.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }
  
  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};


const getStatusIcon = (status: Order['status']) => {
  switch (status) {
    case 'Pending': return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />;
    case 'Processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'Shipped': return <Truck className="h-4 w-4 text-indigo-500" />;
    case 'Delivered': return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'Cancelled':
    case 'Payment Failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
    default: return <Package className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadgeVariant = (status: Order['status']): "default" | "secondary" | "destructive" | "outline" => {
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


export default function OrderListItem({ order }: OrderListItemProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <CardTitle className="text-xl text-primary">Order ID: {order.id}</CardTitle>
          <Badge variant={getStatusBadgeVariant(order.status)} className="flex items-center gap-1.5 py-1 px-2.5 w-fit">
            {getStatusIcon(order.status)}
            {order.status}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <span className="flex items-center gap-1.5"><CalendarDays size={14}/> {new Date(order.orderDate).toLocaleDateString()}</span>
            <span className="flex items-center gap-1.5"><CreditCard size={14}/> {order.paymentMethod}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {order.items.map(item => {
           const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images[0], item.name);
           return (
            <div key={item.id} className="flex items-center gap-3 p-2 border-b last:border-b-0">
                 <div className="relative w-14 h-14 rounded-md overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                    {itemImageUrl ? (
                        <Image
                            src={itemImageUrl}
                            alt={item.name}
                            fill
                            sizes="56px"
                            className="object-cover"
                            data-ai-hint={itemImageHint}
                        />
                    ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                    )}
                 </div>
              <div className="flex-grow">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">Qty: {item.quantity} - GH₵{item.price.toFixed(2)} each</p>
              </div>
              <p className="text-sm font-semibold">GH₵{(item.price * item.quantity).toFixed(2)}</p>
            </div>
           );
        })}
        <Separator />
        <div className="flex justify-between items-center pt-2">
            <p className="text-lg font-bold">Total: GH₵{order.totalAmount.toFixed(2)}</p>
            <Button asChild variant="outline" size="sm">
                <Link href={`/orders/${order.id}`}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
                </Link>
            </Button>
        </div>
      </CardContent>
       {order.transactionId && (
        <CardFooter className="text-xs text-muted-foreground border-t pt-3 pb-3">
            Mobile Money TxID: {order.transactionId}
        </CardFooter>
      )}
    </Card>
  );
}
