
"use client";

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useUser } from './UserContext';
import { differenceInDays } from 'date-fns';
import { usePathname } from 'next/navigation';

type NotificationType = 'subscription' | 'inventory' | 'order' | 'admin';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  notificationCount: number;
  isLoadingNotifications: boolean;
  fetchNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(true);
  const { currentUser, loadingUser } = useUser();
  const pathname = usePathname(); // Get the current path to trigger refetches

  const fetchNotifications = useCallback(async () => {
    // Only fetch for logged-in vendors
    if (!currentUser || currentUser.role !== 'vendor') {
      setNotifications([]);
      setIsLoadingNotifications(false);
      return;
    }

    setIsLoadingNotifications(true);
    try {
      // Client-side cleanup of old, read notifications.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      // The RLS policy ensures vendors can only delete their own notifications.
      const { error: deleteError } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('is_read', true)
        .lt('read_at', threeDaysAgo);

      if (deleteError) {
        // Log the error but don't block the user from seeing their other notifications.
        console.warn("Could not clean up old notifications:", deleteError.message);
      }

      const fetchedNotifications: Notification[] = [];

      // Get Vendor ID and subscription details in one go
      const { data: vendorData, error: vendorError } = await supabase
        .from('vendors')
        .select('id, subscription_end_date, updated_at')
        .eq('user_id', currentUser.id)
        .single();

      // If there's no vendor profile, there are no notifications to fetch.
      if (vendorError || !vendorData) {
        setNotifications([]);
        setIsLoadingNotifications(false);
        return;
      }
      const vendorId = vendorData.id;

      // 1. Check for Subscription Expiry
      if (vendorData.subscription_end_date) {
        const endDate = new Date(vendorData.subscription_end_date);
        const now = new Date();
        const daysRemaining = differenceInDays(endDate, now);

        if (daysRemaining >= 0 && daysRemaining <= 14) {
          fetchedNotifications.push({
            id: 'sub_expiry_warning',
            type: 'subscription',
            title: 'Subscription Expiring Soon',
            message: `Your vendor subscription will expire in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.`,
            createdAt: vendorData.updated_at || new Date().toISOString(),
          });
        }
      }
      
      // 2. Fetch Low Stock Products (stock of 5 or less)
      const { data: lowStockData } = await supabase
          .from('products')
          .select('id, name, stock, updated_at')
          .eq('vendor_id', vendorId)
          .lte('stock', 5);

      lowStockData?.forEach(product => {
        fetchedNotifications.push({
          id: `low_stock_${product.id}`,
          type: 'inventory',
          title: 'Low Stock Alert',
          message: `Your product "${product.name}" is running low (${product.stock} units left).`,
          createdAt: product.updated_at || new Date().toISOString(),
        });
      });

      // 3. Fetch New Orders from the last 7 days
      const { data: newOrdersData } = await supabase
          .from('order_items')
          .select('order_id, created_at, products!inner(name)')
          .eq('products.vendor_id', vendorId)
          .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      const uniqueOrders = new Map<string, {createdAt: string, productName: string}>();
      newOrdersData?.forEach(item => {
        if (!uniqueOrders.has(item.order_id)) {
          uniqueOrders.set(item.order_id, {
            createdAt: item.created_at,
            productName: (item.products as any)?.name || 'your product'
          });
        }
      });

      uniqueOrders.forEach((details, orderId) => {
         fetchedNotifications.push({
            id: `new_order_${orderId}`,
            type: 'order',
            title: 'New Order Received',
            message: `You have a new order (#${orderId.substring(0,8)}) containing "${details.productName}".`,
            createdAt: details.createdAt
        });
      });

      // 4. Fetch Admin-sent notifications
      const { data: adminNotifications, error: adminError } = await supabase
        .from('admin_notifications')
        .select('id, title, message, created_at, is_read') // Fetch is_read status
        .eq('vendor_id', vendorId)
        .order('created_at', { ascending: false })
        .limit(20); // Fetch recent messages regardless of read status
      
      if(adminError) {
        console.error("Failed to fetch admin notifications:", adminError);
      } else if (adminNotifications) {
        // Add all fetched admin notifications to the display list
        adminNotifications.forEach(msg => {
            fetchedNotifications.push({
                id: `admin_msg_${msg.id}`,
                type: 'admin',
                title: msg.title,
                message: msg.message,
                createdAt: msg.created_at,
            });
        });

        // If on the notifications page, mark the unread ones as read in the DB
        if (pathname === '/vendor/notifications') {
            const unreadIds = adminNotifications
                .filter(msg => !msg.is_read)
                .map(msg => msg.id);
            
            if (unreadIds.length > 0) {
                // Fire-and-forget this update.
                supabase
                    .from('admin_notifications')
                    .update({ is_read: true, read_at: new Date().toISOString() })
                    .in('id', unreadIds)
                    .then(({ error: updateError }) => {
                        if (updateError) {
                            console.error("Failed to mark notifications as read:", updateError);
                        } else {
                            console.log("Marked notifications as read:", unreadIds);
                        }
                    });
            }
        }
      }


      // Sort all collected notifications by date
      fetchedNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setNotifications(fetchedNotifications);

    } catch (error: any) {
      console.error("Failed to fetch notifications:", error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [currentUser, pathname]); // Add pathname to dependency array

  // Re-fetch notifications when the user logs in/out OR when the page route changes
  useEffect(() => {
    if (!loadingUser) {
      fetchNotifications();
    }
  }, [loadingUser, fetchNotifications, pathname]); // Added pathname dependency

  return (
    <NotificationContext.Provider
      value={{ notifications, notificationCount: notifications.length, isLoadingNotifications, fetchNotifications }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
