"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Settings, PlusCircle, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import type { BoostPlan } from '@/lib/types';
import { useUser } from '@/contexts/UserContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const boostPlanSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters."),
  description: z.string().optional(),
  duration_days: z.coerce.number().int().min(1, "Duration must be at least 1 day."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  is_active: z.boolean().default(true),
});

type BoostPlanFormValues = z.infer<typeof boostPlanSchema>;

const BoostPlanForm = ({ plan, onFinished }: { plan?: BoostPlan, onFinished: () => void }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<BoostPlanFormValues>({
        resolver: zodResolver(boostPlanSchema),
        defaultValues: {
            name: plan?.name || "",
            description: plan?.description || "",
            duration_days: plan?.duration_days || 7,
            price: plan?.price || 0,
            is_active: plan?.is_active ?? true,
        },
    });

    const onSubmit = async (values: BoostPlanFormValues) => {
        setIsSubmitting(true);
        try {
            if (plan) {
                const { error } = await supabase.from('boost_plans').update(values).eq('id', plan.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('boost_plans').insert(values);
                if (error) throw error;
            }
            onFinished();
        } catch (error: any) {
            console.error("Failed to save boost plan:", error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input placeholder="e.g., Weekly Boost" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea placeholder="e.g., Feature your product for 7 days." {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="duration_days" render={({ field }) => (
                        <FormItem><FormLabel>Duration (Days)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                    <FormField control={form.control} name="price" render={({ field }) => (
                        <FormItem><FormLabel>Price (GH₵)</FormLabel><FormControl><Input type="number" step="0.01" {...field} /></FormControl><FormMessage /></FormItem>
                    )}/>
                </div>
                <FormField control={form.control} name="is_active" render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5"><FormLabel>Active</FormLabel><FormDescription>Is this plan available for vendors?</FormDescription></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                    </FormItem>
                )}/>
                 <DialogFooter>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                        Save Plan
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    )
}


export default function AdminBoostSettingsPage() {
  const { currentUser, loadingUser } = useUser();
  const router = useRouter();
  const [plans, setPlans] = useState<BoostPlan[]>([]);
  const [maxBoostedProducts, setMaxBoostedProducts] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchIndex, setRefetchIndex] = useState(0);
  const [isPlanFormOpen, setIsPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<BoostPlan | undefined>(undefined);
  const [isSavingLimit, setIsSavingLimit] = useState(false);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: plansData, error: plansError } = await supabase.from('boost_plans').select('*').order('price');
      if (plansError) throw plansError;
      setPlans(plansData || []);

      const { data: settingsData, error: settingsError } = await supabase.from('app_settings').select('value').eq('key', 'max_boosted_products').single();
      if (settingsError && settingsError.code !== 'PGRST116') throw settingsError; // Ignore if not found
      if(settingsData) {
        setMaxBoostedProducts(settingsData.value.limit || 10);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingUser && (!currentUser || currentUser.role !== 'admin')) {
      router.push('/auth/login?redirect=/admin/boost-settings');
    } else if (currentUser) {
      fetchSettings();
    }
  }, [currentUser, loadingUser, router, fetchSettings, refetchIndex]);

  const handleUpdateMaxBoosts = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingLimit(true);
    try {
        const { error } = await supabase
            .from('app_settings')
            .upsert({ key: 'max_boosted_products', value: { limit: maxBoostedProducts } }, { onConflict: 'key' });
        if (error) throw error;
        console.log("Setting Saved", "The max boosted product limit has been updated.");
    } catch (err: any) {
        console.error("Failed to update max boosts setting:", err.message);
    } finally {
      setIsSavingLimit(false);
    }
  };

  const handleDeletePlan = async (planId: number) => {
    try {
        const { error } = await supabase.from('boost_plans').delete().eq('id', planId);
        if (error) throw error;
        setRefetchIndex(p => p + 1);
    } catch(err: any) {
        console.error("Failed to delete plan:", err.message);
    }
  }


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="ml-4 text-lg text-muted-foreground">Loading Boost Settings...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10 text-red-500">
        <AlertTriangle className="mx-auto h-12 w-12 mb-4" />
        <h1 className="text-2xl font-semibold">Error Loading Settings</h1>
        <p>{error}</p>
        <Button onClick={() => setRefetchIndex(prev => prev + 1)} className="mt-4">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2"><Settings size={30}/> Boost Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Global Boost Limit</CardTitle>
          <CardDescription>Set the maximum number of products that can be boosted site-wide at one time.</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleUpdateMaxBoosts} className="flex items-end gap-4">
                <div className="flex-grow">
                    <Label htmlFor="max-boosts">Max Boosted Products</Label>
                    <Input 
                        id="max-boosts" 
                        type="number"
                        value={maxBoostedProducts}
                        onChange={(e) => setMaxBoostedProducts(parseInt(e.target.value, 10) || 0)}
                        className="max-w-xs"
                    />
                </div>
                <Button type="submit" disabled={isSavingLimit}>
                  {isSavingLimit && <Spinner className="mr-2 h-4 w-4" />}
                  Save Limit
                </Button>
            </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
                <CardTitle>Boost Pricing Plans</CardTitle>
                <CardDescription>Manage the pricing plans vendors can choose from to boost their products.</CardDescription>
            </div>
             <Dialog open={isPlanFormOpen} onOpenChange={setIsPlanFormOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setEditingPlan(undefined)}><PlusCircle className="mr-2 h-4 w-4"/> Add Plan</Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? 'Edit' : 'Add'} Boost Plan</DialogTitle>
                    </DialogHeader>
                    <BoostPlanForm plan={editingPlan} onFinished={() => { setRefetchIndex(p => p + 1); setIsPlanFormOpen(false); }} />
                </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.length > 0 ? (
                plans.map(plan => (
                    <TableRow key={plan.id}>
                       <TableCell className="font-medium">{plan.name}</TableCell>
                       <TableCell>{plan.duration_days} days</TableCell>
                       <TableCell>GH₵{plan.price}</TableCell>
                       <TableCell className="text-center">
                            <Badge variant={plan.is_active ? 'secondary' : 'outline'} className="flex items-center gap-1 w-fit mx-auto">
                                {plan.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                                {plan.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                       </TableCell>
                       <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                                <Button variant="outline" size="icon" onClick={() => { setEditingPlan(plan); setIsPlanFormOpen(true); }}><Edit className="h-4 w-4" /></Button>
                                <Button variant="destructive" size="icon" onClick={() => handleDeletePlan(plan.id)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                       </TableCell>
                    </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">No boost plans created yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
