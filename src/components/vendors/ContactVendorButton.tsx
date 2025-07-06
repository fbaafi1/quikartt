"use client";

import { Button } from '@/components/ui/button';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-5 w-5">
        <path d="M20.52 3.48A11.89 11.89 0 0 0 12 0C5.37 0 .03 5.35.03 11.98a11.89 11.89 0 0 0 1.64 6.03L0 24l6.17-1.61a11.93 11.93 0 0 0 5.83 1.5c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.46-8.44ZM12 21.44a9.54 9.54 0 0 1-4.87-1.3l-.35-.21-3.66.95.97-3.56-.23-.37a9.45 9.45 0 0 1-1.47-5.1C2.39 6.73 6.73 2.4 12 2.4c2.58 0 5 1 6.82 2.82a9.59 9.59 0 0 1 2.81 6.8c0 5.27-4.34 9.52-9.63 9.52Zm5.3-6.86c-.29-.15-1.7-.83-1.96-.92-.26-.1-.45-.15-.64.15-.2.29-.74.92-.9 1.1-.17.19-.33.2-.62.05-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.12.29-.33.44-.49.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.53-.07-.15-.64-1.56-.88-2.14-.23-.56-.47-.49-.64-.5l-.54-.01c-.19 0-.5.07-.77.37-.26.29-1 1-.97 2.43.04 1.42 1.03 2.8 1.18 2.99.15.2 2.02 3.17 4.92 4.32.69.3 1.22.48 1.63.61.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.06-.11-.26-.17-.55-.31Z"/>
    </svg>
);


interface ContactVendorButtonProps {
  contactNumber: string;
  storeName: string;
}

export default function ContactVendorButton({ contactNumber, storeName }: ContactVendorButtonProps) {
  const handleContact = () => {
    // Assuming Ghanaian numbers are stored as '024...' or '05...'.
    // Convert to international format without the '+'.
    const formattedNumber = contactNumber.startsWith('0') 
      ? `233${contactNumber.substring(1)}` 
      : contactNumber.replace('+', '');
    
    const message = `Hello, I'm interested in your products on QuiKart - ${storeName}`;
    const encodedMessage = encodeURIComponent(message);
    
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Button 
      onClick={handleContact}
      className="bg-[#25D366] hover:bg-[#128C7E] text-white"
      aria-label={`Contact ${storeName} on WhatsApp`}
    >
      <WhatsAppIcon />
      Contact on WhatsApp
    </Button>
  );
}
