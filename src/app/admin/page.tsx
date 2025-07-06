
"use client";

import { useEffect, useState } from 'react';
import AdminStatsCard from '@/components/admin/AdminStatsCard';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { Users, DollarSign, LayoutDashboard, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui/spinner';

export default function AdminDashboardPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/auth/login?redirect=/admin');
    }
  }, [currentUser, loadingUser, router]);

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      const fetchStats = async () => {
        setLoadingStats(true);
        setError(null);
        try {
          // Fetch total customers (count user_profiles with role 'customer')
          const { count: customerCount, error: customerError } = await supabase
            .from('user_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('role', 'customer');
          if (customerError) {
            console.warn("Could not fetch customer count:", customerError.message);
            setError(prev => prev ? `${prev}\nCustomers: ${customerError.message}` : `Customers: ${customerError.message}`);
          } else {
            setTotalCustomers(customerCount || 0);
          }

          // Fetch total revenue
          // For now, it will remain 0 as it is not fully implemented.
          // Example:
          // const { data: revenueData, error: revenueError } = await supabase
          //   .from('orders')
          //   .select('total_amount')
          //   .eq('status', 'Delivered');
          // if (revenueError) throw new Error(`Revenue: ${revenueError.message}`);
          // const calculatedRevenue = revenueData?.reduce((sum, order) => sum + order.total_amount, 0) || 0;
          // setTotalRevenue(calculatedRevenue);


        } catch (err) {
          if (err instanceof Error) setError(prev => prev ? `${prev}\n${err.message}`: err.message);
          else setError("An unknown error occurred fetching admin stats.");
          console.error("Admin stats fetch error:", err);
        } finally {
          setLoadingStats(false);
        }
      };
      fetchStats();
    }
  }, [currentUser]);


  if (!isClient || loadingUser || (!currentUser && !loadingUser)) {
    return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading admin dashboard...</p>
        </div>
    );
  }

  if (isClient && currentUser && currentUser.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  if (loadingStats && isClient) {
      return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
            <p className="ml-4 text-lg text-muted-foreground">Loading admin statistics...</p>
        </div>
    );
  }

  if (error && isClient) {
    return (
        <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold">Could not load all admin data</h2>
          <pre className="whitespace-pre-wrap text-sm">{error}</pre>
          <p className="mt-2 text-sm">Please check your Supabase connection and table permissions (user_profiles).</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
         <h1 className="text-xl xs:text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold flex items-center gap-2"><LayoutDashboard size={30}/> Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <AdminStatsCard title="Total Revenue" value={`GH₵${totalRevenue.toFixed(2)}`} icon={DollarSign} description="All time revenue (Not Implemented)" />
        <AdminStatsCard title="Total Customers" value={totalCustomers} icon={Users} description="Registered customers" />
      </div>
    </div>
  );
}
