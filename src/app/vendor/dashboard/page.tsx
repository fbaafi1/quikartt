
"use client";

import { useUser } from '@/contexts/UserContext';
import { LayoutDashboard, Package, ClipboardList, AlertTriangle, List } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { differenceInDays, format } from 'date-fns';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Product } from '@/lib/types';
import { Button } from '@/components/ui/button';

interface VendorDetails {
  subscription_end_date: string | null;
}

const LOW_STOCK_THRESHOLD = 5;

export default function VendorDashboardPage() {
  const { currentUser } = useUser();
  const [vendorDetails, setVendorDetails] = useState<VendorDetails | null>(null);
  const [daysRemaining, setDaysRemaining] = useState<number | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'vendor' && currentUser.id) {
      const fetchVendorData = async () => {
        setIsLoadingInventory(true);
        try {
          const { data: vendorData, error: vendorError } = await supabase
            .from('vendors')
            .select('id, subscription_end_date')
            .eq('user_id', currentUser.id)
            .single();

          if (vendorError) {
            throw new Error(`Failed to fetch vendor details: ${vendorError.message}`);
          }
          
          if (vendorData) {
            setVendorDetails(vendorData);
            if (vendorData.subscription_end_date) {
                const endDate = new Date(vendorData.subscription_end_date);
                const now = new Date();
                if (endDate >= now) {
                    const remaining = differenceInDays(endDate, now);
                    setDaysRemaining(remaining);
                } else {
                    setDaysRemaining(-1);
                }
            }
            
            // Fetch products for inventory check using the vendor's ID
            const { data: productsData, error: productsError } = await supabase
              .from('products')
              .select('id, name, stock')
              .eq('vendor_id', vendorData.id)
              .lte('stock', LOW_STOCK_THRESHOLD);

            if (productsError) {
              console.error("Failed to fetch low stock products:", productsError.message);
            } else {
              setLowStockProducts(productsData || []);
            }
          }
        } catch (error: any) {
            console.error(error.message);
        } finally {
            setIsLoadingInventory(false);
        }
      };

      fetchVendorData();
    }
  }, [currentUser]);
  
  const showExpiryWarning = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 14;

  return (
    <div>
      <div className="flex items-center justify-between">
         <h1 className="text-xl xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <LayoutDashboard size={30}/> Vendor Dashboard
         </h1>
      </div>
      <p className="text-muted-foreground mt-2">
        Welcome back, {currentUser?.name || 'Vendor'}! Manage your store from here.
      </p>

      {/* Subscription Warning Notification */}
      {showExpiryWarning && vendorDetails?.subscription_end_date && (
        <Alert variant="destructive" className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Subscription Expiring Soon!</AlertTitle>
          <AlertDescription>
            Your subscription will expire in <strong>{daysRemaining} day{daysRemaining !== 1 ? 's' : ''}</strong> on {format(new Date(vendorDetails.subscription_end_date), 'PPP')}. Please contact support to renew.
          </AlertDescription>
        </Alert>
      )}

      {/* Low Stock Warning Notification */}
      {!isLoadingInventory && lowStockProducts.length > 0 && (
        <Alert variant="default" className="mt-6 border-yellow-500 text-yellow-800 [&>svg]:text-yellow-600">
           <AlertTriangle className="h-4 w-4" />
           <AlertTitle className="text-yellow-900 font-semibold">Inventory Alert: Low Stock</AlertTitle>
           <AlertDescription>
              <p className="mb-2">The following products are running low (stock is {LOW_STOCK_THRESHOLD} or less):</p>
              <ul className="list-disc pl-5 space-y-1 mb-3">
                  {lowStockProducts.map(product => (
                      <li key={product.id}>
                          <strong>{product.name}</strong> - {product.stock} unit(s) left
                      </li>
                  ))}
              </ul>
              <Button asChild variant="link" className="p-0 h-auto text-yellow-900 font-semibold">
                <Link href="/vendor/products">Update Stock Now</Link>
              </Button>
           </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        <Link href="/vendor/products">
            <Card className="shadow-lg hover:shadow-xl hover:border-primary transition-all duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                My Products
                </CardTitle>
                <Package className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">Manage</div>
                <p className="text-xs text-muted-foreground mt-1">Add, edit, and view your products</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/vendor/orders">
            <Card className="shadow-lg hover:shadow-xl hover:border-primary transition-all duration-300 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                My Orders
                </CardTitle>
                <ClipboardList className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-foreground">View</div>
                <p className="text-xs text-muted-foreground mt-1">See all orders containing your items</p>
            </CardContent>
            </Card>
        </Link>
      </div>

       <div className="mt-12 p-4 bg-accent/20 border-l-4 border-accent rounded-md">
            <h3 className="font-semibold">Getting Started</h3>
            <p className="text-sm text-muted-foreground">
                Use the links above to manage your products and view incoming orders. Make sure your product information is accurate and up-to-date to attract more customers.
            </p>
       </div>
    </div>
  );
}
