import { fireEvent, render, screen } from "@testing-library/react-native";

import SignInScreen from "@/app/sign-in";

const mockSignInWithGoogle = jest.fn();
const mockUseAuth = jest.fn();

jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => mockUseAuth(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockUseAuth.mockReturnValue({
    configured: false,
    error: null,
    signInWithGoogle: mockSignInWithGoogle,
    signInWithApple: jest.fn(),
  });
});

describe("SignInScreen", () => {
  it("explains the required Supabase configuration", async () => {
    await render(<SignInScreen />);

    expect(screen.getByText(/copying .env.example/)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: /Continue with Google/ }),
    ).toBeDisabled();
  });

  it("starts Google sign-in when connected", async () => {
    mockUseAuth.mockReturnValue({
      configured: true,
      error: null,
      signInWithGoogle: mockSignInWithGoogle,
      signInWithApple: jest.fn(),
    });
    await render(<SignInScreen />);

    await fireEvent.press(screen.getByRole("button", { name: /Continue with Google/ }));
    expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
  });
});
