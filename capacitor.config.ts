import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.strategyboard.app',
  appName: 'Strategy Board',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
