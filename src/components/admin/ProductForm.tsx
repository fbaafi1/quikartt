
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import React, { useState, useEffect, ChangeEvent, useRef } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import type { Product, Category, Vendor } from "@/lib/types";
import { useUser } from "@/contexts/UserContext";
import { Loader2, Image as ImageIcon, UploadCloud, AlertTriangle, EyeOff, Check, ChevronsUpDown, X, Calendar, Ban } from "lucide-react";
import { useRouter } from "next/navigation";
import NextImage from 'next/image';
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_IMAGES = 4;

const productFormSchema = z.object({
  name: z.string().min(3, { message: "Product name must be at least 3 characters." }),
  description: z.string().min(10, { message: "Description must be at least 10 characters." }),
  price: z.coerce.number().min(0.01, { message: "Price must be positive." }),
  categoryId: z.string({ required_error: "Please select a subcategory." }).min(1, { message: "Please select a subcategory." }),
  vendor_id: z.string({ required_error: "Please assign a vendor." }).nullable(),
  stock: z.coerce.number().min(0, { message: "Stock cannot be negative." }),
  images: z.array(z.any())
    .min(1, { message: "Please upload at least one image." })
    .max(MAX_IMAGES, { message: `You can upload a maximum of ${MAX_IMAGES} images.` }),
});


type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductFormProps {
  product?: Product;
}

const getImageSrcAndHint = (imageString?: string) => {
  if (!imageString) return { src: null, hint: null };
  const parts = imageString.split('" data-ai-hint="');
  const src = parts[0];
  const hint = parts[1]?.replace('"', '').trim() || null;
  return { src, hint };
};


export default function ProductForm({ product }: ProductFormProps) {
  const { currentUser } = useUser();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isFetchingDeps, setIsFetchingDeps] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [vendorComboboxOpen, setVendorComboboxOpen] = useState(false);
  const [selectedMainCategoryId, setSelectedMainCategoryId] = useState<string | null>(null);

  // State for vendor subscription status
  const [isSubscriptionActive, setIsSubscriptionActive] = useState(false);
  const [subscriptionMessage, setSubscriptionMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!product;
  const isVendorUser = currentUser?.role === 'vendor';

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: product?.name || "",
      description: product?.description || "",
      price: product?.price || 0,
      categoryId: product?.categoryId || "",
      vendor_id: product?.vendor_id || null,
      stock: product?.stock || 0,
      images: product?.images || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "images",
  });
  
  const images = form.watch("images");

  const mainCategories = React.useMemo(() => {
    return allCategories.filter(c => !c.parent_id && c.is_visible);
  }, [allCategories]);

  const subCategories = React.useMemo(() => {
      if (!selectedMainCategoryId) return [];
      return allCategories.filter(c => c.parent_id === selectedMainCategoryId && c.is_visible);
  }, [allCategories, selectedMainCategoryId]);

  useEffect(() => {
    const fetchDependencies = async () => {
      if (!currentUser) return;
      setIsFetchingDeps(true);
      setFetchError(null);
      try {
        const categoriesRes = await supabase.from('categories').select('id, name, is_visible, parent_id').order('name');
        if (categoriesRes.error) throw new Error(`Categories: ${categoriesRes.error.message}`);
        
        const allFetchedCategories = categoriesRes.data || [];
        setAllCategories(allFetchedCategories);

        if (isEditing && product?.categoryId) {
            const currentSubcategory = allFetchedCategories.find(c => c.id === product.categoryId);
            if (currentSubcategory?.parent_id) {
                setSelectedMainCategoryId(currentSubcategory.parent_id);
            }
        }
        
        if (isVendorUser) {
           const { data: vendorData, error: vendorError } = await supabase
            .from('vendors')
            .select('id, store_name, subscription_start_date, subscription_end_date')
            .eq('user_id', currentUser.id)
            .single();

           if (vendorError) throw new Error(`Your vendor profile could not be found. ${vendorError.message}`);
           
           if(vendorData) {
                setVendors([vendorData]);
                form.setValue('vendor_id', vendorData.id);

                const now = new Date();
                const startDate = vendorData.subscription_start_date ? new Date(vendorData.subscription_start_date) : null;
                const endDate = vendorData.subscription_end_date ? new Date(vendorData.subscription_end_date) : null;
                
                const hasStarted = startDate === null || startDate <= now;
                const hasEnded = endDate !== null && endDate < now;
                
                if (hasEnded) {
                    setIsSubscriptionActive(false);
                    setSubscriptionMessage(`Your subscription ended on ${format(endDate, 'PPP')}.`);
                } else if (!hasStarted) {
                    setIsSubscriptionActive(false);
                    setSubscriptionMessage(`Your subscription has not started yet. It begins on ${format(startDate!, 'PPP')}.`);
                } else {
                    setIsSubscriptionActive(true);
                    setSubscriptionMessage(null);
                }
           } else {
                setIsSubscriptionActive(false);
                setSubscriptionMessage("Could not verify your vendor status.");
           }
        } else {
           // Admin user logic
           const vendorsRes = await supabase.from('vendors').select('id, store_name').order('store_name');
           if (vendorsRes.error) throw new Error(`Vendors: ${vendorsRes.error.message}`);
           setVendors(vendorsRes.data || []);
           setIsSubscriptionActive(true); // Admins can always edit
        }

      } catch (err: any) {
        setFetchError(err.message || "Failed to fetch dependencies.");
        console.error("Error fetching dependencies", err.message);
      } finally {
        setIsFetchingDeps(false);
      }
    };
    fetchDependencies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, currentUser, isVendorUser, isEditing]);
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => ACCEPTED_IMAGE_TYPES.includes(file.type));
    
    if (files.length !== validFiles.length) {
        console.warn("Invalid File Type: Some files were not valid image types (PNG, JPG, WEBP) and were ignored.");
    }
    
    const currentImageCount = fields.length;
    const canUploadCount = MAX_IMAGES - currentImageCount;

    if (validFiles.length > canUploadCount) {
        console.warn(`Image Limit Exceeded: You can only add ${canUploadCount} more image(s).`);
    }

    const filesToAppend = validFiles.slice(0, canUploadCount);
    append(filesToAppend);

    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  async function onSubmit(values: ProductFormValues) {
    setIsLoading(true);

    const fileToDataUri = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    };
    
    const finalImageStrings: string[] = [];
    try {
        for (const image of values.images) {
            if (typeof image === 'string') {
                finalImageStrings.push(image);
            } else if (image instanceof File) {
                const dataUri = await fileToDataUri(image);
                const hintForImage = (values.name || product?.name || 'product').split(" ").slice(0, 2).join(" ").toLowerCase();
                finalImageStrings.push(`${dataUri}" data-ai-hint="${hintForImage}"`);
            }
        }
    } catch (error: any) {
         console.error("Image Processing Failed", "Could not read one of the selected image files.");
         setIsLoading(false);
         return;
    }


    const productDataForSupabase = {
      name: values.name,
      description: values.description,
      price: values.price,
      category_id: values.categoryId,
      vendor_id: values.vendor_id,
      stock: values.stock,
      images: finalImageStrings,
    };

    try {
      if (product) {
        const { error } = await supabase.from('products').update(productDataForSupabase).eq('id', product.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([productDataForSupabase]);
        if (error) throw error;
      }
      router.push(isVendorUser ? '/vendor/products' : '/admin/products');
      router.refresh();
    } catch (error: any) {
      console.error("Database Submission Error", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetchingDeps) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="mr-2 h-6 w-6 animate-spin" /> Loading form data...
      </div>
    );
  }
  if (fetchError) {
     return (
      <div className="text-center py-10 text-red-500 bg-red-50 p-4 rounded-md">
          <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
          <h2 className="text-xl font-semibold">Could not load form data</h2>
          <p>{fetchError}</p>
      </div>
    );
  }
  
  if (isVendorUser && !isSubscriptionActive) {
    return (
      <Card className="max-w-2xl mx-auto text-center">
        <CardHeader>
            <div className="mx-auto bg-destructive/10 p-4 rounded-full w-fit">
                <Ban className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle className="mt-4">Product Management Locked</CardTitle>
            <CardDescription className="text-destructive">
                {subscriptionMessage || "Your subscription is not currently active."}
            </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                You cannot add or edit products at this time. Please contact support if you believe this is an error.
            </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{product ? "Edit Product" : "Add New Product"}</CardTitle>
        <CardDescription>
          {product ? "Update the details of the existing product." : "Fill in the details to add a new product."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Product Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Wireless Headphones" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Detailed product description..." {...field} rows={5} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (GH₵)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} min="0.01" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <FormField
                  control={form.control}
                  name="vendor_id"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Vendor</FormLabel>
                      <Popover open={vendorComboboxOpen} onOpenChange={setVendorComboboxOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={isVendorUser}
                              className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                            >
                              {field.value
                                ? vendors.find((v) => v.id === field.value)?.store_name
                                : "Select a vendor"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search vendors..." />
                             <CommandList>
                              <CommandEmpty>No vendor found.</CommandEmpty>
                              <CommandGroup>
                                {vendors.map((v) => (
                                  <CommandItem
                                    value={v.store_name}
                                    key={v.id}
                                    onSelect={() => {
                                      form.setValue("vendor_id", v.id);
                                      setVendorComboboxOpen(false);
                                    }}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", v.id === field.value ? "opacity-100" : "opacity-0")} />
                                    {v.store_name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                             </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                       {isVendorUser && <FormDescription>Your products are automatically assigned to your store.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="space-y-2"> {/* Wrapper for category dropdowns */}
                    {/* Main Category */}
                    <FormItem>
                      <FormLabel>Main Category</FormLabel>
                      <Select
                        value={selectedMainCategoryId || ''}
                        onValueChange={(value) => {
                          setSelectedMainCategoryId(value);
                          form.setValue('categoryId', ''); // Reset subcategory
                        }}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select main category..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mainCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                </div>
            </div>
            {/* Subcategory dropdown appears below, spanning full width if needed */}
            <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || ''}
                      disabled={!selectedMainCategoryId || subCategories.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subcategory..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subCategories.map(subCat => (
                          <SelectItem key={subCat.id} value={subCat.id}>{subCat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                        {subCategories.length === 0 && selectedMainCategoryId ? "This main category has no subcategories." : "Select the product's specific category."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
             <FormField
                control={form.control}
                name="images"
                render={() => (
                <FormItem>
                    <FormLabel>Product Images</FormLabel>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {fields.map((field, index) => {
                            const imageValue = images[index];
                            const previewUrl = typeof imageValue === 'string'
                                ? getImageSrcAndHint(imageValue as string).src
                                : (imageValue instanceof File ? URL.createObjectURL(imageValue) : null);
                            
                            return (
                                <div key={field.id} className="relative aspect-square w-full">
                                    {previewUrl ? (
                                        <NextImage
                                            src={previewUrl}
                                            alt={`Product image ${index + 1}`}
                                            fill
                                            sizes="(max-width: 768px) 50vw, 25vw"
                                            className="object-cover rounded-md border"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-muted rounded-md flex items-center justify-center">
                                            <ImageIcon className="w-10 h-10 text-muted-foreground" />
                                        </div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute -top-2 -right-2 h-6 w-6 rounded-full z-10"
                                        onClick={() => remove(index)}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            );
                        })}

                        {fields.length < MAX_IMAGES && (
                            <div
                                className="aspect-square w-full flex items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center text-muted-foreground">
                                    <UploadCloud className="w-8 h-8 mx-auto mb-2" />
                                    <p className="text-sm font-semibold">Add Image</p>
                                    <p className="text-xs">{`${fields.length} / ${MAX_IMAGES}`}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <FormControl>
                        <Input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            multiple
                            onChange={handleFileChange}
                            disabled={fields.length >= MAX_IMAGES}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <Button type="submit" disabled={isLoading || isFetchingDeps} className="w-full md:w-auto">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {product ? "Save Changes" : "Add Product"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
