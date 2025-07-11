
"use client";

import BlogPostForm from '@/components/admin/BlogPostForm';
import type { BlogPost } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Spinner } from '@/components/ui/spinner';

interface PageParams {
  id: string;
}

interface EditBlogPostPageProps {
  params: Promise<PageParams>;
}

export default function EditBlogPostPage({ params: paramsPromise }: EditBlogPostPageProps) {
  const params = use(paramsPromise);
  const { id } = params;

  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push(`/auth/login?redirect=/admin/blog/${id}/edit`);
      return;
    }

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: supabaseError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('id', id)
          .single();

        if (supabaseError) throw supabaseError;
        
        if (data) {
          setPost(data as BlogPost);
        } else {
          setError("Blog post not found in database.");
        }
      } catch (err: any) {
        setError(err.message || "Failed to fetch post details.");
        console.error("Error fetching post:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id && currentUser?.role === 'admin') {
      fetchPost();
    }
  }, [currentUser, loadingUser, router, id]);

  if (loadingUser || isLoading) {
     return (
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
            <Spinner className="h-12 w-12 text-primary" />
        </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
         <AlertTriangle className="mx-auto h-12 w-12 mb-4 text-red-500" />
        <h1 className="text-2xl font-semibold">Error Loading Post</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
         <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog Posts</Link>
        </Button>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="text-center py-10">
        <h1 className="text-2xl font-semibold">Blog post not found</h1>
        <Button asChild size="sm" className="mt-4" variant="outline">
            <Link href="/admin/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog Posts</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <Button variant="outline" size="sm" asChild>
            <Link href="/admin/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog Posts</Link>
        </Button>
        <BlogPostForm post={post} />
    </div>
  );
}
