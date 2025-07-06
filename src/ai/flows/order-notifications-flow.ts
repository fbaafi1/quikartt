
'use server';
/**
 * @fileOverview Orchestrates sending notifications for a new order.
 *
 * - sendOrderConfirmationNotifications - Sends SMS to both customer and admin.
 */

import { sendSms } from './send-sms-flow';
import { format } from 'date-fns';

interface OrderNotificationInput {
  orderId: string;
  customerName: string;
  customerPhone: string; // E.164 format
  totalAmount: number;
}

export async function sendOrderConfirmationNotifications(input: OrderNotificationInput): Promise<void> {
  // 1. Send SMS to Customer
  try {
    const customerMessage = `Hi ${input.customerName}, your QuiKart order #${input.orderId.substring(0, 8)} for GH₵${input.totalAmount.toFixed(2)} has been placed successfully!`;
    await sendSms({
      to: input.customerPhone,
      body: customerMessage,
    });
    console.log(`Customer confirmation SMS sent to ${input.customerPhone}`);
  } catch (error) {
    console.error(`Failed to send order confirmation SMS to customer ${input.customerPhone}:`, error);
    // We still want to try sending the admin notification, so we don't re-throw here.
    // In a real app, you might add this to a retry queue.
  }

  // 2. Send SMS to Admin
  const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER;
  if (adminPhoneNumber) {
    try {
      const adminMessage = `New QuiKart order: #${input.orderId.substring(0, 8)}\nAmount: GH₵${input.totalAmount.toFixed(2)}\nBy: ${input.customerName} (${input.customerPhone})\nDate: ${format(new Date(), 'PP p')}`;
      
      await sendSms({
        to: adminPhoneNumber,
        body: adminMessage,
      });
      console.log(`Admin notification SMS sent to ${adminPhoneNumber}`);
    } catch (error) {
      console.error(`Failed to send order notification SMS to admin ${adminPhoneNumber}:`, error);
      // Log this error but don't let it affect the user flow.
    }
  } else {
    console.warn("NEXT_PUBLIC_ADMIN_PHONE_NUMBER environment variable is not set. Skipping admin notification.");
  }
}
