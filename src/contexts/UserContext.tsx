"use client";

import type { User, UserRole, Address } from '@/lib/types';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import type { AuthChangeEvent, Session, User as SupabaseAuthUser, Provider } from '@supabase/supabase-js';

interface UserContextType {
  currentUser: User | null;
  login: (email: string, password_do_not_log: string) => Promise<{ success: boolean; error?: string | null }>;
  signup: (name: string, email: string, password_do_not_log: string, roleHint?: UserRole) => Promise<{ success: boolean; error?: string | null }>;
  signInWithGoogle: () => Promise<{ error?: Error | null }>;
  logout: () => Promise<void>;
  updateUser: (updatedInfo: Partial<User>) => Promise<{ success: boolean; error?: string | null }>;
  loadingUser: boolean;
  session: Session | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const router = useRouter();

  const fetchUserProfile = async (authUser: SupabaseAuthUser): Promise<User | null> => {
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        // A real error occurred, not just "no rows found"
        console.error('Error fetching user profile:', JSON.stringify(error, null, 2));
        // This is likely an auth error, like an invalid token. Return null to signal failure.
        return null;
      }
      
      if (profile) {
        return profile as User;
      } else {
        // Profile doesn't exist yet, which is fine for new users.
        // The handle_new_user trigger will create it. Let's build a temporary profile.
        console.warn(`Profile not found for user ${authUser.id}. Using basic info from auth user.`);
        return {
          id: authUser.id,
          email: authUser.email || 'No email provided',
          name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'QuiKart User',
          role: (authUser.user_metadata?.role as UserRole) || 'customer',
        };
      }
    } catch (err: any) {
      console.error("Exception during user profile fetch:", err);
      // Catching other exceptions, possibly network errors.
      return null;
    }
  };

  useEffect(() => {
    setLoadingUser(true);
    const { data: authListenerData } = supabase.auth.onAuthStateChange(async (event, sessionState) => {
      setSession(sessionState);

      if (sessionState?.user) {
        const userProfile = await fetchUserProfile(sessionState.user);
        
        // This is the key fix: if we have a session but can't fetch a profile,
        // it means the session is invalid or corrupt. We must sign out.
        if (!userProfile) {
          console.warn("User session found, but profile could not be fetched. Forcing sign-out.");
          await supabase.auth.signOut();
          setCurrentUser(null);
        } else {
          setCurrentUser(userProfile);
          // Only perform automatic redirection on initial sign-in.
          const searchParams = new URLSearchParams(window.location.search);
          const redirectUrl = searchParams.get('redirect');
          if (event === 'SIGNED_IN' && !redirectUrl) {
            if (userProfile.role === 'admin') {
              router.push('/admin');
            } else if (userProfile.role === 'vendor') {
              router.push('/vendor/dashboard');
            } else {
              router.push('/');
            }
          }
        }
      } else {
        // No session exists, ensure user is cleared.
        setCurrentUser(null);
      }
      setLoadingUser(false);
    });

    return () => {
      authListenerData.subscription.unsubscribe();
    };
  }, [router]);

  const login = async (email: string, password_do_not_log: string): Promise<{ success: boolean; error?: string | null }> => {
    setLoadingUser(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: password_do_not_log,
    });
    // setLoadingUser(false) is handled by onAuthStateChange
    if (error) {
      setLoadingUser(false);
      return { success: false, error: error.message };
    }
    return { success: true };
  };

  const signup = async (name: string, email: string, password_do_not_log: string, roleHint: UserRole = 'customer'): Promise<{ success: boolean; error?: string | null }> => {
    setLoadingUser(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: password_do_not_log,
      options: {
        data: {
          full_name: name,
          role: roleHint,
        },
      },
    });

    if (error) {
      setLoadingUser(false);
      return { success: false, error: error.message };
    }
    if (data.user && !data.session && data.user.identities && data.user.identities.length === 0) {
      setLoadingUser(false);
      return { success: true, error: "Signup successful. Please check your email to confirm your account if required." };
    }
    if (data.user && data.session) {
      return { success: true };
    }
    setLoadingUser(false);
    return { success: false, error: "Signup process did not complete as expected. Please try again or check your email." };
  };

  const signInWithGoogle = async (): Promise<{ error?: Error | null }> => {
    setLoadingUser(true);
    // By not specifying `redirectTo`, we rely on the Site URL configured in the Supabase dashboard.
    // This is often more reliable and the recommended approach.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    
    // The browser will redirect to Google. If it fails and returns an error immediately, this code will execute.
    if (error) {
      setLoadingUser(false);
      console.error("Google Sign-In Error:", error);
      return { error };
    }
    // If successful, the browser redirects and this part of the code is not reached.
    return { error: null };
  };

  const logout = async () => {
    setLoadingUser(true);
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const updateUser = async (updatedInfo: Partial<User>): Promise<{ success: boolean; error?: string | null }> => {
    if (!currentUser || !currentUser.id) {
      return { success: false, error: "No user to update." };
    }
    setLoadingUser(true);

    try {
      // Separate auth updates (like email) from profile updates
      const { email, ...profileUpdates } = updatedInfo;

      // Handle email change separately as it's a sensitive auth action
      if (email && email.toLowerCase() !== currentUser.email.toLowerCase()) {
        const { error: authError } = await supabase.auth.updateUser({ email });
        if (authError) throw authError;
        // Supabase will send a confirmation email. The email isn't updated until confirmed.
        console.log("A confirmation link has been sent to your new email address.");
      }

      // Update the rest of the profile info in user_profiles table if there are any
      if (Object.keys(profileUpdates).length > 0) {
          const { data: profileData, error: profileError } = await supabase
              .from('user_profiles')
              .update(profileUpdates)
              .eq('id', currentUser.id)
              .select()
              .single();
          
          if (profileError) throw profileError;
          
          if (profileData) {
              setCurrentUser(profileData as User);
          }
      }
      
      return { success: true };
    } catch (error: any) {
      console.error("Profile update failed:", error);
      return { success: false, error: error.message };
    } finally {
      setLoadingUser(false);
    }
  };


  return (
    <UserContext.Provider value={{ currentUser, session, login, signup, signInWithGoogle, logout, updateUser, loadingUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
