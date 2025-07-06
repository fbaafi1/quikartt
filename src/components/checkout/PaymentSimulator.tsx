
"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { PaymentMethod, OrderStatus } from '@/lib/types';
import { Loader2, AlertTriangle, ShoppingBag } from 'lucide-react';

interface PaymentSimulatorProps {
  totalAmount: number;
  onPaymentSuccess: (details: { paymentMethod: PaymentMethod; transactionId?: string; status: OrderStatus }) => Promise<void>;
  isProcessingOrder: boolean;
}

export default function PaymentSimulator({ totalAmount, onPaymentSuccess, isProcessingOrder }: PaymentSimulatorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceOrder = async () => {
    setIsSubmitting(true);
    await onPaymentSuccess({
      paymentMethod: 'Cash on Delivery',
      status: 'Pending', // 'Pending' is the correct initial status for a CoD order.
      transactionId: undefined, // No transaction ID for CoD
    });
    // The isProcessingOrder prop from the parent will keep the UI disabled until the process completes.
    // We don't need to set isSubmitting back to false here, as the user will be redirected.
  };

  const isDisabled = isSubmitting || isProcessingOrder;

  return (
    <Card className="w-full max-w-lg mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl">Confirm Your Order</CardTitle>
        <CardDescription>
          Total Amount: <span className="font-bold text-primary">GH₵{totalAmount.toFixed(2)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="p-4 border-l-4 border-primary bg-primary/10 rounded-md">
          <h4 className="font-semibold text-primary">Payment Method: Cash on Delivery</h4>
          <p className="text-sm text-muted-foreground mt-1">
            You will pay the courier in cash when your order is delivered. Please have the exact amount ready.
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex-col items-center gap-4 border-t pt-6">
        <Button 
          onClick={handlePlaceOrder}
          className="w-full text-lg py-6" 
          disabled={isDisabled}
        >
          {isDisabled ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingBag className="mr-2 h-5 w-5" />}
          {isDisabled ? 'Placing Order...' : 'Place Order Now'}
        </Button>
         <div className="flex items-center gap-1.5 text-xs text-muted-foreground text-center">
            <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>Clicking this will confirm your order. You'll receive an SMS confirmation.</span>
        </div>
      </CardFooter>
    </Card>
  );
}
