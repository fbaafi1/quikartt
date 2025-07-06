
"use client";

import type { Category } from '@/lib/types';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { SheetClose } from '@/components/ui/sheet';

interface CategoryFilterProps {
  categories: Category[];
  onClearFilters: () => void;
}

export default function CategoryFilter({ categories, onClearFilters }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <SheetClose asChild>
        <Button
          variant='outline'
          onClick={onClearFilters}
          className="rounded-full px-4 py-1 h-auto text-sm"
        >
          All Products
        </Button>
      </SheetClose>
      {categories.map(category => (
        <SheetClose asChild key={category.id}>
            <Button
              variant={'outline'}
              className="rounded-full px-4 py-1 h-auto text-sm"
              asChild
            >
              <Link href={`/products/category/${category.id}`}>
                {category.name}
              </Link>
            </Button>
        </SheetClose>
      ))}
    </div>
  );
}
