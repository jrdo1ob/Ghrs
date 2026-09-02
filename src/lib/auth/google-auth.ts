import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { createClient } from './client';

// Initialize Google Auth with Web Application Client ID
if (typeof window !== 'undefined') {
  GoogleAuth.initialize({
    clientId: '533663504579-5a26jfnm0cae7oa1it3rekpc02g05n2b.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

/**
 * Handle Google Sign-In for both Native and Web
 * 
 * Native (Capacitor): Uses GoogleAuth.signIn() → idToken → signInWithIdToken
 * Web: Uses OAuth redirect to https://ghrs-cyan.vercel.app/auth/callback
 */
export async function handleGoogleSignIn() {
  const supabase = createClient();

  if (Capacitor.isNativePlatform()) {
    // NATIVE: Open Android's native Google account picker
    // This does NOT open a browser - it opens the native dialog
    const googleUser = await GoogleAuth.signIn();

    if (!googleUser.authentication.idToken) {
      throw new Error("لم يتم إرجاع idToken من Google");
    }

    // Send idToken directly to Supabase (no OAuth redirect, no PKCE)
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleUser.authentication.idToken,
    });

    if (error) throw error;
    return data;
  } else {
    // WEB: Use standard OAuth redirect
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) throw error;
    return data;
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogle() {
  try {
    if (Capacitor.isNativePlatform()) {
      await GoogleAuth.signOut();
    }
  } catch (err) {
    console.error('Google Sign Out Error:', err);
  }
}
