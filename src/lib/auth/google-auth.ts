import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { createClient } from '@/lib/supabase/client';

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
 * Android: GoogleAuth.signIn() → idToken → signInWithIdToken (NO PKCE)
 * Web: signInWithOAuth → /auth/callback (standard OAuth)
 */
export async function handleGoogleSignIn() {
  const supabase = createClient();
  
  // Official Capacitor platform detection
  const nativePlatform = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();
  const nativeAndroid = nativePlatform && platform === 'android';

  console.log('[GHRS AUTH] platform =', platform);
  console.log('[GHRS AUTH] nativePlatform =', nativePlatform);
  console.log('[GHRS AUTH] nativeAndroid =', nativeAndroid);

  if (nativeAndroid) {
    // ===== NATIVE ANDROID PATH =====
    // Opens Android's native Google account picker (NO browser)
    console.log('[GHRS AUTH] GoogleAuth.signIn started');
    
    const googleUser = await GoogleAuth.signIn();
    console.log('[GHRS AUTH] GoogleAuth.signIn returned');

    if (!googleUser.authentication.idToken) {
      console.error('[GHRS AUTH] No idToken received from Google');
      throw new Error("لم يتم إرجاع idToken من Google");
    }

    console.log('[GHRS AUTH] signInWithIdToken started');

    // Send idToken directly to Supabase (NO OAuth redirect, NO PKCE)
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleUser.authentication.idToken,
    });

    if (error) {
      console.error('[GHRS AUTH] signInWithIdToken error:', error.message);
      throw error;
    }

    console.log('[GHRS AUTH] signInWithIdToken success');
    return data;

  } else {
    // ===== WEB PATH =====
    // Standard OAuth redirect for browser
    console.log('[GHRS AUTH] Web OAuth started');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error('[GHRS AUTH] signInWithOAuth error:', error.message);
      throw error;
    }

    console.log('[GHRS AUTH] signInWithOAuth redirect initiated');
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
