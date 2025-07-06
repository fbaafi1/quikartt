
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
import { useUser } from "@/contexts/UserContext";
import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { supabase } from "@/lib/supabaseClient";
import { Spinner } from "@/components/ui/spinner";

const formSchema = z.object({
  password: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmPassword: z.string().min(6, { message: "Please confirm your new password." }),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match.",
  path: ["confirmPassword"], 
});

export default function UpdatePasswordPage() {
  const { session } = useUser(); // We need session to know if user arrived via recovery link
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRecoveryFlow, setIsRecoveryFlow] = useState(false);

  useEffect(() => {
    if (session) {
      setIsRecoveryFlow(true);
    } else {
      console.warn("Invalid Link or Session: This password update link may be invalid or expired.");
    }
  }, [session]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!isRecoveryFlow) {
      console.error("Cannot Update Password: No valid recovery session found.");
      return;
    }
    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: values.password,
    });

    setIsLoading(false);

    if (error) {
      console.error("Error Updating Password:", error.message);
    } else {
      router.push('/auth/login');
    }
  }
  
  if (session === undefined) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-4">
        <Spinner className="h-12 w-12 text-primary" />
        <p className="mt-4 text-muted-foreground">Verifying session...</p>
      </div>
    );
  }


  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-12rem)] py-4">
      <Card className="w-full max-w-sm mx-auto">
        <CardHeader className="p-4">
          <CardTitle className="text-xl">Set New Password</CardTitle>
          <CardDescription>
            {isRecoveryFlow 
                ? "Enter your new password below."
                : "If you requested a password reset, please use the link sent to your email."
            }
            </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          {isRecoveryFlow ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showPassword ? "text" : "password"} 
                            {...field} 
                            className="pr-10"
                          />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <div className="relative">
                        <FormControl>
                          <Input 
                            type={showConfirmPassword ? "text" : "password"} 
                            {...field} 
                            className="pr-10"
                           />
                        </FormControl>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <KeyRound className="mr-2 h-4 w-4" />
                  )}
                  Update Password
                </Button>
              </form>
            </Form>
          ) : (
             <Button variant="outline" asChild className="w-full">
                <Link href="/auth/login">Back to Login</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
