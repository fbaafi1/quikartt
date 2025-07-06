
"use client";

import { Bell, AlertTriangle, Package, ShoppingCart, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications, Notification } from '@/contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { Spinner } from '@/components/ui/spinner';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
        case 'subscription':
            return <AlertTriangle className="h-5 w-5 text-destructive" />;
        case 'inventory':
            return <Package className="h-5 w-5 text-yellow-600" />;
        case 'order':
            return <ShoppingCart className="h-5 w-5 text-green-600" />;
        case 'admin':
            return <MessageSquare className="h-5 w-5 text-blue-600" />;
        default:
            return <Bell className="h-5 w-5 text-muted-foreground" />;
    }
};

export default function VendorNotificationsPage() {
    const { notifications, isLoadingNotifications } = useNotifications();
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.ceil(notifications.length / ITEMS_PER_PAGE);
    const paginatedNotifications = notifications.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    if (isLoadingNotifications) {
        return (
            <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
                <Spinner className="h-12 w-12 text-primary" />
                <p className="ml-4 text-lg text-muted-foreground">Loading notifications...</p>
            </div>
        );
    }

  return (
    <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold flex items-center gap-2 mb-8">
            <Bell size={30}/> Notifications
        </h1>

        <Card>
            <CardHeader>
                <CardTitle>Your Recent Alerts</CardTitle>
                <CardDescription>All important updates regarding your store will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
                {paginatedNotifications.length > 0 ? (
                    <div className="space-y-4">
                        {paginatedNotifications.map(notification => (
                            <div
                              key={notification.id}
                              className="p-4 border-l-4 flex flex-wrap sm:flex-nowrap items-start justify-between gap-x-4 gap-y-1 rounded-r-md bg-accent/20"
                              style={{
                                borderColor:
                                  notification.type === 'subscription'
                                    ? 'hsl(var(--destructive))'
                                    : notification.type === 'inventory'
                                    ? 'hsl(var(--chart-4))'
                                    : notification.type === 'admin'
                                    ? 'hsl(var(--chart-1))'
                                    : 'hsl(var(--chart-2))',
                              }}
                            >
                              <div className="flex items-start gap-4 flex-grow min-w-0">
                                <div className="mt-1 shrink-0">{getNotificationIcon(notification.type)}</div>
                                <div className="flex-grow min-w-0">
                                  <p className="font-semibold">{notification.title}</p>
                                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground shrink-0 w-full sm:w-auto text-right sm:text-left whitespace-nowrap">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 text-muted-foreground">
                        <Bell className="mx-auto h-12 w-12 mb-4" />
                        <p>You have no notifications right now.</p>
                    </div>
                )}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center space-x-2 mt-6 pt-4 border-t">
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1}>
                        <ChevronLeft className="h-4 w-4 mr-1" />Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages}>
                        Next<ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
  );
}
