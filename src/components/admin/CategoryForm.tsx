
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState } from "react";
import { Loader2, PlusCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Switch } from "@/components/ui/switch";

const categoryFormSchema = z.object({
  mainCategoryName: z.string().min(2, { message: "Main category name must be at least 2 characters." }),
  isVisible: z.boolean().default(true),
  subcategories: z.array(
    z.object({
      name: z.string().min(2, { message: "Subcategory name must be at least 2 characters." }),
    })
  ).optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function CategoryForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      mainCategoryName: "",
      isVisible: true,
      subcategories: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subcategories",
  });

  async function onSubmit(values: CategoryFormValues) {
    setIsLoading(true);

    try {
      // 1. Insert the main category
      const { data: mainCategoryData, error: mainCategoryError } = await supabase
        .from('categories')
        .insert({
          name: values.mainCategoryName,
          is_visible: values.isVisible,
          parent_id: null,
        })
        .select()
        .single();

      if (mainCategoryError) {
        throw new Error(`Failed to create main category: ${mainCategoryError.message}`);
      }

      if (!mainCategoryData) {
        throw new Error("Could not retrieve the new main category ID after creation.");
      }

      const mainCategoryId = mainCategoryData.id;

      // 2. Insert subcategories if any
      if (values.subcategories && values.subcategories.length > 0) {
        const subcategoriesToInsert = values.subcategories
          .filter(sub => sub.name.trim() !== '') // Ensure we don't insert empty names
          .map(sub => ({
            name: sub.name,
            parent_id: mainCategoryId,
            is_visible: values.isVisible, // Subcategories inherit visibility from parent on creation
          }));
        
        if (subcategoriesToInsert.length > 0) {
            const { error: subcategoriesError } = await supabase
              .from('categories')
              .insert(subcategoriesToInsert);

            if (subcategoriesError) {
              // Attempt to roll back the main category creation for consistency
              await supabase.from('categories').delete().eq('id', mainCategoryId);
              throw new Error(`Failed to create subcategories: ${subcategoriesError.message}. Main category creation was rolled back.`);
            }
        }
      }

      router.push('/admin/categories');
      router.refresh();

    } catch (error: any) {
      console.error("An Error Occurred", error.message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Category & Subcategories</CardTitle>
        <CardDescription>
          Define a new main category and add multiple subcategories to it at once.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="mainCategoryName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Category Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Fashion & Apparel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isVisible"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Visible to Users</FormLabel>
                    <FormDescription>
                      Should this main category and its new subcategories be visible?
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
            
            <div className="space-y-4">
              <FormLabel>Subcategories</FormLabel>
              {fields.map((field, index) => (
                <div key={field.id} className="flex items-center gap-2">
                  <FormField
                    control={form.control}
                    name={`subcategories.${index}.name`}
                    render={({ field }) => (
                      <FormItem className="flex-grow">
                        <FormControl>
                          <Input placeholder={`Subcategory ${index + 1} name`} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ name: "" })}
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Subcategory
              </Button>
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Category
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
