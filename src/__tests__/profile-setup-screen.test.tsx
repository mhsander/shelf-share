import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { router } from "expo-router";

import ProfileSetupScreen from "@/app/profile-setup";

const mockCreateProfile = jest.fn();

jest.mock("expo-router", () => ({ router: { replace: jest.fn() } }));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    session: { user: { id: "user-a" } },
    signOut: jest.fn(),
  }),
}));
jest.mock("@/hooks/use-profile", () => ({
  useProfile: () => ({ createProfile: mockCreateProfile }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockCreateProfile.mockResolvedValue(undefined);
});

describe("ProfileSetupScreen", () => {
  it("requires a name and city before saving", async () => {
    await render(<ProfileSetupScreen />);

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText("Display name"), "Ana");

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("creates the required profile and continues into the app", async () => {
    await render(<ProfileSetupScreen />);
    await fireEvent.changeText(screen.getByLabelText("Display name"), " Ana Ruiz ");
    await fireEvent.changeText(screen.getByLabelText("City"), " Seattle ");
    await fireEvent.changeText(
      screen.getByLabelText("Neighborhood (optional)"),
      "Ballard",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() =>
      expect(mockCreateProfile).toHaveBeenCalledWith({
        displayName: "Ana Ruiz",
        city: "Seattle",
        neighborhood: "Ballard",
      }),
    );
    expect(router.replace).toHaveBeenCalledWith("/(tabs)");
  });
});
