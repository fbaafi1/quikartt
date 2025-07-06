
"use client";

import BlogPostForm from '@/components/admin/BlogPostForm';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

export default function NewBlogPostPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/auth/login?redirect=/admin/blog/new');
    }
  }, [currentUser, loadingUser, router]);

  if (!isClient || loadingUser || (!currentUser && !loadingUser)) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Button variant="outline" size="sm" asChild>
        <Link href="/admin/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog Posts</Link>
      </Button>
      <BlogPostForm />
    </div>
  );
}
