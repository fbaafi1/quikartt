
"use client";

import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useUser } from '@/contexts/UserContext';
import PaymentSimulator from '@/components/checkout/PaymentSimulator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { Order, OrderStatus, PaymentMethod, Address, CartItem } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { ChevronLeft, ImageIcon, MapPinIcon, PhoneIcon, Save } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { sendOrderConfirmationNotifications } from '@/ai/flows/order-notifications-flow';
import { Spinner } from '@/components/ui/spinner';


const getImageAttributes = (imageUrlOrDataUriWithHint: string | undefined, itemName: string = "Item") => {
  let src: string = `https://placehold.co/64x64.png?text=${encodeURIComponent(itemName.split(' ').slice(0,1).join('') || 'Item')}`;
  let hint: string = itemName.split(' ').slice(0, 2).join(' ').toLowerCase() || "image";

  if (imageUrlOrDataUriWithHint) {
    const parts = imageUrlOrDataUriWithHint.split('" data-ai-hint="');
    const potentialSrc = parts[0];
    const embeddedHint = parts[1]?.replace('"', '').trim();

    if (potentialSrc.startsWith('data:image/')) {
      src = potentialSrc; 
      hint = embeddedHint || hint; 
    } else if (potentialSrc.startsWith('https://placehold.co/')) {
      src = potentialSrc; 
      hint = embeddedHint || hint;
    } else if (potentialSrc) {
      const textForPlaceholder = itemName.split(' ').slice(0, 2).join(' ') || 'Item';
      src = `https://placehold.co/64x64.png?text=${encodeURIComponent(textForPlaceholder)}`;
      hint = embeddedHint || hint;
    }
  }
  
  hint = hint.split(' ').slice(0, 2).join(' ');
  if (!hint) hint = "image";

  return { src, hint };
};

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


export default function CheckoutPage() {
  const { cartItems, cartTotal, itemCount, clearCart } = useCart();
  const { currentUser, loadingUser, updateUser } = useUser();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  const [showAddressPhoneForm, setShowAddressPhoneForm] = useState(false);
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [phone, setPhone] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (loadingUser) return;

    if (!currentUser) {
      router.push('/auth/login?redirect=/checkout');
    } else if (itemCount === 0 && currentUser) {
      router.push('/');
    } else if (currentUser) {
        // Pre-fill form if data exists, and determine if form needs to be shown
        const addr = currentUser.address;
        setStreet(addr?.street || '');
        setCity(addr?.city || '');
        setRegion(addr?.region || '');
        setPhone(currentUser.phone || '');

        if (!addr?.street || !addr?.city || !addr?.region || !currentUser.phone) {
            setShowAddressPhoneForm(true);
        }
    }
  }, [currentUser, itemCount, router, loadingUser]);

  const handleProfileUpdateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!street || !city || !region || !phone) {
        console.error("Missing Information: Please fill all required address and phone fields.");
        return;
    }
    if (!/^0[235]\d{8}$/.test(phone)) {
        console.error("Invalid Phone Number: Please enter a valid Ghanaian phone number (e.g., 024xxxxxxx or 05xxxxxxx).");
        return;
    }

    setIsSavingProfile(true);
    const updatedAddress: Address = {
        street, city, region, country: currentUser.address?.country || "Ghana", postalCode: currentUser.address?.postalCode || "",
    };
    const { success, error } = await updateUser({ address: updatedAddress, phone });
    setIsSavingProfile(false);
    if (success) {
        setShowAddressPhoneForm(false); // Hide form, proceed to payment
    } else {
        console.error("Update Failed", error || "Could not update profile.");
    }
  };


  const handlePaymentSuccess = async (details: { paymentMethod: PaymentMethod; transactionId?: string, status: OrderStatus }) => {
    if (!currentUser || !currentUser.id || !currentUser.address || !currentUser.phone) {
        setShowAddressPhoneForm(true); 
        return;
    }
    if (itemCount === 0) {
        return;
    }

    setIsProcessingOrder(true);

    const orderToInsert = {
      user_id: currentUser.id, 
      total_amount: cartTotal,
      status: details.status,
      order_date: new Date().toISOString(),
      shipping_address: currentUser.address,
      payment_method: details.paymentMethod,
      transaction_id: details.transactionId,
    };

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert(orderToInsert)
        .select()
        .single();

      if (orderError) throw orderError;
      if (!orderData) throw new Error("Failed to create order.");

      const orderId = orderData.id;

      const orderItemsToInsert = cartItems.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price_at_purchase: item.price,
        product_name: item.name, 
        product_image: (item.images && item.images.length > 0 ? item.images[0].split('" data-ai-hint="')[0] : `https://placehold.co/100x100.png?text=${item.name.substring(0,3)}`)
      }));

      const { error: orderItemsError } = await supabase
        .from('order_items')
        .insert(orderItemsToInsert);

      if (orderItemsError) throw orderItemsError;
      
      if (details.status !== 'Payment Failed' && details.status !== 'Cancelled') {
        for (const item of cartItems) {
          try {
            const { data: productToUpdate, error: fetchProductError } = await supabase
              .from('products')
              .select('stock')
              .eq('id', item.id)
              .single();

            if (fetchProductError) {
              console.error(`Failed to fetch stock for product ${item.id}:`, fetchProductError.message);
              continue;
            }

            if (productToUpdate) {
              const newStock = productToUpdate.stock - item.quantity;
              if (newStock < 0) {
                console.warn(`Stock for product ${item.name} (ID: ${item.id}) would go negative. Setting to 0.`);
                 const { error: stockUpdateError } = await supabase
                  .from('products')
                  .update({ stock: 0 })
                  .eq('id', item.id);
                if (stockUpdateError) throw new Error(`Stock update error for ${item.id}: ${stockUpdateError.message}`);
              } else {
                const { error: stockUpdateError } = await supabase
                  .from('products')
                  .update({ stock: newStock })
                  .eq('id', item.id);
                if (stockUpdateError) throw new Error(`Stock update error for ${item.id}: ${stockUpdateError.message}`);
              }
            }
          } catch (stockError: any) {
            console.error(`Error updating stock for product ${item.id}:`, stockError.message);
          }
        }
        clearCart(); 

        try {
          const phoneNumberE164 = `+233${currentUser.phone.substring(1)}`;
          await sendOrderConfirmationNotifications({
            orderId: orderId,
            customerName: currentUser.name || 'Valued Customer',
            customerPhone: phoneNumberE164,
            totalAmount: cartTotal,
          });
        } catch (smsError: any) {
          console.error("Failed to send order confirmation notifications:", smsError);
        }
      }
      router.push('/orders'); 

    } catch (error: any) {
        console.error("Order placement error:", error);
    } finally {
        setIsProcessingOrder(false);
    }
  };
  
  if (!isClient || loadingUser || (!currentUser && !loadingUser) || (itemCount === 0 && currentUser && isClient)) {
    return (
      <div className="text-center py-20">
        <Spinner className="h-12 w-12 text-primary mx-auto mb-4" />
        <p className="text-lg text-muted-foreground">Loading checkout or redirecting...</p>
        {isClient && itemCount === 0 && currentUser && (
            <div className="mt-4">
                <p className="mb-4">Your cart is empty. Please add items to proceed to checkout.</p>
                <Button asChild><Link href="/">Continue Shopping</Link></Button>
            </div>
        )}
      </div>
    );
  }
  
  if (!currentUser && isClient && !loadingUser) { 
    router.push('/auth/login?redirect=/checkout');
    return null; 
  }

  return (
    <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-6">
        <Button variant="outline" size="sm" asChild className="mb-0">
           <Link href="/cart"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Cart</Link>
        </Button>

        {showAddressPhoneForm && currentUser && (
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Delivery Details Required</CardTitle>
                    <CardDescription>Please provide your delivery address and phone number to continue.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleProfileUpdateSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="street">Street Address</Label>
                            <Input id="street" value={street} onChange={(e) => setStreet(e.target.value)} placeholder="e.g., 123 QuiKart Lane" required />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="city">City / Town</Label>
                                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Accra" required />
                            </div>
                            <div>
                                <Label htmlFor="region">Region</Label>
                                <Select onValueChange={setRegion} value={region}>
                                    <SelectTrigger id="region">
                                        <SelectValue placeholder="Select your region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ghanaRegions.map((r) => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                        </div>
                        <Button type="submit" className="w-full" disabled={isSavingProfile}>
                            {isSavingProfile && <Spinner className="mr-2 h-4 w-4" />}
                            <Save className="mr-2 h-4 w-4" /> Save and Continue
                        </Button>
                    </form>
                </CardContent>
            </Card>
        )}

        {!showAddressPhoneForm && currentUser && (
            <PaymentSimulator 
                totalAmount={cartTotal} 
                onPaymentSuccess={handlePaymentSuccess} 
                isProcessingOrder={isProcessingOrder} 
            />
        )}
      </div>

      <div className="md:col-span-1">
        <Card className="shadow-lg sticky top-24">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
            <CardDescription>{itemCount} item(s)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {cartItems.map(item => {
               const { src: itemImageUrl, hint: itemImageHint } = getImageAttributes(item.images[0], item.name);
               return (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-md overflow-hidden bg-muted flex items-center justify-center shrink-0">
                     {itemImageUrl ? (
                        <Image
                            src={itemImageUrl}
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                            data-ai-hint={itemImageHint}
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-muted-foreground" />
                      )}
                  </div>
                  <div className="flex-grow">
                    <p className="font-medium text-sm">{item.name}</p>
                    <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-semibold">GH₵{(item.price * item.quantity).toFixed(2)}</p>
                </div>
               );
            })}
            <Separator />
            <div className="flex justify-between text-lg font-semibold">
              <span>Total:</span>
              <span className="text-primary">GH₵{cartTotal.toFixed(2)}</span>
            </div>
          </CardContent>
           <CardFooter className="text-xs text-muted-foreground p-4 border-t">
            {showAddressPhoneForm ? "Please complete your delivery details above." : "Delivery and taxes calculated at next step (if applicable). This is a simulation."}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
