
"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import type { Category } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { PlusCircle, Edit, Trash2, Tags, AlertTriangle, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';

// Helper to build a category tree from a flat array
const buildCategoryTree = (categories: Category[]): (Category & { subcategories: Category[] })[] => {
  const categoryMap: Record<string, Category & { subcategories: Category[] }> = {};
  const categoryTree: (Category & { subcategories: Category[] })[] = [];

  categories.forEach(category => {
    categoryMap[category.id] = { ...category, subcategories: [] };
  });

  categories.forEach(category => {
    if (category.parent_id && categoryMap[category.parent_id]) {
      categoryMap[category.parent_id].subcategories.push(categoryMap[category.id]);
    } else {
      categoryTree.push(categoryMap[category.id]);
    }
  });
  return categoryTree;
};

// Recursive component to render a row in the category table
const CategoryRow = ({
  category,
  level = 0,
  onEdit,
  onDelete,
  expandedCategories,
  toggleCategoryExpansion,
}: {
  category: Category & { subcategories: Category[] };
  level?: number;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
  expandedCategories: Set<string>;
  toggleCategoryExpansion: (id: string) => void;
}) => {
  const hasSubcategories = category.subcategories && category.subcategories.length > 0;
  const isExpanded = expandedCategories.has(category.id);

  return (
    <>
      <TableRow>
        <TableCell style={{ paddingLeft: `${1 + level * 0.5}rem` }}>
           <div className="flex items-center gap-1">
            {hasSubcategories ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleCategoryExpansion(category.id)}
                className="h-6 w-6 shrink-0"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </Button>
            ) : (
              <span className="inline-block h-6 w-6 shrink-0" /> // Placeholder for alignment
            )}
            <span className="truncate">{category.name}</span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={category.is_visible ? "secondary" : "outline"} className="flex items-center gap-1 w-fit">
            {category.is_visible ? <Eye size={14} /> : <EyeOff size={14} />}
            {category.is_visible ? "Visible" : "Hidden"}
          </Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="icon" onClick={() => onEdit(category)}><Edit className="h-4 w-4" /></Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the category "{category.name}". If this category has subcategories or is assigned to products, deletion will fail. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onDelete(category)}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
      {hasSubcategories && isExpanded && category.subcategories.map(subCat => (
        <CategoryRow
          key={subCat.id}
          category={subCat}
          level={level + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          expandedCategories={expandedCategories}
          toggleCategoryExpansion={toggleCategoryExpansion}
        />
      ))}
    </>
  );
};

export default function AdminCategoriesPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for the EDIT dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryParentId, setCategoryParentId] = useState<string | null>(null);
  const [categoryIsVisible, setCategoryIsVisible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for expanding/collapsing categories
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const toggleCategoryExpansion = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const fetchCategories = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: catError } = await supabase.from('categories').select('*').order('name');
      if (catError) throw catError;
      setCategories(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch categories');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (categories.length > 0) {
        // Default to all parent categories being expanded on initial load
        const parentIds = new Set(
            categories.filter(c => categories.some(child => child.parent_id === c.id)).map(c => c.id)
        );
        setExpandedCategories(parentIds);
    }
  }, [categories]);

  useEffect(() => {
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/auth/login?redirect=/admin/categories');
    } else if (currentUser) {
      fetchCategories();
    }
  }, [currentUser, loadingUser, router, fetchCategories]);

  const categoryTree = useMemo(() => buildCategoryTree(categories), [categories]);
  const parentCategoryOptions = useMemo(() => categories, [categories]);

  const openEditDialog = (category: Category) => {
    setCurrentCategory(category);
    setCategoryName(category.name);
    setCategoryParentId(category.parent_id || null);
    setCategoryIsVisible(category.is_visible);
    setIsEditDialogOpen(true);
  };

  const handleDeleteCategory = async (category: Category) => {
    const hasSubcategories = categories.some(c => c.parent_id === category.id);
    if (hasSubcategories) {
        console.error(`Please delete or reassign the subcategories of "${category.name}" first.`);
        return;
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;
      fetchCategories();
    } catch (err: any) {
      console.error("Error deleting category:", err);
    }
  };

  const handleEditFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCategory) return;
    setIsSubmitting(true);
    
    const categoryData = {
        name: categoryName,
        parent_id: categoryParentId,
        is_visible: categoryIsVisible
    };

    const { error } = await supabase.from('categories').update(categoryData).eq('id', currentCategory.id);

    setIsSubmitting(false);
    if (error) {
        console.error("Submission Error", error.message);
    } else {
        setIsEditDialogOpen(false);
        fetchCategories();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading categories...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h1 className="text-2xl font-semibold">Error Loading Categories</h1>
        <p>{error}</p>
        <Button onClick={fetchCategories} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Tags size={30}/> Category Management</h1>
        <Button asChild>
          <Link href="/admin/categories/new">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Category
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Categories</CardTitle>
          <CardDescription>View, edit, or delete product categories. Subcategories are indented.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryTree.length > 0 ? (
                categoryTree.map(category => (
                  <CategoryRow
                    key={category.id}
                    category={category}
                    onEdit={openEditDialog}
                    onDelete={handleDeleteCategory}
                    expandedCategories={expandedCategories}
                    toggleCategoryExpansion={toggleCategoryExpansion}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-center h-24">No categories created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <form onSubmit={handleEditFormSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Category</DialogTitle>
                <DialogDescription>
                  Update the details for this category.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">Name</Label>
                  <Input id="name" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} className="col-span-3" required/>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="parent" className="text-right">Parent</Label>
                  <Select
                    value={categoryParentId || 'none'}
                    onValueChange={(value) => setCategoryParentId(value === 'none' ? null : value)}
                  >
                    <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select parent..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">None (Main Category)</SelectItem>
                        {parentCategoryOptions
                            // Prevent a category from being its own parent or a child of its own subcategory
                            .filter(opt => opt.id !== currentCategory?.id && opt.parent_id !== currentCategory?.id)
                            .map(cat => (
                                <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                            ))
                        }
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="visible" className="text-right">Visible</Label>
                    <Switch id="visible" checked={categoryIsVisible} onCheckedChange={setCategoryIsVisible} />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                  Save changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
    </div>
  );
}
