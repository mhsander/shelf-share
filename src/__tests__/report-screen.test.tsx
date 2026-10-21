import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";

import ReportScreen from "@/app/report/[userId]";
import { requireSupabase } from "@/lib/supabase";

const mockRpc = jest.fn();

jest.mock("expo-router", () => ({
  router: { back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ session: { user: { id: "reporter-id" } } }),
}));
jest.mock("@/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation(() => {});
  (useLocalSearchParams as jest.Mock).mockReturnValue({
    userId: "reported-id",
    requestId: "request-id",
  });
  (requireSupabase as jest.Mock).mockReturnValue({ rpc: mockRpc });
  mockRpc.mockResolvedValue({ error: null });
});

describe("ReportScreen", () => {
  it("submits a request-linked report with the selected reason and trimmed details", async () => {
    await render(<ReportScreen />);
    await fireEvent.press(screen.getByRole("radio", { name: "Harassment or unsafe behavior" }));
    await fireEvent.changeText(
      screen.getByLabelText("Additional details"),
      "  Unsafe messages in the thread.  ",
    );
    await fireEvent.press(screen.getByRole("button", { name: "Submit report" }));

    await waitFor(() =>
      expect(mockRpc).toHaveBeenCalledWith("submit_report", {
        p_reported_user_id: "reported-id",
        p_reason: "harassment",
        p_details: "Unsafe messages in the thread.",
        p_request_id: "request-id",
      }),
    );
    expect(Alert.alert).toHaveBeenCalledWith(
      "Report submitted",
      "Thank you. Your report has been submitted.",
      expect.any(Array),
    );
    const successButtons = (Alert.alert as jest.Mock).mock.calls.at(-1)?.[2] as {
      onPress?: () => void;
    }[];
    successButtons[0].onPress?.();
    expect(router.back).toHaveBeenCalled();
  });

  it("requires a reason before enabling submission", async () => {
    await render(<ReportScreen />);
    expect(screen.getByRole("button", { name: "Submit report" })).toBeDisabled();
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("shows report submission failures", async () => {
    mockRpc.mockResolvedValue({ error: new Error("offline") });
    await render(<ReportScreen />);
    await fireEvent.press(screen.getByRole("radio", { name: "Spam" }));
    await fireEvent.press(screen.getByRole("button", { name: "Submit report" }));
    await waitFor(() =>
      expect(Alert.alert).toHaveBeenCalledWith(
        "Couldn't submit your report",
        "offline",
      ),
    );
  });
});
