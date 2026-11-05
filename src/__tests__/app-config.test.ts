import type { ConfigContext, ExpoConfig } from "expo/config";

import appConfig from "../../app.config";

const GOOGLE = "@react-native-google-signin/google-signin";

const baseConfig: ExpoConfig = {
  name: "Shelf Share",
  slug: "shelf-share",
  plugins: [
    "expo-router",
    [GOOGLE, { iosUrlScheme: "com.googleusercontent.apps.PLACEHOLDER" }],
    "expo-apple-authentication",
  ],
};

const googleEntries = (config: ExpoConfig) =>
  (config.plugins ?? []).filter((p) =>
    Array.isArray(p) ? p[0] === GOOGLE : p === GOOGLE,
  );

describe("app.config", () => {
  const original = process.env.GOOGLE_IOS_URL_SCHEME;
  afterEach(() => {
    process.env.GOOGLE_IOS_URL_SCHEME = original;
  });

  it("drops the placeholder Google plugin when no URL scheme is set", () => {
    delete process.env.GOOGLE_IOS_URL_SCHEME;
    const result = appConfig({ config: baseConfig } as ConfigContext);
    expect(googleEntries(result)).toEqual([]);
  });

  it("includes exactly one Google plugin using the env URL scheme", () => {
    process.env.GOOGLE_IOS_URL_SCHEME = "com.googleusercontent.apps.real";
    const result = appConfig({ config: baseConfig } as ConfigContext);
    expect(googleEntries(result)).toEqual([
      [GOOGLE, { iosUrlScheme: "com.googleusercontent.apps.real" }],
    ]);
  });

  it("includes expo-apple-authentication exactly once", () => {
    const result = appConfig({ config: baseConfig } as ConfigContext);
    expect(
      (result.plugins ?? []).filter((p) => p === "expo-apple-authentication"),
    ).toHaveLength(1);
  });
});
