import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ghrs.app',
  appName: 'غرس',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 3000,
      backgroundColor: '#0f172a',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
      overlaysWebView: true,
    },
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '533663504579-5a26jfnm0cae7oa1it3rekpc02g05n2b.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
};

export default config;
