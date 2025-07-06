
"use client";

import { AlertTriangle, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminOrderDetailPage() {
    return (
    <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
        <Card className="w-full max-w-md text-center">
            <CardHeader>
                <div className="mx-auto bg-destructive/10 p-3 rounded-full">
                    <AlertTriangle className="h-12 w-12 text-destructive" />
                </div>
                <CardTitle className="mt-4">Functionality Changed</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                    As an administrator, your role is to oversee the platform. Order management is now handled directly by individual vendors.
                </p>
                 <Button asChild>
                    <Link href="/admin"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
