
"use client";

import Link from 'next/link';
import { ShoppingCart, User as UserIcon, LogIn, LogOut, LayoutDashboard, Package, ListOrdered, UserPlus, Heart, ClipboardList, Megaphone, Store, Tags, Sparkles, Settings, PanelLeft, Bell, MessageSquare, Rss } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/contexts/UserContext';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/categories', label: 'Categories', icon: Tags },
  { href: '/admin/vendors', label: 'Vendors', icon: Store },
  { href: '/admin/advertisements', label: 'Advertisements', icon: Megaphone },
  { href: '/admin/blog', label: 'Blog Management', icon: Rss },
  { href: '/admin/boost-requests', label: 'Boost Requests', icon: Sparkles },
  { href: '/admin/boost-settings', label: 'Boost Settings', icon: Settings },
  { href: '/admin/notifications', label: 'Send Notification', icon: MessageSquare },
];

export default function Navbar() {
  const { currentUser, logout, loadingUser } = useUser();
  const { itemCount: cartItemCount } = useCart();
  const { itemCount: wishlistItemCount } = useWishlist();
  const { notificationCount } = useNotifications();
  const router = useRouter();

  const handleLogout = () => {
    logout();
  };

  const getInitials = (name?: string) => {
    if (!name) return 'QK'; // QuiKart User
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-primary flex-shrink-0">
          <ShoppingCart className="h-7 w-7" />
          <span className="inline text-2xl font-bold">QuiKart</span>
        </Link>
        <nav className="flex items-center gap-2 sm:gap-4 justify-end">
          {loadingUser ? (
            <div className="flex items-center gap-4">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ) : (
            <>
              {(!currentUser || currentUser.role === 'customer') && (
                 <Button variant="ghost" asChild title="Sell on QuiKart">
                    <Link href="/sell-on-quikart" className="flex items-center gap-1">
                      <Store size={18} /> <span className="hidden sm:inline">Sell on QuiKart</span>
                    </Link>
                  </Button>
              )}

              {currentUser?.role === 'customer' && (
                <>
                  <Button variant="ghost" asChild title="My Orders">
                    <Link href="/orders" className="flex items-center gap-1">
                      <ListOrdered size={18} /> <span className="hidden sm:inline">Orders</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild title="Wishlist">
                    <Link href="/wishlist" className="relative flex items-center gap-1">
                      <Heart size={18} /> <span className="hidden sm:inline">Wishlist</span>
                      {wishlistItemCount > 0 && (
                        <Badge variant="secondary" className="absolute -top-2 -right-3 px-1.5 py-0.5 text-xs">
                          {wishlistItemCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </>
              )}
              {currentUser?.role === 'admin' && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" className="flex items-center gap-1">
                      <PanelLeft size={18} />
                      <span className="hidden sm:inline">Admin Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[250px] sm:max-w-xs">
                    <SheetHeader>
                      <SheetTitle>Admin Menu</SheetTitle>
                       <SheetDescription>
                          Manage all aspects of the store.
                       </SheetDescription>
                    </SheetHeader>
                    <div className="py-4">
                      <nav className="flex flex-col gap-1">
                        {adminNavItems.map((item) => (
                          <Button key={item.href} variant="ghost" className="w-full justify-start" asChild>
                             <Link href={item.href}>
                              <item.icon className="mr-2 h-4 w-4" />
                              {item.label}
                            </Link>
                          </Button>
                        ))}
                      </nav>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
              {currentUser?.role === 'vendor' && (
                <>
                  <Button variant="ghost" asChild title="Vendor Dashboard">
                    <Link href="/vendor/dashboard" className="flex items-center gap-1">
                      <LayoutDashboard size={18}/> <span className="hidden sm:inline">Dashboard</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild title="My Products">
                    <Link href="/vendor/products" className="flex items-center gap-1">
                      <Package size={18} /> <span className="hidden sm:inline">My Products</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild title="My Orders">
                    <Link href="/vendor/orders" className="flex items-center gap-1">
                      <ClipboardList size={18} /> <span className="hidden sm:inline">My Orders</span>
                    </Link>
                  </Button>
                  <Button variant="ghost" asChild title="Notifications">
                    <Link href="/vendor/notifications" className="relative flex items-center gap-1">
                      <Bell size={18} /> <span className="hidden sm:inline">Notifications</span>
                      {notificationCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-2 -right-3 px-1.5 py-0.5 text-xs">
                          {notificationCount}
                        </Badge>
                      )}
                    </Link>
                  </Button>
                </>
              )}
              {currentUser?.role === 'customer' && (
                 <Button variant="ghost" asChild title="Cart">
                  <Link href="/cart" className="relative flex items-center gap-1">
                    <ShoppingCart size={18} /> <span className="hidden sm:inline">Cart</span>
                    {cartItemCount > 0 && (
                      <Badge variant="destructive" className="absolute -top-2 -right-3 px-1.5 py-0.5 text-xs">
                        {cartItemCount}
                      </Badge>
                    )}
                  </Link>
                </Button>
              )}

              {currentUser ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full" title="My Account">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://placehold.co/100x100.png?text=${getInitials(currentUser.name)}`} alt={currentUser.name || "User"} data-ai-hint="avatar person" />
                        <AvatarFallback>{getInitials(currentUser.name)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {currentUser.role === 'customer' && (
                      <DropdownMenuItem onClick={() => router.push('/profile')}>
                        <UserIcon className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex items-center gap-1 sm:gap-2 sm:mr-2">
                  <Button variant="ghost" asChild title="Login">
                    <Link href="/auth/login" className="flex items-center gap-1">
                     <LogIn size={18}/> <span className="hidden sm:inline">Login</span>
                    </Link>
                  </Button>
                  <Button asChild title="Sign Up">
                    <Link href="/auth/signup" className="flex items-center gap-1">
                      <UserPlus size={18} /> <span className="hidden sm:inline">Sign Up</span>
                    </Link>
                  </Button>
                </div>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
