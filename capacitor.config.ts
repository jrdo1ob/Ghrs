import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ghrs.app',
  appName: 'غرس',
  webDir: '.next',
  server: {
    androidScheme: 'https',
    url: 'https://ghrs-cyan.vercel.app',
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
    App: {
      // Deep Linking scheme
      androidScheme: 'com.ghrs.app',
    },
  },
  android: {
    allowMixedContent: false,
    backgroundColor: '#0f172a',
  },
};

export default config;
