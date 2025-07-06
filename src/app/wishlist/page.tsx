
"use client";

import Image from 'next/image';
import Link from 'next/link';
import { useWishlist } from '@/contexts/WishlistContext';
import { useCart } from '@/contexts/CartContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Trash2, ImageIcon, HeartCrack } from 'lucide-react';
import type { Product } from '@/lib/types';
import { Spinner } from '@/components/ui/spinner';

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/128x128.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`;
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
    } else if (potentialSrc) { // Attempt to handle if it's just a URL without hint structure
      const textForPlaceholder = itemName.split(' ').slice(0, 2).join(' ') || 'Item';
      src = `https://placehold.co/128x128.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint; // Still try to use embedded hint if somehow present
    }
  }
  
  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};


export default function WishlistPage() {
  const { wishlistItems, removeFromWishlist, itemCount, isLoadingWishlist } = useWishlist();
  const { addToCart } = useCart();

  const handleMoveToCart = (product: Product) => {
    addToCart(product);
    removeFromWishlist(product.id); 
  };

  if (isLoadingWishlist) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading your wishlist...</p>
      </div>
    );
  }

  if (itemCount === 0) {
    return (
      <div className="text-center py-20">
        <HeartCrack className="mx-auto h-24 w-24 text-muted-foreground mb-6" />
        <h1 className="text-3xl font-semibold mb-4">Your Wishlist is Empty</h1>
        <p className="text-muted-foreground mb-8">Looks like you haven't added anything to your wishlist yet.</p>
        <Button asChild size="lg">
          <Link href="/">Discover Products</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">My Wishlist</CardTitle>
          <CardDescription>You have {itemCount} item(s) in your wishlist.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {wishlistItems.map(item => {
            const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images?.[0], item.name);
            return (
              <div key={item.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg hover:shadow-md transition-shadow">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32 rounded-md overflow-hidden shrink-0 bg-muted flex items-center justify-center">
                   {itemImageUrl ? (
                    <Image
                      src={itemImageUrl}
                      alt={item.name}
                      fill
                      sizes="(max-width: 640px) 96px, 128px"
                      className="object-cover"
                      data-ai-hint={itemImageHint}
                    />
                   ) : (
                    <ImageIcon className="w-12 h-12 text-muted-foreground" />
                   )}
                </div>
                <div className="flex-grow">
                  <Link href={`/products/${item.id}`} className="hover:text-primary">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground">Price: GH₵{item.price.toFixed(2)}</p>
                  <Badge variant={item.stock > 0 ? "secondary" : "destructive"} className="mt-1">
                    {item.stock > 0 ? `In Stock: ${item.stock}` : 'Out of Stock'}
                  </Badge>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-3 sm:mt-0 w-full sm:w-auto">
                  <Button 
                    onClick={() => handleMoveToCart(item)} 
                    disabled={item.stock === 0}
                    className="w-full sm:w-auto"
                    size="sm"
                  >
                    <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full sm:w-auto text-destructive hover:text-destructive" 
                    onClick={() => removeFromWishlist(item.id)}
                    size="sm"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Remove
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
