"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, ChangeEvent } from "react";
import type { BlogPost } from "@/lib/types";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import NextImage from 'next/image';
import { supabase } from "@/lib/supabaseClient";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const blogPostSchemaBase = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  excerpt: z.string().min(10, "Excerpt must be at least 10 characters.").max(300, "Excerpt must be 300 characters or less."),
  content: z.string().min(50, "Content must be at least 50 characters."),
  author: z.string().min(2, "Author name is required.").optional().or(z.literal('')),
  is_published: z.boolean().default(false),
  imageFile: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp formats are supported."
    ),
});

const blogPostFormSchema = (isEditing: boolean) => blogPostSchemaBase.superRefine((data, ctx) => {
  if (!isEditing && !data.imageFile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A feature image is required for new blog posts.",
      path: ["imageFile"],
    });
  }
});


type BlogPostFormValues = z.infer<typeof blogPostSchemaBase>;

interface BlogPostFormProps {
  post?: BlogPost;
}

export default function BlogPostForm({ post }: BlogPostFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);

  const isEditing = !!post;

  const form = useForm<BlogPostFormValues>({
    resolver: zodResolver(blogPostFormSchema(isEditing)),
    defaultValues: {
      title: post?.title || "",
      excerpt: post?.excerpt || "",
      content: post?.content || "",
      author: post?.author || "",
      is_published: post?.is_published || false,
    },
  });

  useEffect(() => {
    if (post?.image_url) {
      setImagePreviewUrl(post.image_url);
    }
  }, [post]);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, fieldChange: (file?: File) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        form.setError("imageFile", { type: "manual", message: "Unsupported file type." });
        setImagePreviewUrl(null);
        fieldChange(undefined);
        return;
      }
      form.clearErrors("imageFile");
      fieldChange(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      fieldChange(undefined);
      setImagePreviewUrl(post?.image_url || null);
    }
  };
  
  const generateSlug = (title: string) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000); // 4-digit random number
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric characters except spaces and hyphens
      .replace(/\s+/g, '-') // replace spaces with hyphens
      .replace(/-+/g, '-') // replace multiple hyphens with a single one
      .trim()
      + `-${randomSuffix}`;
  };

  async function onSubmit(values: BlogPostFormValues) {
    setIsLoading(true);

    let newImageUrl: string | undefined = post?.image_url;
    const oldImageUrl = post?.image_url;

    if (values.imageFile) {
      const file = values.imageFile;
      const fileExtension = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExtension}`;
      
      const { error: uploadError } = await supabase.storage
        .from('blog-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error("Image Upload Failed", uploadError.message);
        setIsLoading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(fileName);
      newImageUrl = publicUrlData.publicUrl;

      // Delete old image if a new one was uploaded
      if (oldImageUrl && oldImageUrl !== newImageUrl) {
          const oldFileName = oldImageUrl.split('/').pop();
          if (oldFileName) {
            await supabase.storage.from('blog-images').remove([oldFileName]);
          }
      }
    }

    const postDataForDb = {
      title: values.title,
      slug: isEditing ? post.slug : generateSlug(values.title),
      excerpt: values.excerpt,
      content: values.content,
      author: values.author,
      is_published: values.is_published,
      image_url: newImageUrl,
      updated_at: new Date().toISOString(),
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postDataForDb)
          .eq('id', post.id);
        if (error) throw error;
        console.log("Success", "Blog post updated successfully.");
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert({ ...postDataForDb, created_at: new Date().toISOString() });
        if (error) throw error;
        console.log("Success", "New blog post created.");
      }
      router.push('/admin/blog');
      router.refresh();
    } catch (error: any) {
      console.error("Database Error", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{post ? "Edit Blog Post" : "Create New Blog Post"}</CardTitle>
        <CardDescription>
          Fill in the details for the article. The "slug" for the URL will be auto-generated from the title.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input placeholder="e.g., Unlocking the Secrets of Kente Cloth" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="author"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Author</FormLabel>
                  <FormControl><Input placeholder="e.g., QuiKart Team" {...field} value={field.value ?? ''} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Excerpt</FormLabel>
                  <FormControl><Textarea placeholder="A short summary of the blog post..." {...field} value={field.value ?? ''} rows={3} /></FormControl>
                  <FormDescription>This summary appears on the main blog page list.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Content</FormLabel>
                  <FormControl><Textarea placeholder="The main content of your blog post..." {...field} value={field.value ?? ''} rows={10} /></FormControl>
                   <FormDescription>This is the full article content. You can use line breaks.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="imageFile"
              render={({ field: { onChange, ...restField }}) => (
                <FormItem>
                  <FormLabel>Feature Image</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept={ACCEPTED_IMAGE_TYPES.join(",")}
                      onChange={(e) => handleFileChange(e, onChange)}
                      {...restField}
                    />
                  </FormControl>
                  {imagePreviewUrl && (
                    <div className="mt-2 relative w-full aspect-video border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        <NextImage src={imagePreviewUrl} alt="Image Preview" fill className="object-cover" data-ai-hint="blog post image" />
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Publish Status</FormLabel>
                    <FormDescription>
                      Should this post be visible to the public?
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {post ? "Save Changes" : "Create Post"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
