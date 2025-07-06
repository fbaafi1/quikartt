
'use server';
/**
 * @fileOverview A utility for sending SMS messages using Twilio.
 *
 * - sendSms - A function that sends an SMS message to a specified number.
 */

import { Twilio } from 'twilio';

// Load credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

// Validate that all required environment variables are set
if (!accountSid || !authToken || !twilioPhoneNumber) {
  const missingVars = [];
  if (!accountSid) missingVars.push('TWILIO_ACCOUNT_SID');
  if (!authToken) missingVars.push('TWILIO_AUTH_TOKEN');
  if (!twilioPhoneNumber) missingVars.push('TWILIO_PHONE_NUMBER');
  console.warn(`Twilio integration is disabled. Missing environment variables: ${missingVars.join(', ')}`);
}

// Initialize Twilio client only if credentials are available
const twilioClient = accountSid && authToken ? new Twilio(accountSid, authToken) : null;

interface SendSmsInput {
  to: string; // The recipient phone number in E.164 format (e.g., +233241234567).
  body: string; // The text content of the SMS message.
}

export async function sendSms(input: SendSmsInput): Promise<{ success: boolean; messageId?: string }> {
  if (!twilioClient) {
    const errorMessage = "Twilio client is not initialized. Please check server environment variables.";
    console.error(`sendSms Error: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  try {
    const message = await twilioClient.messages.create({
      body: input.body,
      from: twilioPhoneNumber!,
      to: input.to,
    });

    console.log(`SMS sent successfully. SID: ${message.sid}`);
    return { success: true, messageId: message.sid };

  } catch (error: any) {
    console.error(`Twilio SMS sending failed for number ${input.to}:`, error.message);
    // Re-throw the error so the calling function can handle it appropriately.
    // This makes the function's failure behavior explicit and easier to debug.
    throw new Error(`Failed to send SMS: ${error.message}`);
  }
}
