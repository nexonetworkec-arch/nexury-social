import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.nexury.app',
  appName: 'Nexury',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
