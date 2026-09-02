import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { createClient } from './client';

// Initialize Google Auth with Web Client ID
if (typeof window !== 'undefined') {
  GoogleAuth.initialize({
    clientId: '533663504579-5a26jfnm0cae7oa1it3rekpc02g05n2b.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

export async function handleGoogleSignIn() {
  const supabase = createClient();

  if (Capacitor.isNativePlatform()) {
    // Native: Use GoogleAuth.signIn() → idToken → signInWithIdToken
    const googleUser = await GoogleAuth.signIn();

    if (!googleUser.authentication.idToken) {
      throw new Error("لم يتم الحصول على idToken من Google");
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleUser.authentication.idToken,
    });

    if (error) throw error;
    return data;
  } else {
    // Web: Use standard OAuth redirect
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
  }
}

export async function signOutGoogle() {
  try {
    await GoogleAuth.signOut();
  } catch (err) {
    console.error('Google Sign Out Error:', err);
  }
}
