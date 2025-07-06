
"use client";

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, ImageIcon, Heart, Rocket } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import StarRatingDisplay from '@/components/ui/StarRatingDisplay'; // Import StarRatingDisplay
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Badge } from '../ui/badge';

// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, productName: string = "Product") => {
  let src: string = `https://placehold.co/400x300.png?text=${encodeURIComponent(productName.split(' ').slice(0,1).join('') || 'Product')}`;
  let hint: string = productName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

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
      const textForPlaceholder = productName.split(' ').slice(0, 2).join(' ') || 'Product';
      src = `https://placehold.co/400x300.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};


export default function ProductCard({ product }: { product: Product }) {
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useUser();
  const router = useRouter();

  const handleAddToCart = () => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=/`); // Or redirect back to current page if possible
      return;
    }
    addToCart(product);
  };

  const handleWishlistToggle = () => {
    // Wishlist can be used by non-logged-in users as it's localStorage based
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const { src: mainImageUrl, hint: mainImageHint } = getImageAttributes(product.images[0], product.name);
  const inWishlist = isInWishlist(product.id);
  const isBoosted = product.is_boosted && product.boosted_until && new Date(product.boosted_until) > new Date();

  return (
    <Card className="flex flex-col overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 h-full group border-primary">
      <Link href={`/products/${product.id}`} className="block">
        <CardHeader className="p-0">
          <div className="aspect-[4/3] relative w-full overflow-hidden bg-muted flex items-center justify-center">
            {mainImageUrl ? (
                <Image
                src={mainImageUrl}
                alt={product.name}
                fill
                sizes="(max-width: 640px) 50vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                className="object-cover group-hover:scale-105 transition-transform duration-300"
                data-ai-hint={mainImageHint}
                />
            ) : (
                <ImageIcon className="w-16 h-16 text-muted-foreground" />
            )}
            {isBoosted && (
                <Badge variant="default" className="absolute top-2 left-2 z-10 bg-primary/90 text-primary-foreground flex items-center gap-1 shadow-lg">
                    <Rocket size={12} />
                    Featured
                </Badge>
            )}
          </div>
        </CardHeader>
      </Link>
      <CardContent className="p-3 pb-1 flex-grow">
        <Link href={`/products/${product.id}`} className="block">
          <CardTitle className="text-base font-semibold hover:text-primary transition-colors leading-tight truncate">{product.name}</CardTitle>
        </Link>
        {product.vendor_id && product.vendors?.store_name && (
            <Link href={`/vendors/${product.vendor_id}`} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                by {product.vendors.store_name}
            </Link>
        )}
        <CardDescription className="mt-1 text-xs text-muted-foreground truncate">
          {product.description}
        </CardDescription>
        {/* Display Average Rating and Review Count */}
        {(product.average_rating !== undefined && product.average_rating > 0 && product.review_count !== undefined) ? (
          <div className="mt-1.5 flex items-center">
            <StarRatingDisplay rating={product.average_rating} size={14} />
            <span className="ml-1.5 text-xs text-muted-foreground">({product.review_count})</span>
          </div>
        ) : (
          <div className="mt-1.5 h-[18px]"> {/* Placeholder for height consistency if no reviews */}
            <span className="text-xs text-muted-foreground italic">No reviews yet</span>
          </div>
        )}
        <p className="mt-1 text-md font-bold text-foreground">GH₵{product.price.toFixed(2)}</p>
      </CardContent>
      <CardFooter className="p-2 pt-1">
        <div className="flex gap-2 w-full">
            <Button
                onClick={handleAddToCart}
                className="flex-grow"
                size="sm"
                aria-label={product.stock > 0 ? `Add ${product.name} to cart` : `${product.name} is out of stock`}
                disabled={product.stock === 0 && currentUser !== null} // Only disable if out of stock AND user is logged in. If user not logged in, button leads to login.
                title={product.stock > 0 ? 'Add to Cart' : (currentUser ? 'Out of Stock' : 'Login to Add to Cart')}
            >
                <ShoppingCart />
                <span className="hidden sm:inline">
                    {product.stock > 0 ? 'Add to Cart' : (currentUser ? 'Out of Stock' : 'Add to Cart')}
                </span>
            </Button>
            <Button
                variant="outline"
                size="iconSm"
                onClick={handleWishlistToggle}
                aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                className="shrink-0"
                title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            >
                <Heart className={`h-4 w-4 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
