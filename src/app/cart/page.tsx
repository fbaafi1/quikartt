
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { MinusCircle, PlusCircle, ShoppingCart, Trash2, XCircle, ImageIcon } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Spinner } from '@/components/ui/spinner';

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/64x64.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`; 
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
      src = `https://placehold.co/64x64.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }
  
  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};


export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart, cartTotal, itemCount } = useCart();
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!loadingUser && !currentUser && isClient) {
      router.push('/auth/login?redirect=/cart');
    }
  }, [currentUser, loadingUser, router, isClient]);

  if (!isClient || loadingUser) {
    return (
      <div className="text-center py-20">
        <Spinner className="mx-auto h-12 w-12 text-primary" />
        <p className="text-lg text-muted-foreground mt-4">Loading cart...</p>
      </div>
    );
  }

  if (!currentUser) {
     return (
      <div className="text-center py-20">
        <Spinner className="mx-auto h-12 w-12 text-primary" />
        <p className="text-lg text-muted-foreground mt-4">Redirecting to login...</p>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="text-center py-20">
        <ShoppingCart className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-semibold mb-4">Your Cart is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your cart yet.</p>
        <Button asChild size="lg">
          <Link href="/">Start Shopping</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Your Shopping Cart</CardTitle>
          <CardDescription>You have {itemCount} item(s) in your cart.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {cartItems.map(item => {
            const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images?.[0], item.name);
            return (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                {/* Image Section */}
                <div className="relative w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                   {itemImageUrl ? (
                    <Image
                      src={itemImageUrl}
                      alt={item.name}
                      fill
                      sizes="96px"
                      className="object-cover"
                      data-ai-hint={itemImageHint}
                    />
                   ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground m-auto" />
                   )}
                </div>

                {/* Details Section */}
                <div className="flex-grow min-w-0">
                  <Link href={`/products/${item.id}`} className="hover:text-primary">
                    <h3 className="text-lg font-semibold truncate">{item.name}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">Unit Price: GH₵{item.price.toFixed(2)}</p>
                  { typeof item.stock === 'number' && <p className="text-xs text-muted-foreground">Stock: {item.stock}</p> }
                </div>
                
                {/* Controls Section */}
                <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)} aria-label="Decrease quantity">
                              <MinusCircle className="h-4 w-4" />
                            </Button>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => {
                                const newQuantity = parseInt(e.target.value, 10);
                                if (!isNaN(newQuantity)) {
                                    updateQuantity(item.id, newQuantity);
                                }
                              }}
                              className="w-16 h-8 text-center"
                              min="1"
                              aria-label={`Quantity for ${item.name}`}
                            />
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)} aria-label="Increase quantity">
                              <PlusCircle className="h-4 w-4" />
                            </Button>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)} aria-label="Remove item">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                    <p className="text-md font-semibold text-primary text-right">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            );
          })}
          <Separator />
          <div className="text-right space-y-2 pt-4">
            <p className="text-lg sm:text-xl">Total Items: <span className="font-semibold">{itemCount}</span></p>
            <p className="text-2xl sm:text-3xl font-bold text-primary">Grand Total: GH₵{cartTotal.toFixed(2)}</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 p-4 sm:p-6 border-t">
          <Button variant="outline" onClick={clearCart} className="w-full sm:w-auto">
            <XCircle className="mr-2 h-4 w-4" /> Clear Cart
          </Button>
          <Button size="lg" asChild className="w-full sm:w-auto">
            <Link href="/checkout">Proceed to Checkout</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
