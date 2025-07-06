"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import NextImage from 'next/image';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { BlogPost } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, AlertTriangle, Eye, EyeOff, Rss, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/lib/supabaseClient';
import { format } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';

const ITEMS_PER_PAGE = 10;

export default function AdminBlogPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  const fetchPosts = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;

    setIsLoading(true);
    setError(null);
    try {
      const { count, error: countError } = await supabase
        .from('blog_posts')
        .select('*', { count: 'exact', head: true });

      if (countError) throw countError;
      setTotalPosts(count || 0);

      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error: dbError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (dbError) throw dbError;
      setPosts(data || []);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred fetching blog posts.');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, currentPage]);

  useEffect(() => {
    if (!loadingUser) {
      if (!currentUser || currentUser.role !== 'admin') {
        router.push('/auth/login?redirect=/admin/blog');
      } else {
        fetchPosts();
      }
    }
  }, [currentUser, loadingUser, router, fetchPosts]);

  const handleDeletePost = async (postId: string, postTitle: string, imageUrl: string | null | undefined) => {
    try {
      const { error: deleteDbError } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postId);
      if (deleteDbError) throw deleteDbError;

      if (imageUrl) {
        const bucketName = 'blog-images';
        const fileName = imageUrl.split('/').pop();
        if (fileName) {
          const { error: deleteStorageError } = await supabase.storage
            .from(bucketName)
            .remove([fileName]);
          if (deleteStorageError) {
             console.warn(`DB record for post '${postTitle}' deleted, but failed to delete image from storage: ${deleteStorageError.message}`);
          }
        }
      }
      console.log("Post Deleted", `"${postTitle}" has been deleted.`);
      fetchPosts(); // Refetch to update list and pagination
    } catch (err: any) {
      console.error("Deletion Failed", err.message);
    }
  };

  const handleTogglePublished = async (post: BlogPost) => {
    try {
      const newStatus = !post.is_published;
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({ is_published: newStatus, updated_at: new Date().toISOString() })
        .eq('id', post.id);

      if (updateError) throw updateError;
      
      console.log(`Post ${newStatus ? "Published" : "Unpublished"}`, `"${post.title}" is now ${newStatus ? "visible" : "hidden"}.`);
      fetchPosts(); // Refetch
    } catch (err: any)      {
      console.error("Update Failed", err.message);
    }
  };

  if (loadingUser || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-600 bg-red-50 p-4 rounded-md">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h2 className="text-xl font-semibold">Could not load blog posts</h2>
        <p>{error}</p>
        <Button onClick={fetchPosts} className="mt-4">Try Again</Button>
      </div>
    );
  }
  
  const totalPages = Math.ceil(totalPosts / ITEMS_PER_PAGE);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Rss size={30}/> Blog Management</h1>
        <Button asChild>
          <Link href="/admin/blog/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Post
          </Link>
        </Button>
      </div>

      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>Manage articles on the public blog.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-center">Published</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {posts.length > 0 ? posts.map(post => (
                <TableRow key={post.id}>
                  <TableCell className="font-medium">{post.title}</TableCell>
                  <TableCell>{post.author || 'N/A'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {post.created_at ? format(new Date(post.created_at), "PP") : 'N/A'}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                        id={`publish-switch-${post.id}`}
                        checked={post.is_published}
                        onCheckedChange={() => handleTogglePublished(post)}
                        aria-label={`Toggle ${post.title} published status`}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" asChild title="Edit Post">
                          <Link href={`/admin/blog/${post.id}/edit`}><Edit className="h-4 w-4" /></Link>
                      </Button>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" title="Delete Post"><Trash2 className="h-4 w-4" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                              <AlertDialogTitle>Delete "{post.title}"?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone and will permanently delete the post.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeletePost(post.id, post.title, post.image_url)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    No blog posts found. Click "Add New Post" to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter>
             <div className="flex items-center justify-center space-x-2 w-full mt-6 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </Button>
              <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
