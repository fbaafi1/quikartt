"use client"

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import type { BlogPost } from '@/lib/types';
import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';

interface PageParams {
  slug: string;
}

interface BlogPostPageProps {
  params: Promise<PageParams>;
}

export default function BlogPostPage({ params: paramsPromise }: BlogPostPageProps) {
  const params = use(paramsPromise);
  const { slug } = params;
  const [post, setPost] = useState<BlogPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    const fetchPost = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { data, error: dbError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('slug', slug)
          .eq('is_published', true)
          .single();

        if (dbError) {
          if (dbError.code === 'PGRST116') {
            setError("The blog post you're looking for could not be found.");
          } else {
            throw dbError;
          }
        } else {
          setPost(data);
        }
      } catch (err: any) {
        setError(err.message || 'An error occurred while fetching the post.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
        <h1 className="text-2xl font-semibold text-red-700">Error</h1>
        <p className="text-muted-foreground mt-2">{error}</p>
        <Button asChild size="sm" className="mt-4" variant="outline">
          <Link href="/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog</Link>
        </Button>
      </div>
    );
  }

  if (!post) {
    // This case is largely handled by the error state now, but as a fallback.
    return (
        <div className="text-center py-10">
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-2xl font-semibold">Post Not Found</h1>
            <Button asChild size="sm" className="mt-4" variant="outline">
                <Link href="/blog"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Blog</Link>
            </Button>
      </div>
    );
  }

  return (
    <article className="max-w-3xl mx-auto">
      <div className="mb-8">
        <Button asChild variant="outline" size="sm">
          <Link href="/blog">
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to All Posts
          </Link>
        </Button>
      </div>

      <header className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-primary mb-4">{post.title}</h1>
        <div className="text-sm text-muted-foreground">
          <span>By {post.author || 'QuiKart Team'}</span>
          <span className="mx-2">&bull;</span>
          <span>Published on {post.created_at ? format(new Date(post.created_at), 'PPP') : 'N/A'}</span>
        </div>
      </header>
      
      {post.image_url && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden mb-8 shadow-lg">
          <Image
            src={post.image_url}
            alt={post.title}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
            data-ai-hint="blog post image"
          />
        </div>
      )}

      <div className="space-y-6">
        {post.excerpt && <p className="text-xl leading-relaxed italic text-muted-foreground border-l-4 border-primary pl-4">{post.excerpt}</p>}
        {post.content && <div className="text-lg leading-relaxed whitespace-pre-line text-foreground">
          {post.content}
        </div>}
      </div>
    </article>
  );
}
