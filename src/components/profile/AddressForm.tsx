
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/contexts/UserContext";
import { useState } from "react";
import type { Address } from "@/lib/types";
import { Loader2 } from "lucide-react";

const ghanaRegions = [
  'Ahafo Region',
  'Ashanti Region',
  'Bono East Region',
  'Bono Region',
  'Central Region',
  'Eastern Region',
  'Greater Accra Region',
  'North East Region',
  'Northern Region',
  'Oti Region',
  'Savannah Region',
  'Upper East Region',
  'Upper West Region',
  'Volta Region',
  'Western North Region',
  'Western Region',
].sort();

const addressFormSchema = z.object({
  street: z.string().min(3, { message: "Street address must be at least 3 characters." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
  region: z.string().min(2, { message: "Region must be at least 2 characters." }),
  postalCode: z.string().optional(),
  country: z.string().default("Ghana"), // Default to Ghana
});

type AddressFormValues = z.infer<typeof addressFormSchema>;

export default function AddressForm() {
  const { currentUser, updateUser } = useUser();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressFormSchema),
    defaultValues: {
      street: currentUser?.address?.street || "",
      city: currentUser?.address?.city || "",
      region: currentUser?.address?.region || "",
      postalCode: currentUser?.address?.postalCode || "",
      country: currentUser?.address?.country || "Ghana",
    },
  });
  
  useState(() => {
    if (currentUser?.address) {
      form.reset(currentUser.address);
    } else {
      form.reset({
        street: "", city: "", region: "", postalCode: "", country: "Ghana"
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, form.reset]);


  async function onSubmit(values: AddressFormValues) {
     if (!currentUser) return;
    setIsLoading(true);
    
    const newAddress: Address = {
      street: values.street,
      city: values.city,
      region: values.region,
      postalCode: values.postalCode,
      country: values.country,
    };

    await updateUser({ address: newAddress });
    setIsLoading(false);
  }
  
  if (!currentUser) {
    return <p>Loading address information...</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Delivery Address</CardTitle>
        <CardDescription>Update your primary delivery address.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="street"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Street Address</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., 123 Kudi Lane, H/No. C45" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City / Town</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Accra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="region"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Region</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined} value={field.value || undefined}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your region" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ghanaRegions.map((regionName) => (
                            <SelectItem key={regionName} value={regionName}>
                              {regionName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="postalCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Postal Code (Optional)</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., GA-123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                        <Input {...field} disabled />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Address
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
