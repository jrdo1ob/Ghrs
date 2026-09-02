import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { createClient } from './client';

// Initialize Google Auth with Web Application Client ID
// IMPORTANT: This must be the WEB CLIENT ID from Google Cloud Console
// NOT the Android Client ID
if (typeof window !== 'undefined') {
  GoogleAuth.initialize({
    clientId: '533663504579-5a26jfnm0cae7oa1it3rekpc02g05n2b.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

export async function handleGoogleSignIn() {
  const supabase = createClient();

  // Open native Android Google Sign-In dialog directly
  // This does NOT open a browser - it opens the native Android account picker
  const googleUser = await GoogleAuth.signIn();

  if (!googleUser.authentication.idToken) {
    throw new Error("لم يتم إرجاع idToken من نظام أندرويد");
  }

  // Pass token to Supabase directly without OAuth redirect or PKCE
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: googleUser.authentication.idToken,
  });

  if (error) throw error;
  return data;
}

export async function signOutGoogle() {
  try {
    await GoogleAuth.signOut();
  } catch (err) {
    console.error('Google Sign Out Error:', err);
  }
}
