"use client";

import CategoryForm from '@/components/admin/CategoryForm';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function NewCategoryPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/auth/login?redirect=/admin/categories/new');
    }
  }, [currentUser, loadingUser, router]);

  if (!isClient || loadingUser || (!currentUser && !loadingUser)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading or redirecting...</p>
      </div>
    );
  }

  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-semibold text-destructive">Access Denied</h1>
        <p className="text-muted-foreground mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/categories"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Category List</Link>
      </Button>
      <CategoryForm />
    </div>
  );
}
