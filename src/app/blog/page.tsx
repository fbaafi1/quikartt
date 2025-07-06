"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { BlogPost } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { Rss } from 'lucide-react';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      
      if (data) {
        setPosts(data);
      }
      if (error) {
        console.error("Failed to fetch blog posts:", error.message);
      }
      setIsLoading(false);
    };
    fetchPosts();
  }, []);

  if (isLoading) {
    return (
       <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading latest posts...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-primary">The QuiKart Blog</h1>
        <p className="text-lg text-muted-foreground mt-2">News, tips, and stories from our vibrant marketplace.</p>
      </div>
      
      {posts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} passHref>
              <Card className="flex flex-col overflow-hidden group h-full cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <CardHeader className="p-0">
                    <div className="aspect-video relative overflow-hidden">
                    <Image 
                        src={post.image_url || "https://placehold.co/600x400.png"} 
                        alt={post.title}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        data-ai-hint="blog post image"
                    />
                    </div>
                </CardHeader>
                <CardContent className="p-4 flex-grow">
                  <CardTitle className="text-lg leading-tight text-foreground transition-colors group-hover:text-primary">{post.title}</CardTitle>
                  <CardDescription className="mt-2 text-sm">{post.excerpt}</CardDescription>
                </CardContent>
                <CardFooter className="p-4 pt-0 text-xs text-muted-foreground flex justify-between">
                  <span>By {post.author || "QuiKart"}</span>
                  <span>{post.created_at ? format(new Date(post.created_at), "PP") : ''}</span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border-2 border-dashed border-muted-foreground/30 rounded-lg">
            <Rss className="mx-auto h-20 w-20 text-muted-foreground mb-6"/>
            <h2 className="text-2xl font-semibold text-muted-foreground">No posts yet!</h2>
            <p className="text-muted-foreground mt-2 mb-6">There are currently no articles on our blog. Please check back soon!</p>
        </div>
      )}
    </div>
  );
}
