
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { Mail } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [messageSent, setMessageSent] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setMessageSent(false);

    const siteUrl = window.location.origin; // Get current site URL
    const redirectTo = `${siteUrl}/auth/update-password`;


    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: redirectTo,
    });

    setIsLoading(false);

    if (error) {
      console.error("Error Sending Email:", error.message);
    } else {
      setMessageSent(true);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="p-4">
          <CardTitle className="text-xl">Forgot Your Password?</CardTitle>
          <CardDescription>
            {messageSent 
              ? "A reset link has been sent. Please check your email."
              : "Enter your email address and we'll send you a link to reset your password."
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {!messageSent ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Mail className="mr-2 h-4 w-4" />
                  )}
                  Send Reset Link
                </Button>
              </form>
            </Form>
          ) : (
             <Button variant="outline" asChild className="w-full">
                <Link href="/auth/login">Back to Login</Link>
            </Button>
          )}
          {!messageSent && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Remember your password?{" "}
              <Button variant="link" asChild className="p-0 h-auto">
                <Link href="/auth/login">Log in</Link>
              </Button>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
