import type { ConfigContext, ExpoConfig } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const googleIosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME;
  const plugins = (config.plugins ?? []).filter(
    (plugin) =>
      plugin !== "@react-native-google-signin/google-signin" &&
      plugin !== "expo-apple-authentication",
  );

  if (googleIosUrlScheme) {
    plugins.push([
      "@react-native-google-signin/google-signin",
      { iosUrlScheme: googleIosUrlScheme },
    ]);
  }

  plugins.push("expo-apple-authentication");
  return {
    ...config,
    name: config.name ?? "Shelf Share",
    slug: config.slug ?? "shelf-share",
    plugins,
  };
};
