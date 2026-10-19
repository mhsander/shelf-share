import { fireEvent, render, screen } from "@testing-library/react-native";
import { router } from "expo-router";
import { Text } from "react-native";

import EditProfileScreen from "@/app/edit-profile";
import { ProfileProvider, useProfile } from "@/hooks/use-profile";
import type { Profile } from "@/types/profile";

jest.mock("expo-router", () => ({ router: { back: jest.fn() } }));

const profile: Profile = { displayName: "Ana", city: "Seattle", neighborhood: "Capitol Hill", avatarUrl: null };

// Prints the stored profile so tests can see what was saved.
function ProfileProbe() {
  const { profile: p } = useProfile();
  return <Text testID="probe">{`${p.displayName}|${p.city}|${p.neighborhood}`}</Text>;
}

async function renderForm() {
  await render(
    <ProfileProvider initialProfile={profile} initialBlocked={[]}>
      <EditProfileScreen />
      <ProfileProbe />
    </ProfileProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

describe("EditProfileScreen", () => {
  it("prefills the current profile", async () => {
    await renderForm();

    expect(screen.getByLabelText("Display name")).toHaveDisplayValue("Ana");
    expect(screen.getByLabelText("City")).toHaveDisplayValue("Seattle");
    expect(screen.getByLabelText("Neighborhood (optional)")).toHaveDisplayValue("Capitol Hill");
  });

  it("shows no errors before anything is edited", async () => {
    await renderForm();

    expect(screen.queryByText("Add your name.")).not.toBeOnTheScreen();
    expect(screen.queryByText("Add your city.")).not.toBeOnTheScreen();
  });

  it("shows an error and disables Save once a required field is cleared", async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText("City"), "   ");

    expect(screen.getByText("Add your city.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves trimmed values, clears an emptied neighborhood, and goes back", async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText("Display name"), " Ana R ");
    await fireEvent.changeText(screen.getByLabelText("Neighborhood (optional)"), "");
    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByTestId("probe")).toHaveTextContent("Ana R|Seattle|null");
    expect(router.back).toHaveBeenCalledTimes(1);
  });

  it("cancel leaves the profile unchanged", async () => {
    await renderForm();

    await fireEvent.changeText(screen.getByLabelText("Display name"), "Someone else");
    await fireEvent.press(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByTestId("probe")).toHaveTextContent("Ana|Seattle|Capitol Hill");
    expect(router.back).toHaveBeenCalledTimes(1);
  });
});
