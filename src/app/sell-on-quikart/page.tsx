"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, AlertTriangle } from 'lucide-react';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
      <path d="M20.52 3.48A11.89 11.89 0 0 0 12 0C5.37 0 .03 5.35.03 11.98a11.89 11.89 0 0 0 1.64 6.03L0 24l6.17-1.61a11.93 11.93 0 0 0 5.83 1.5c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.46-8.44ZM12 21.44a9.54 9.54 0 0 1-4.87-1.3l-.35-.21-3.66.95.97-3.56-.23-.37a9.45 9.45 0 0 1-1.47-5.1C2.39 6.73 6.73 2.4 12 2.4c2.58 0 5 1 6.82 2.82a9.59 9.59 0 0 1 2.81 6.8c0 5.27-4.34 9.52-9.63 9.52Zm5.3-6.86c-.29-.15-1.7-.83-1.96-.92-.26-.1-.45-.15-.64.15-.2.29-.74.92-.9 1.1-.17.19-.33.2-.62.05-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.12.29-.33.44-.49.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.53-.07-.15-.64-1.56-.88-2.14-.23-.56-.47-.49-.64-.5l-.54-.01c-.19 0-.5.07-.77.37-.26.29-1 1-.97 2.43.04 1.42 1.03 2.8 1.18 2.99.15.2 2.02 3.17 4.92 4.32.69.3 1.22.48 1.63.61.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.06-.11-.26-.17-.55-.31Z"/>
    </svg>
  );


export default function SellOnQuiKartPage() {
  // We read the env var on the client. It will be undefined during server render,
  // but will be available once the client hydrates.
  const adminPhoneNumber = process.env.NEXT_PUBLIC_ADMIN_PHONE_NUMBER;
  const whatsappNumber = adminPhoneNumber?.startsWith('+') ? adminPhoneNumber.substring(1) : adminPhoneNumber;
  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-4">
      <Card className="w-full max-w-2xl mx-auto text-center shadow-xl">
        <CardHeader className="p-6">
          <ShoppingCart className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl font-bold">Sell on QuiKart</CardTitle>
          <CardDescription className="text-md text-muted-foreground mt-2">
            Join Ghana's fastest-growing online marketplace and reach thousands of customers.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="text-left space-y-4 text-muted-foreground">
            <p>
              Are you a small business owner, an entrepreneur, or do you have products you want to sell to a wider audience? QuiKart provides the platform you need to grow your business online.
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><span className="font-semibold text-foreground">Easy Setup:</span> Get your products online with minimal hassle.</li>
              <li><span className="font-semibold text-foreground">Wide Reach:</span> Access customers across all regions of Ghana.</li>
              <li><span className="font-semibold text-foreground">Secure Platform:</span> We handle the technology so you can focus on your products.</li>
              <li><span className="font-semibold text-foreground">Local Support:</span> Our team is here to help you succeed.</li>
            </ul>
          </div>

          {adminPhoneNumber ? (
            <div className="pt-4">
              <h3 className="text-lg font-semibold">Ready to get started?</h3>
              <p className="text-muted-foreground mt-1 mb-4">Contact our vendor onboarding team via WhatsApp.</p>
              <Button asChild size="lg" className="bg-[#25D366] hover:bg-[#128C7E] text-white whitespace-normal h-auto w-full max-w-xl mx-auto [&_svg]:size-6">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 p-4">
                  <WhatsAppIcon />
                  <span>Chat with us on WhatsApp</span>
                </a>
              </Button>
            </div>
          ) : (
            <div className="p-4 border-l-4 border-destructive bg-destructive/10 rounded-md text-center">
              <AlertTriangle className="mx-auto h-8 w-8 mb-2" />
              <p className="font-semibold">Onboarding Currently Unavailable</p>
              <p className="text-sm">Vendor contact information is not configured. Please check back later.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
