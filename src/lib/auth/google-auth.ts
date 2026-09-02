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
 * Detect if running in native Android environment
 * Uses multiple checks for reliability
 */
function isNativeAndroid(): boolean {
  try {
    // Check 1: Capacitor native platform detection
    if (Capacitor.isNativePlatform()) {
      console.log('[GHRS] Detected native platform:', Capacitor.getPlatform());
      return true;
    }

    // Check 2: Check if running in Android WebView
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Android')) {
      // Additional check: if Capacitor plugins are available, it's likely native
      if (typeof (window as any).Capacitor !== 'undefined') {
        console.log('[GHRS] Detected Android with Capacitor');
        return true;
      }
    }

    console.log('[GHRS] Running in web browser mode');
    return false;
  } catch (err) {
    console.log('[GHRS] Platform detection error, defaulting to web:', err);
    return false;
  }
}

/**
 * Handle Google Sign-In for both Native and Web
 * 
 * Android: GoogleAuth.signIn() → idToken → signInWithIdToken (NO PKCE)
 * Web: signInWithOAuth → /auth/callback (standard OAuth)
 */
export async function handleGoogleSignIn() {
  const supabase = createClient();
  const isNative = isNativeAndroid();

  console.log('[GHRS] Google Sign-In - Platform:', isNative ? 'NATIVE Android' : 'WEB');
  console.log('[GHRS] Capacitor.getPlatform():', Capacitor.getPlatform());
  console.log('[GHRS] Capacitor.isNativePlatform():', Capacitor.isNativePlatform());

  if (isNative) {
    // ===== NATIVE ANDROID PATH =====
    // Opens Android's native Google account picker (NO browser)
    console.log('[GHRS] Using NATIVE Google Auth path');
    
    const googleUser = await GoogleAuth.signIn();
    console.log('[GHRS] GoogleAuth.signIn() completed');

    if (!googleUser.authentication.idToken) {
      console.error('[GHRS] No idToken received from Google');
      throw new Error("لم يتم إرجاع idToken من Google");
    }

    console.log('[GHRS] idToken received, calling signInWithIdToken');

    // Send idToken directly to Supabase (NO OAuth redirect, NO PKCE)
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleUser.authentication.idToken,
    });

    if (error) {
      console.error('[GHRS] signInWithIdToken error:', error.message);
      throw error;
    }

    console.log('[GHRS] signInWithIdToken SUCCESS - Session created');
    return data;

  } else {
    // ===== WEB PATH =====
    // Standard OAuth redirect for browser
    console.log('[GHRS] Using WEB OAuth path');

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
      console.error('[GHRS] signInWithOAuth error:', error.message);
      throw error;
    }

    console.log('[GHRS] signInWithOAuth redirect initiated');
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
