export default {
  expo: {
    name: 'keepsy',
    slug: 'keepsy',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/keepsy-logo-official.png',
    scheme: 'yearbook',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/images/keepsy-logo-official.png',
      resizeMode: 'contain',
      backgroundColor: '#000000',
    },
    ios: {
      supportsTablet: true,
    },
    android: {
      softwareKeyboardLayoutMode: 'resize',
      adaptiveIcon: {
        backgroundColor: '#E6F4FE',
        foregroundImage: './assets/images/android-icon-foreground.png',
        backgroundImage: './assets/images/android-icon-background.png',
        monochromeImage: './assets/images/android-icon-monochrome.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/images/keepsy-logo-official.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-image-picker',
        {
          photosPermission: 'Allow Keepsy to access your photos so you can set a profile picture.',
        },
      ],
      '@react-native-community/datetimepicker',
    ],
    experiments: {
      typedRoutes: true,
    },
  },
};
