'use client'

import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { createClient } from './client';

// Initialize Google Auth
if (typeof window !== 'undefined') {
  GoogleAuth.initialize({
    clientId: '533663504579-5a26jfnm0cae7oa1it3rekpc02g05n2b.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    grantOfflineAccess: true,
  });
}

export async function signInWithGoogleNative() {
  try {
    const googleUser = await GoogleAuth.signIn();
    
    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: googleUser.authentication.idToken,
    });

    if (error) throw error;
    return { data, error: null };
  } catch (err) {
    console.error('Google Auth Error:', err);
    return { data: null, error: err };
  }
}

export async function signOutGoogle() {
  try {
    await GoogleAuth.signOut();
  } catch (err) {
    console.error('Google Sign Out Error:', err);
  }
}
