import { isGoogleSignInCancellation } from "@/hooks/use-auth";

jest.mock("@react-native-google-signin/google-signin", () => {
  throw new Error("RNGoogleSignin is unavailable in Expo Go");
});

describe("Google sign-in module loading", () => {
  it("allows the auth module to load when the native module is unavailable", () => {
    expect(isGoogleSignInCancellation(new Error("not cancelled"))).toBe(false);
  });

  it("recognizes Google sign-in cancellation errors without importing the native module", () => {
    expect(isGoogleSignInCancellation({ code: "SIGN_IN_CANCELLED" })).toBe(true);
  });
});
