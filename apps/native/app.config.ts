import { clientEnv } from "@relune/env/expo";
import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: "relune",
    slug: "relune",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "relune",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.mrevanzak.relune",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        UIBackgroundModes: ["remote-notification"],
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#fbebe1",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: "com.mrevanzak.relune",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#fbebe1",
        },
      ],
      "expo-audio",
      "react-native-bottom-tabs",
      "expo-document-picker",
      "@react-native-community/datetimepicker",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#d4aecd",
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },

    extra: {
      ...config?.extra,
      ...clientEnv,
      eas: {
        projectId: "80ccff1a-9f8c-4fbc-bae0-1b8838666cde",
      },
    },
    updates: {
      url: "https://u.expo.dev/80ccff1a-9f8c-4fbc-bae0-1b8838666cde",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
  };
};
