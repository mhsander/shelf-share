import { act, render, waitFor } from "@testing-library/react-native";
import { createElement, useEffect } from "react";

import { AuthProvider, isGoogleSignInCancellation, useAuth } from "@/hooks/use-auth";

let currentAuth: ReturnType<typeof useAuth> | null = null;

jest.mock("@react-native-google-signin/google-signin", () => {
  throw new Error("RNGoogleSignin is unavailable in Expo Go");
});
jest.mock("@/lib/supabase", () => {
  const mocks = {
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(
      (callback: (event: string, session: unknown) => void) => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    ),
    signOut: jest.fn(),
    invoke: jest.fn(),
  };
  return {
    isSupabaseConfigured: true,
    requireSupabase: () => ({
      auth: {
        getSession: mocks.getSession,
        onAuthStateChange: mocks.onAuthStateChange,
        signOut: mocks.signOut,
      },
      functions: { invoke: mocks.invoke },
    }),
    __mocks: mocks,
  };
});
jest.mock("@/lib/push-notifications", () => ({
  unregisterPushToken: jest.fn(),
}));

const authMocks = jest.requireMock("@/lib/supabase").__mocks as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
  signOut: jest.Mock;
  invoke: jest.Mock;
};
const mockGetSession = authMocks.getSession;
const mockOnAuthStateChange = authMocks.onAuthStateChange;
const mockSignOut = authMocks.signOut;
const mockInvoke = authMocks.invoke;
const mockUnregisterPushToken = jest.requireMock("@/lib/push-notifications")
  .unregisterPushToken as jest.Mock;
let resolveInitialSession:
  | ((result: { data: { session: unknown }; error: null }) => void)
  | null = null;
const mockSession = {
  access_token: "access-token",
  refresh_token: "refresh-token",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: 4_000_000_000,
  user: {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: "",
  },
};

function AuthConsumer() {
  const auth = useAuth();
  useEffect(() => {
    currentAuth = auth;
  }, [auth]);
  return null;
}

function getCurrentAuth() {
  if (!currentAuth) throw new Error("Auth provider is not mounted.");
  return currentAuth;
}

async function renderAuthProvider() {
  const result = render(
    createElement(AuthProvider, null, createElement(AuthConsumer)),
  );
  await waitFor(() => expect(resolveInitialSession).not.toBeNull());
  await act(async () => {
    resolveInitialSession?.({ data: { session: mockSession }, error: null });
    await Promise.resolve();
  });
  await waitFor(() => expect(currentAuth?.loading).toBe(false));
  return result;
}

beforeEach(() => {
  jest.clearAllMocks();
  currentAuth = null;
  resolveInitialSession = null;
  mockGetSession.mockImplementation(
    () =>
      new Promise((resolve: (result: { data: { session: unknown }; error: null }) => void) => {
        resolveInitialSession = resolve;
      }),
  );
  mockUnregisterPushToken.mockResolvedValue(undefined);
  mockSignOut.mockImplementation(async () => {
    mockOnAuthStateChange.mock.calls[0]?.[0]("SIGNED_OUT", null);
    return { error: null };
  });
  mockInvoke.mockResolvedValue({ data: { message: "Account deleted." }, error: null });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("Google sign-in module loading", () => {
  it("allows the auth module to load when the native module is unavailable", () => {
    expect(isGoogleSignInCancellation(new Error("not cancelled"))).toBe(false);
  });

  it("recognizes Google sign-in cancellation errors without importing the native module", () => {
    expect(isGoogleSignInCancellation({ code: "SIGN_IN_CANCELLED" })).toBe(true);
  });
});

describe("auth account actions", () => {
  it("unregisters push notifications before signing out", async () => {
    await renderAuthProvider();

    await act(async () => {
      await getCurrentAuth().signOut();
    });

    expect(mockUnregisterPushToken).toHaveBeenCalledTimes(1);
    expect(mockSignOut).toHaveBeenCalledWith();
    expect(
      mockUnregisterPushToken.mock.invocationCallOrder[0],
    ).toBeLessThan(mockSignOut.mock.invocationCallOrder[0]);
    await waitFor(() => expect(currentAuth?.session).toBeNull());
  });

  it("continues signing out when push-token cleanup fails", async () => {
    const warning = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockUnregisterPushToken.mockRejectedValueOnce(new Error("offline"));
    await renderAuthProvider();

    await act(async () => {
      await getCurrentAuth().signOut();
    });

    expect(mockSignOut).toHaveBeenCalledWith();
    expect(warning).toHaveBeenCalledWith(
      "Could not unregister the push token before signing out.",
      expect.any(Error),
    );
    warning.mockRestore();
  });

  it("deletes the account remotely before clearing the local session", async () => {
    await renderAuthProvider();

    await act(async () => {
      await getCurrentAuth().deleteAccount();
    });

    expect(mockInvoke).toHaveBeenCalledWith("delete-account", { method: "POST" });
    expect(mockSignOut).toHaveBeenCalledWith({ scope: "local" });
    await waitFor(() => expect(currentAuth?.session).toBeNull());
  });

  it("keeps the session when remote account deletion fails", async () => {
    const deletionError = new Error("network unavailable");
    mockInvoke.mockResolvedValueOnce({ data: null, error: deletionError });
    await renderAuthProvider();

    await act(async () => {
      await expect(getCurrentAuth().deleteAccount()).rejects.toBe(deletionError);
    });

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(currentAuth?.session?.user.id).toBe("user-1");
  });
});
