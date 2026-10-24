import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleMapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyAzCIdLeWQ3lA2MZ0X2FxZEL1siC_gJyc0';

  return {
    ...config,
    name: config.name ?? 'Smart Asset Tracker',
    slug: config.slug ?? 'sats',
    android: {
      ...config.android,
      package: 'com.smartassettracker',
      config: {
        googleMaps: {
          apiKey: googleMapsApiKey,
        },
      },
    },
    ios: {
      ...config.ios,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS,
      },
    },
    extra: {
      ...config.extra,
      googleMapsApiKey,
    },
  };
};
