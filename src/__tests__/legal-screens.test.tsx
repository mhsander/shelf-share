import { render, screen } from "@testing-library/react-native";

import PrivacyScreen from "@/app/privacy";
import TermsScreen from "@/app/terms";

jest.mock("expo-router", () => ({ router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() } }));

describe("legal screens", () => {
  it("shows the privacy policy", async () => {
    await render(<PrivacyScreen />);
    expect(screen.getByText("Privacy policy")).toBeOnTheScreen();
    expect(screen.getByText("What we collect")).toBeOnTheScreen();
    expect(screen.getByText(/do not sell, rent, or trade/)).toBeOnTheScreen();
  });

  it("shows the terms of service", async () => {
    await render(<TermsScreen />);
    expect(screen.getByText("Terms of service")).toBeOnTheScreen();
    expect(screen.getByText("Lending is between members")).toBeOnTheScreen();
  });
});
