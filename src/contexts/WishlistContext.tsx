
"use client";

import type { Product } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserContext';
import { useRouter } from 'next/navigation';

interface WishlistContextType {
  wishlistItems: Product[];
  addToWishlist: (product: Product) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  itemCount: number;
  isLoadingWishlist: boolean;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider = ({ children }: { children: ReactNode }) => {
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(true);
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();

  const fetchWishlist = useCallback(async () => {
    if (!currentUser) {
      setWishlistItems([]);
      setIsLoadingWishlist(false);
      return;
    }
    setIsLoadingWishlist(true);
    try {
      // Step 1: Get all product_ids from the user's wishlist
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist_items')
        .select('product_id')
        .eq('user_id', currentUser.id);

      if (wishlistError) throw wishlistError;

      if (!wishlistData || wishlistData.length === 0) {
        setWishlistItems([]);
        setIsLoadingWishlist(false);
        return;
      }
      
      const productIds = wishlistData.map(item => item.product_id);

      // Step 2: Fetch all products corresponding to those IDs.
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          name,
          description,
          price,
          images,
          stock,
          categoryId: category_id,
          vendor_id,
          average_rating,
          review_count
        `)
        .in('id', productIds);
      
      if (productsError) throw productsError;
      
      setWishlistItems(productsData as Product[] || []);

    } catch (error: any) {
      console.error("Failed to fetch wishlist:", error);
    } finally {
      setIsLoadingWishlist(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!loadingUser) {
      fetchWishlist();
    }
  }, [loadingUser, fetchWishlist]);

  const addToWishlist = async (product: Product) => {
    if (!currentUser) {
      router.push(`/auth/login?redirect=/products/${product.id}`);
      return;
    }

    if (isInWishlist(product.id)) {
        return;
    }

    try {
      const { error } = await supabase
        .from('wishlist_items')
        .insert({ user_id: currentUser.id, product_id: product.id });

      if (error) throw error;

      // Optimistically update UI
      setWishlistItems(prevItems => [...prevItems, product]);
    } catch (error: any) {
      console.error("Error adding to wishlist:", error);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    if (!currentUser) return;

    const itemToRemove = wishlistItems.find(item => item.id === productId);

    // Optimistically update UI
    setWishlistItems(prevItems => prevItems.filter(item => item.id !== productId));
    
    try {
      const { error } = await supabase
        .from('wishlist_items')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('product_id', productId);

      if (error) {
        // Revert UI change if error
        setWishlistItems(prev => itemToRemove ? [...prev, itemToRemove] : prev);
        throw error;
      }
    } catch (error: any) {
      console.error("Error removing from wishlist:", error);
    }
  };

  const isInWishlist = (productId: string) => {
    return wishlistItems.some(item => item.id === productId);
  };

  const itemCount = wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{ wishlistItems, addToWishlist, removeFromWishlist, isInWishlist, itemCount, isLoadingWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error('useWishlist must be used within a WishlistProvider');
  }
  return context;
};
