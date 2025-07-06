import Link from 'next/link';
import { Facebook } from 'lucide-react'; // Facebook will use Lucide for now
import { cn } from '@/lib/utils';

const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="h-6 w-6">
        <path d="M20.52 3.48A11.89 11.89 0 0 0 12 0C5.37 0 .03 5.35.03 11.98a11.89 11.89 0 0 0 1.64 6.03L0 24l6.17-1.61a11.93 11.93 0 0 0 5.83 1.5c6.63 0 11.98-5.34 11.98-11.97 0-3.2-1.25-6.2-3.46-8.44ZM12 21.44a9.54 9.54 0 0 1-4.87-1.3l-.35-.21-3.66.95.97-3.56-.23-.37a9.45 9.45 0 0 1-1.47-5.1C2.39 6.73 6.73 2.4 12 2.4c2.58 0 5 1 6.82 2.82a9.59 9.59 0 0 1 2.81 6.8c0 5.27-4.34 9.52-9.63 9.52Zm5.3-6.86c-.29-.15-1.7-.83-1.96-.92-.26-.1-.45-.15-.64.15-.2.29-.74.92-.9 1.1-.17.19-.33.2-.62.05-.29-.15-1.22-.45-2.32-1.43-.86-.77-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.12.29-.33.44-.49.15-.17.2-.29.3-.48.1-.2.05-.37-.02-.53-.07-.15-.64-1.56-.88-2.14-.23-.56-.47-.49-.64-.5l-.54-.01c-.19 0-.5.07-.77.37-.26.29-1 1-.97 2.43.04 1.42 1.03 2.8 1.18 2.99.15.2 2.02 3.17 4.92 4.32.69.3 1.22.48 1.63.61.69.22 1.32.19 1.81.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.06-.11-.26-.17-.55-.31Z"/>
    </svg>
);


// User-provided SVG for TikTok Icon
const TikTokIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 333335 333336" shapeRendering="geometricPrecision" textRendering="geometricPrecision" imageRendering="optimizeQuality" fillRule="evenodd" clipRule="evenodd" className="h-6 w-6">
    <path d="M72464 0h188407c39856 0 72464 32609 72464 72465v188407c0 39855-32608 72464-72464 72464H72464C32608 333336 0 300727 0 260872V72465C0 32609 32608 0 72464 0zm127664 70642c337 2877 825 5661 1461 8341l6304 2c1170 9991 4006 19119 8465 26697 7282 6745 16797 10904 28280 11641v9208c2131 444 4350 746 6659 894v29690c-14847 1462-27841-3426-42981-12531l2324 50847c0 16398 61 23892-8738 38977-20546 35222-58194 36677-82176 18323-12269-4256-23069-12466-29881-23612-19875-32516-1959-85512 55687-90966l-94 7835v1970c3105-646 6365-1144 9794-1468v31311c-12484 2057-20412 5890-24119 12980-7424 14197-4049 26526 3716 34309 16276 2796 34401-8481 31673-43351V70644h33628z" fill="currentColor"/>
    <path d="M200128 70642c3093 26406 18915 45038 44510 46681v25046l-165 15v-21275c-25595-1642-40311-17390-43404-43796l-27114-1v111095c3912 50005-35050 51490-49955 32531 17482 10934 45867 3826 42501-39202V70641h33628zm-72854 184165c-15319-3153-29249-12306-37430-25689-19875-32516-1959-85512 55687-90966l-94 7835c-53444 8512-58809 65920-44009 89802 5707 9209 15076 15686 25846 19019z" fill="#26f4ee"/>
    <path d="M207892 78985c1761 15036 7293 28119 16454 36903-12866-6655-20630-19315-23062-36905l6609 2zm36580 47511c2181 463 4456 777 6824 929v29690c-14847 1462-27841-3426-42981-12531l2324 50847c0 16398 61 23892-8738 38977-21443 36760-61517 36743-85239 15810 30930 17765 84928 3857 84829-56453v-55496c15141 9105 28134 13993 42981 12530v-24302zm-99036 21460c3105-646 6365-1144 9794-1468v31311c-12484 2057-20412 5890-24119 12980-10441 19964 474 36238 14923 41365-18075-649-36010-19214-23555-43031 3707-7089 10474-10923 22958-12980v-28177z" fill="#fb2c53"/>
    <path d="M201068 77313c3093 26406 17809 42154 43404 43796v29689c-14847 1462-27841-3425-42981-12530v55496c119 72433-77802 77945-100063 42025-14800-23881-9435-81290 44009-89802v30147c-12483 2057-19250 5891-22958 12980-22909 43808 56997 69872 51475-706V77313l27114 1z" fill="#fefefe"/>
  </svg>
);


// User-provided SVG for Instagram Icon
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 132.004 132" className="h-6 w-6">
    <defs>
      <linearGradient id="instagram-grad-b">
        <stop offset="0" stopColor="#3771c8"/>
        <stop stopColor="#3771c8" offset=".128"/>
        <stop offset="1" stopColor="#60f" stopOpacity="0"/>
      </linearGradient>
      <linearGradient id="instagram-grad-a">
        <stop offset="0" stopColor="#fd5"/>
        <stop offset=".1" stopColor="#fd5"/>
        <stop offset=".5" stopColor="#ff543e"/>
        <stop offset="1" stopColor="#c837ab"/>
      </linearGradient>
      <radialGradient id="instagram-grad-c" cx="158.429" cy="578.088" r="65" xlinkHref="#instagram-grad-a" gradientUnits="userSpaceOnUse" gradientTransform="matrix(0 -1.98198 1.8439 0 -1031.402 454.004)" fx="158.429" fy="578.088"/>
      <radialGradient id="instagram-grad-d" cx="147.694" cy="473.455" r="65" xlinkHref="#instagram-grad-b" gradientUnits="userSpaceOnUse" gradientTransform="matrix(.17394 .86872 -3.5818 .71718 1648.348 -458.493)" fx="147.694" fy="473.455"/>
    </defs>
    <path fill="url(#instagram-grad-c)" d="M65.03 0C37.888 0 29.95.028 28.407.156c-5.57.463-9.036 1.34-12.812 3.22-2.91 1.445-5.205 3.12-7.47 5.468C4 13.126 1.5 18.394.595 24.656c-.44 3.04-.568 3.66-.594 19.188-.01 5.176 0 11.988 0 21.125 0 27.12.03 35.05.16 36.59.45 5.42 1.3 8.83 3.1 12.56 3.44 7.14 10.01 12.5 17.75 14.5 2.68.69 5.64 1.07 9.44 1.25 1.61.07 18.02.12 34.44.12 16.42 0 32.84-.02 34.41-.1 4.4-.207 6.955-.55 9.78-1.28 7.79-2.01 14.24-7.29 17.75-14.53 1.765-3.64 2.66-7.18 3.065-12.317.088-1.12.125-18.977.125-36.81 0-17.836-.04-35.66-.128-36.78-.41-5.22-1.305-8.73-3.127-12.44-1.495-3.037-3.155-5.305-5.565-7.624C116.9 4 111.64 1.5 105.372.596 102.335.157 101.73.027 86.19 0H65.03z" transform="translate(1.004 1)"/>
    <path fill="url(#instagram-grad-d)" d="M65.03 0C37.888 0 29.95.028 28.407.156c-5.57.463-9.036 1.34-12.812 3.22-2.91 1.445-5.205 3.12-7.47 5.468C4 13.126 1.5 18.394.595 24.656c-.44 3.04-.568 3.66-.594 19.188-.01 5.176 0 11.988 0 21.125 0 27.12.03 35.05.16 36.59.45 5.42 1.3 8.83 3.1 12.56 3.44 7.14 10.01 12.5 17.75 14.5 2.68.69 5.64 1.07 9.44 1.25 1.61.07 18.02.12 34.44.12 16.42 0 32.84-.02 34.41-.1 4.4-.207 6.955-.55 9.78-1.28 7.79-2.01 14.24-7.29 17.75-14.53 1.765-3.64 2.66-7.18 3.065-12.317.088-1.12.125-18.977.125-36.81 0-17.836-.04-35.66-.128-36.78-.41-5.22-1.305-8.73-3.127-12.44-1.495-3.037-3.155-5.305-5.565-7.624C116.9 4 111.64 1.5 105.372.596 102.335.157 101.73.027 86.19 0H65.03z" transform="translate(1.004 1)"/>
    <path fill="#fff" fillRule="evenodd" clipRule="evenodd" d="M66.004 18c-13.036 0-14.672.057-19.792.29-5.11.234-8.598 1.043-11.65 2.23-3.157 1.226-5.835 2.866-8.503 5.535-2.67 2.668-4.31 5.346-5.54 8.502-1.19 3.053-2 6.542-2.23 11.65C18.06 51.327 18 52.964 18 66s.058 14.667.29 19.787c.235 5.11 1.044 8.598 2.23 11.65 1.227 3.157 2.867 5.835 5.536 8.503 2.667 2.67 5.345 4.314 8.5 5.54 3.054 1.187 6.543 1.996 11.652 2.23 5.12.233 6.755.29 19.79.29 13.037 0 14.668-.057 19.788-.29 5.11-.234 8.602-1.043 11.656-2.23 3.156-1.226 5.83-2.87 8.497-5.54 2.67-2.668 4.31-5.346 5.54-8.502 1.18-3.053 1.99-6.542 2.23-11.65.23-5.12.29-6.752.29-19.788 0-13.036-.06-14.672-.29-19.792-.24-5.11-1.05-8.598-2.23-11.65-1.23-3.157-2.87-5.835-5.54-8.503-2.67-2.67-5.34-4.31-8.5-5.535-3.06-1.187-6.55-1.996-11.66-2.23-5.12-.233-6.75-.29-19.79-.29zm-4.306 8.65c1.278-.002 2.704 0 4.306 0 12.816 0 14.335.046 19.396.276 4.68.214 7.22.996 8.912 1.653 2.24.87 3.837 1.91 5.516 3.59 1.68 1.68 2.72 3.28 3.592 5.52.657 1.69 1.44 4.23 1.653 8.91.23 5.06.28 6.58.28 19.39s-.05 14.33-.28 19.39c-.214 4.68-.996 7.22-1.653 8.91-.87 2.24-1.912 3.835-3.592 5.514-1.68 1.68-3.275 2.72-5.516 3.59-1.69.66-4.232 1.44-8.912 1.654-5.06.23-6.58.28-19.396.28-12.817 0-14.336-.05-19.396-.28-4.68-.216-7.22-.998-8.913-1.655-2.24-.87-3.84-1.91-5.52-3.59-1.68-1.68-2.72-3.276-3.592-5.517-.657 1.69-1.44 4.23-1.653-8.91-.23-5.06-.276-6.58-.276-19.398s.046-14.33.276-19.39c.214-4.68.996-7.22 1.653-8.912.87-2.24 1.912-3.84 3.592-5.52 1.68-1.68 3.28-2.72 5.52-3.592 1.692-.66 4.233-1.44 8.913-1.655 4.428-.2 6.144-.26 15.09-.27zm29.928 7.97c-3.18 0-5.76 2.577-5.76 5.758 0 3.18 2.58 5.76 5.76 5.76 3.18 0 5.76-2.58 5.76-5.76 0-3.18-2.58-5.76-5.76-5.76zm-25.622 6.73c-13.613 0-24.65 11.037-24.65 24.65 0 13.613 11.037 24.645 24.65 24.645C79.617 90.645 90.65 79.613 90.65 66S79.616 41.35 66.003 41.35zm0 8.65c8.836 0 16 7.163 16 16 0 8.836-7.164 16-16 16-8.837 0-16-7.164-16-16 0-8.837 7.163-16 16-16z"/>
  </svg>
);


const socialLinks = [
  {
    href: "http://wa.me/233506566191",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    colorClass: "text-whatsapp hover:text-whatsapp/80",
  },
  {
    href: "http://www.tiktok.com/@lolafrica0",
    label: "TikTok",
    icon: TikTokIcon,
    colorClass: "text-black dark:text-white hover:text-black/80 dark:hover:text-white/80",
  },
  {
    href: "https://www.instagram.com/quikart_gh?igsh=MTZqNzNwNDdvam8wMw%3D%3D&utm_source=qr",
    label: "Instagram",
    icon: InstagramIcon,
    colorClass: "text-instagram hover:text-instagram/80",
  },
  {
    href: "https://www.facebook.com/profile.php?id=100092412504647&mibextid=LQQJ4d",
    label: "Facebook",
    icon: Facebook,
    colorClass: "text-facebook hover:text-facebook/80",
  },
];

export default function Footer() {
  return (
    <footer className="bg-muted py-8 border-t">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-primary mb-3">QuiKart</h3>
            <p className="text-sm text-muted-foreground">
              Your one-stop shop for the best deals in Ghana. Quality products, unbeatable prices.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Quick Links</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
              <li><Link href="/sell-on-quikart" className="hover:text-primary transition-colors">Sell on QuiKart</Link></li>
              <li><Link href="/orders" className="hover:text-primary transition-colors">My Orders</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-3">Connect With Us</h3>
            <div className="flex space-x-4">
              {socialLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={link.label}
                  className={cn("transition-colors", link.colorClass)}
                  title={link.label}
                >
                  <link.icon />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-muted-foreground mt-8 pt-8 border-t">
          &copy; {new Date().getFullYear()} QuiKart. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
