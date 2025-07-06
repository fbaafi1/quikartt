"use client";

import { useEffect, useState, use, FormEvent, useRef, TouchEvent } from 'react';
import Image from 'next/image';
import type { Product, Review } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ShoppingCart, ChevronLeft, ChevronRight, ImageIcon, Heart, AlertTriangle, Send } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useUser } from '@/contexts/UserContext';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import StarRatingDisplay from '@/components/ui/StarRatingDisplay';
import StarRatingInput from '@/components/ui/StarRatingInput';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui/spinner';


// Helper function to parse image URL/Data URI and extract AI hint
const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, productName: string = "Product") => {
  let src: string = `https://placehold.co/600x400.png?text=${encodeURIComponent(productName.split(' ').slice(0,1).join('') || 'Product')}`;
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
      src = `https://placehold.co/600x400.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }

  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};

interface PageParams {
  id: string;
}

export default function ProductDetailsPage({ params: paramsPromise }: { params: Promise<PageParams> }) {
  const resolvedParams = use(paramsPromise);
  const { id: productId } = resolvedParams;

  const [product, setProduct] = useState<Product | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { addToCart } = useCart();
  const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
  const { currentUser } = useUser();
  const router = useRouter();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [hasUserReviewed, setHasUserReviewed] = useState(false);

  // Refs for swipe functionality
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const fetchProductAndReviews = async () => {
    if (!productId) {
      setError("Product ID is missing.");
      setIsLoading(false);
      setIsLoadingReviews(false);
      return;
    }
    setIsLoading(true);
    setIsLoadingReviews(true);
    setError(null);

    try {
      // Fetch Product
      const { data: productData, error: productError } = await supabase
        .from('products')
        .select('id, name, description, price, images, stock, categoryId: category_id, average_rating, review_count, vendor_id, vendors(id, store_name)')
        .eq('id', productId)
        .single();

      if (productError) throw productError;
      if (productData) {
        setProduct(productData as Product);
        // Use pre-calculated average_rating and review_count if available from product table
        setAverageRating(productData.average_rating || 0);
        setReviewCount(productData.review_count || 0);
      } else {
        setError("Product not found in database.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch product details.");
      console.error("Error fetching product:", err);
    } finally {
      setIsLoading(false);
    }

    try {
        // Fetch Reviews
        const { data: reviewsData, error: reviewsError } = await supabase
            .from('reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (reviewsError) throw reviewsError;
        setReviews(reviewsData || []);
        
        // If average_rating and review_count were NOT on the product, calculate them (fallback)
        // This is less ideal than the trigger-updated fields on products table.
        if (reviewsData && (!product?.average_rating || !product?.review_count)) {
            const totalRating = reviewsData.reduce((sum, review) => sum + review.rating, 0);
            const numReviews = reviewsData.length;
            setAverageRating(numReviews > 0 ? totalRating / numReviews : 0);
            setReviewCount(numReviews);
        }

    } catch (err: any) {
        console.error("Error fetching reviews:", err);
    } finally {
        setIsLoadingReviews(false);
    }
  };
  
  useEffect(() => {
    fetchProductAndReviews();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  useEffect(() => {
    if (currentUser && reviews.length > 0) {
        const userHasReviewed = reviews.some(review => review.user_id === currentUser.id);
        setHasUserReviewed(userHasReviewed);
    } else if (!currentUser) {
        setHasUserReviewed(false);
    }
  }, [currentUser, reviews]);


  const handleReviewSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      router.push(`/auth/login?redirect=/products/${productId}`);
      return;
    }
    if (userRating === 0) {
      console.error("Rating Required", "Please select a star rating before submitting.");
      return;
    }
    setIsSubmittingReview(true);
    
    // Final check against database to prevent race conditions
    const { data: existingReview, error: checkError } = await supabase
        .from('reviews')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('product_id', productId)
        .limit(1);

    if (checkError) {
        console.error("Error", `Could not verify your review status: ${checkError.message}`);
        setIsSubmittingReview(false);
        return;
    }

    if (existingReview && existingReview.length > 0) {
        console.error("Review Already Submitted", "You have already reviewed this product.");
        setHasUserReviewed(true); // Sync state just in case
        setIsSubmittingReview(false);
        return;
    }

    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('status, order_items(product_id)')
        .eq('user_id', currentUser.id);

      if (ordersError) throw ordersError;

      const hasDeliveredOrderForProduct = ordersData?.some(order =>
        order.status === 'Delivered' && order.order_items.some(item => item.product_id === productId)
      );

      if (!hasDeliveredOrderForProduct) {
        console.error("Review Denied", "You can only review products that you have purchased and had delivered.");
        setIsSubmittingReview(false);
        return;
      }
    } catch (err: any) {
      console.error("Error checking user orders:", err);
    }
    try {
      const { error: reviewInsertError } = await supabase
        .from('reviews')
        .insert({
          product_id: productId,
          user_id: currentUser.id,
          user_name: currentUser.name || 'Anonymous', // Denormalize user name
          rating: userRating,
          comment: userComment,
        });

      if (reviewInsertError) throw reviewInsertError;
      
      console.log("Review Submitted", "Thank you for your feedback!");
      setUserRating(0);
      setUserComment('');
      await fetchProductAndReviews(); 
    } catch (err: any) {
      console.error("Review Submission Failed", err);
    } finally {
      setIsSubmittingReview(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-muted-foreground">Loading product...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error loading product</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="text-muted-foreground mt-2">The product you are looking for does not exist or may have been removed.</p>
        <Button asChild size="sm" className="mt-4">
          <Link href="/">Go to Homepage</Link>
        </Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!product) return;
    if (!currentUser) {
      router.push(`/auth/login?redirect=/products/${productId}`);
      return;
    }
    addToCart(product);
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  const nextImage = () => {
    if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex + 1) % product.images.length);
  };

  const prevImage = () => {
     if (!product || !product.images || product.images.length === 0) return;
    setCurrentImageIndex((prevIndex) => (prevIndex - 1 + product.images.length) % product.images.length);
  };

  const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = 0; // Reset end position on new touch
  };

  const handleTouchMove = (e: TouchEvent<HTMLDivElement>) => {
      touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
      if (touchStartX.current === 0 || touchEndX.current === 0) return;
      
      const threshold = 50; // Min swipe distance
      const swipedDistance = touchStartX.current - touchEndX.current;

      if (swipedDistance > threshold) {
          nextImage();
      } else if (swipedDistance < -threshold) {
          prevImage();
      }
      
      // Reset refs
      touchStartX.current = 0;
      touchEndX.current = 0;
  };

  const { src: currentImageUrl, hint: currentImageHint } = getImageAttributes(product.images?.[currentImageIndex], product.name);
  const inWishlist = isInWishlist(product.id);

  return (
    <div className="space-y-6">
      <div className="container mx-auto px-4">
        <Button variant="outline" size="sm" asChild className="mb-6">
          <Link href="/"><ChevronLeft className="mr-2 h-4 w-4" /> Back to products</Link>
        </Button>
      </div>
      
      <div className="md:grid md:grid-cols-2 md:gap-8 lg:gap-12 container mx-auto px-4">
        {/* Image Column */}
        <div 
          className="relative -mx-4 md:mx-0 aspect-square md:rounded-lg overflow-hidden bg-muted flex items-center justify-center"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
            {currentImageUrl ? (
              <Image
                key={currentImageIndex}
                src={currentImageUrl}
                alt={`${product.name} - Image ${currentImageIndex + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-contain transition-opacity duration-300 ease-in-out"
                data-ai-hint={currentImageHint || "product image"}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageIcon className="w-24 h-24 text-muted-foreground" />
              </div>
            )}

            {(product.images?.length || 0) > 1 && (
                <div className="absolute top-4 right-4 bg-background/70 text-foreground text-sm font-semibold rounded-full px-3 py-1 backdrop-blur-sm shadow-md">
                    {currentImageIndex + 1} / {product.images.length}
                </div>
            )}

          {(product.images?.length || 0) > 1 && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 hover:bg-background/80 shadow-md hidden md:flex"
                onClick={prevImage}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/50 hover:bg-background/80 shadow-md hidden md:flex"
                onClick={nextImage}
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 hidden md:flex gap-2">
                {(product.images || []).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`h-2.5 w-2.5 rounded-full ring-1 ring-offset-1 ring-offset-background/50 ${index === currentImageIndex ? 'bg-primary ring-primary scale-110' : 'bg-muted hover:bg-muted-foreground/50 ring-muted-foreground/30'} transition-all`}
                    aria-label={`Go to image ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Details Column */}
        <div className="flex flex-col mt-6 md:mt-0">
          <div className="space-y-3 md:space-y-4 flex-grow">
            <h1 className="text-2xl lg:text-3xl font-bold text-primary">{product.name}</h1>
            
            {product.vendor_id && product.vendors?.store_name && (
              <p className="text-sm text-muted-foreground">
                  Sold by: <Link href={`/vendors/${product.vendor_id}`} className="font-semibold text-primary hover:underline">{product.vendors.store_name}</Link>
              </p>
            )}
            
            <div className="flex items-center gap-2">
              <StarRatingDisplay rating={averageRating} size={20} />
              {reviewCount > 0 ? (
                <span className="text-sm text-muted-foreground">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</span>
              ) : (
                <span className="text-sm text-muted-foreground">No reviews yet</span>
              )}
            </div>

            <p className="text-3xl lg:text-4xl font-semibold text-foreground">GH₵{product.price.toFixed(2)}</p>
            
            <Badge variant={product.stock > 0 ? "secondary" : "destructive"} className="text-sm py-1 px-3">
              {product.stock > 0 ? `In Stock: ${product.stock} available` : 'Out of Stock'}
            </Badge>
            
            {product.description && (
              <div className="pt-4">
                <h2 className="text-md font-semibold text-foreground mb-2">Product Description</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button
                  onClick={handleAddToCart}
                  className="flex-grow text-lg py-3"
                  size="lg"
                  disabled={product.stock === 0 && currentUser !== null}
                  aria-label={`Add ${product.name} to cart`}
                  title={product.stock > 0 ? 'Add to Cart' : (currentUser ? 'Out of Stock' : 'Login to Add to Cart')}
              >
                  <ShoppingCart className="mr-3 h-5 w-5" /> Add to Cart
              </Button>
              <Button
                  variant="outline"
                  size="iconLg" 
                  onClick={handleWishlistToggle}
                  aria-label={inWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                  title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  className="shrink-0 p-3" 
              >
                  <Heart className={`h-6 w-6 ${inWishlist ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
              </Button>
            </div>
             {product.stock === 0 && currentUser && ( // Only show if user is logged in and product is out of stock
              <p className="text-sm text-destructive mt-3 text-center sm:text-left">This product is currently out of stock.</p>
            )}
          </div>
        </div>
      </div>


      {/* Reviews Section */}
      <div className="container mx-auto px-4 mt-12">
        <h2 className="text-2xl font-semibold mb-2">Customer Reviews & Ratings</h2>
         <div className="flex items-baseline gap-2 mb-4">
            <StarRatingDisplay rating={averageRating} size={24} />
            <p className="text-lg font-bold">{averageRating.toFixed(1)} out of 5</p>
            <p className="text-sm text-muted-foreground">({reviewCount} review{reviewCount !== 1 ? 's' : ''})</p>
         </div>
        <Separator className="my-6"/>

        {/* Submit Review Form */}
        {currentUser && (
          hasUserReviewed ? (
            <Card className="mb-8 shadow-md p-6 text-center bg-accent/20 border border-dashed">
                <h3 className="text-lg font-semibold text-foreground">Thank You!</h3>
                <p className="text-muted-foreground">You have already reviewed this product.</p>
            </Card>
          ) : (
            <Card className="mb-8 shadow-md">
                <CardHeader>
                <CardTitle>Write a Review</CardTitle>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Rating:</label>
                    <StarRatingInput value={userRating} onChange={setUserRating} />
                    </div>
                    <div>
                    <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">Your Review:</label>
                    <Textarea
                        id="comment"
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                        placeholder="Share your thoughts about this product..."
                        rows={4}
                    />
                    </div>
                    <Button type="submit" disabled={isSubmittingReview}>
                    {isSubmittingReview && <Spinner className="mr-2 h-4 w-4" />}
                    Submit Review <Send className="ml-2 h-4 w-4"/>
                    </Button>
                </form>
                </CardContent>
            </Card>
          )
        )}
        {!currentUser && (
            <Card className="mb-8 shadow-md p-6 text-center">
                <p className="text-muted-foreground">
                    <Link href={`/auth/login?redirect=/products/${productId}`} className="text-primary hover:underline font-semibold">Log in</Link> to write a review.
                </p>
            </Card>
        )}


        {/* Display Reviews */}
        {isLoadingReviews ? (
          <div className="text-center py-4">
            <Spinner className="h-8 w-8 text-primary mx-auto" />
            <p className="text-muted-foreground mt-2">Loading reviews...</p>
          </div>
        ) : reviews.length > 0 ? (
          <div className="space-y-6">
            {reviews.map(review => (
              <Card key={review.id} className="p-4 shadow">
                <div className="flex items-center justify-between mb-1">
                    <StarRatingDisplay rating={review.rating} size={16} />
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
                    </p>
                </div>
                {/* Removed user name display */}
                {review.comment && <p className="text-sm text-gray-700 whitespace-pre-line">{review.comment}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No reviews yet. Be the first to review this product!</p>
        )}
      </div>
    </div>
  );
}
