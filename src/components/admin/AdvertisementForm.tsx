
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect, ChangeEvent } from "react";
import type { Advertisement } from "@/lib/types";
import { UploadCloud, Video, FileImage } from "lucide-react";
import { useRouter } from "next/navigation";
import NextImage from 'next/image';
import { supabase } from "@/lib/supabaseClient";
import { Spinner } from "../ui/spinner";

const ACCEPTED_MEDIA_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "video/mp4", "video/webm"];

const advertisementFormSchemaBase = z.object({
  title: z.string().min(3, { message: "Advertisement title must be at least 3 characters." }),
  link_url: z.string().url({ message: "Please enter a valid URL for the link." }).optional().or(z.literal('')),
  is_active: z.boolean().default(true),
  mediaFile: z
    .instanceof(File)
    .optional()
    .refine(
      (file) => !file || ACCEPTED_MEDIA_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png, .webp, .mp4, .webm formats are supported."
    ),
});

// Define a refined schema that makes mediaFile required when creating new ad (advertisement prop is undefined)
const advertisementFormSchema = (isEditing: boolean) => advertisementFormSchemaBase.superRefine((data, ctx) => {
  if (!isEditing && !data.mediaFile) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A media file (image or video) is required for new advertisements.",
      path: ["mediaFile"],
    });
  }
});


type AdvertisementFormValues = z.infer<typeof advertisementFormSchemaBase>;

interface AdvertisementFormProps {
  advertisement?: Advertisement;
}

export default function AdvertisementForm({ advertisement }: AdvertisementFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState<string | null>(null);
  const [currentMediaType, setCurrentMediaType] = useState<'image' | 'video' | null>(null);

  const isEditing = !!advertisement;

  const form = useForm<AdvertisementFormValues>({
    resolver: zodResolver(advertisementFormSchema(isEditing)),
    defaultValues: advertisement ? {
      title: advertisement.title,
      link_url: advertisement.link_url || "",
      is_active: advertisement.is_active === undefined ? true : advertisement.is_active,
      mediaFile: undefined, // Will be populated by user action
    } : {
      title: "",
      link_url: "",
      is_active: true,
      mediaFile: undefined,
    },
  });

  useEffect(() => {
    if (advertisement?.media_url && advertisement?.media_type) {
      setMediaPreviewUrl(advertisement.media_url);
      setCurrentMediaType(advertisement.media_type);
    }
  }, [advertisement]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>, fieldChange: (file?: File) => void) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!ACCEPTED_MEDIA_TYPES.includes(file.type)) {
        form.setError("mediaFile", { type: "manual", message: "Unsupported file type. Please upload an image (JPEG, PNG, WEBP) or video (MP4, WEBM)." });
        setMediaPreviewUrl(null);
        setCurrentMediaType(null);
        fieldChange(undefined); // Clear the invalid file
        return;
      }
      
      form.clearErrors("mediaFile"); // Clear previous errors if any
      fieldChange(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviewUrl(reader.result as string);
        setCurrentMediaType(file.type.startsWith('image/') ? 'image' : 'video');
      };
      reader.readAsDataURL(file);
    } else {
      fieldChange(undefined);
      if (advertisement?.media_url && advertisement?.media_type) {
        setMediaPreviewUrl(advertisement.media_url);
        setCurrentMediaType(advertisement.media_type);
      } else {
        setMediaPreviewUrl(null);
        setCurrentMediaType(null);
      }
    }
  };

  async function onSubmit(values: AdvertisementFormValues) {
    setIsLoading(true);

    let newMediaUrl: string | undefined = advertisement?.media_url;
    let newMediaType: 'image' | 'video' | undefined = advertisement?.media_type;
    const oldMediaUrl = advertisement?.media_url; // Keep track of old URL for deletion

    if (values.mediaFile) {
      const file = values.mediaFile;
      const fileExtension = file.name.split('.').pop();
      const fileName = `ad_media_${Date.now()}.${fileExtension}`;
      const filePath = `${fileName}`; // Store directly in bucket root for simplicity, or use folders

      try {
        const { error: uploadError } = await supabase.storage
          .from('advertisement-media') 
          .upload(filePath, file, { upsert: true }); 

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('advertisement-media')
          .getPublicUrl(filePath);

        if (!publicUrlData?.publicUrl) throw new Error("Could not get public URL for uploaded media.");
        
        newMediaUrl = publicUrlData.publicUrl;
        newMediaType = file.type.startsWith('image/') ? 'image' : 'video';

        if (oldMediaUrl && oldMediaUrl !== newMediaUrl) {
            const oldFilePathParts = oldMediaUrl.split('/');
            const oldFileNameInStorage = oldFilePathParts[oldFilePathParts.length -1]; // Get the actual file name
            
            const { error: deleteError } = await supabase.storage
                .from('advertisement-media')
                .remove([oldFileNameInStorage]); // Use the extracted file name for removal
            if (deleteError) {
                console.warn("Failed to delete old ad media from storage:", deleteError.message);
            }
        }

      } catch (error: any) {
        console.error("Media Upload Error", error.message);
        setIsLoading(false);
        return;
      }
    }
    
    if (!newMediaUrl || !newMediaType) { 
        console.error("Media Missing", "Advertisement media is required.");
        setIsLoading(false);
        return;
    }


    const advertisementDataForSupabase = {
      title: values.title,
      media_url: newMediaUrl,
      media_type: newMediaType,
      link_url: values.link_url || null,
      is_active: values.is_active,
    };

    try {
      if (advertisement) {
        const { error: updateError } = await supabase
          .from('advertisements')
          .update({...advertisementDataForSupabase, updated_at: new Date().toISOString()})
          .eq('id', advertisement.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('advertisements')
          .insert([{ ...advertisementDataForSupabase, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
        if (insertError) throw insertError;
      }
      router.push('/admin/advertisements');
      router.refresh();
    } catch (error: any) {
      console.error("Supabase submission error details:", error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{advertisement ? "Edit Advertisement" : "Add New Advertisement"}</CardTitle>
        <CardDescription>
          {advertisement ? "Update the details of this advertisement." : "Fill in the details to create a new advertisement."}
          Upload images (JPG, PNG, WEBP) or videos (MP4, WEBM).
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
                  <FormLabel>Advertisement Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Big Sale Bonanza!" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mediaFile"
              render={({ field: { onChange, value, ...restField }}) => (
                <FormItem>
                  <FormLabel>Advertisement Media (Image or Video)</FormLabel>
                  <FormControl>
                    <Input 
                      type="file" 
                      accept={ACCEPTED_MEDIA_TYPES.join(",")}
                      onChange={(e) => handleFileChange(e, onChange)}
                      {...restField}
                    />
                  </FormControl>
                  <FormDescription>Upload an image (JPG, PNG, WEBP) or video (MP4, WEBM).</FormDescription>
                  {mediaPreviewUrl && (
                    <div className="mt-2 relative w-full aspect-video border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                      {currentMediaType === 'image' ? (
                        <NextImage src={mediaPreviewUrl} alt="Media Preview" fill className="object-contain" data-ai-hint="advertisement media" />
                      ) : currentMediaType === 'video' ? (
                        <video src={mediaPreviewUrl} controls className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-muted-foreground p-4 text-center">
                          <FileImage size={48} className="mx-auto mb-2" />
                          Media preview
                        </div>
                      )}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="link_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/product-page" {...field} />
                  </FormControl>
                  <FormDescription>The page users will be redirected to when they click the ad.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                    <FormDescription>
                      Should this advertisement be currently visible to users?
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
              {isLoading && <Spinner className="mr-2 h-4 w-4" />}
              {advertisement ? "Save Changes" : "Add Advertisement"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
