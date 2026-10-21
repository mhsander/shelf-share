import { fireEvent, render, screen } from "@testing-library/react-native";
import { router, useLocalSearchParams } from "expo-router";

import ActivityScreen from "@/app/(tabs)/activity";
import RequestDetailScreen from "@/app/requests/[id]";
import { invalidateBorrowRequests, useBorrowRequest, useBorrowRequests } from "@/hooks/use-requests";
import { requireSupabase } from "@/lib/supabase";
import type { BorrowRequestDetails, BorrowRequestSummary } from "@/hooks/use-requests";

const mockRpc = jest.fn();
const mockInsert = jest.fn();
const mockInvalidate = jest.fn();
const book = { id: "book-1", title: "Piranesi", author: "Susanna Clarke", coverUrl: null };
const request: BorrowRequestDetails = {
  id: "request-1",
  status: "requested",
  createdAt: "2026-10-20T10:00:00Z",
  activityAt: "2026-10-20T10:00:00Z",
  dueDate: null,
  role: "lender",
  counterpartName: "Ana",
  book,
  latestMessage: "Could I borrow this?",
  borrowerId: "borrower-1",
  lenderId: "lender-1",
  borrowerName: "Ana",
  lenderName: "Ben",
  messages: [{
    id: "message-1",
    senderId: "borrower-1",
    senderName: "Ana",
    body: "Could I borrow this?",
    createdAt: "2026-10-20T10:00:00Z",
  }],
};

jest.mock("expo-router", () => ({
  router: { back: jest.fn(), push: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));
jest.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ session: { user: { id: "lender-1" } } }),
}));
jest.mock("@/hooks/use-requests", () => ({
  useBorrowRequest: jest.fn(),
  useBorrowRequests: jest.fn(),
  invalidateBorrowRequests: jest.fn(),
}));
jest.mock("@/lib/supabase", () => ({
  requireSupabase: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({ id: request.id });
  (useBorrowRequest as jest.Mock).mockReturnValue({ data: request, isLoading: false, error: null });
  (useBorrowRequests as jest.Mock).mockReturnValue({ data: [], isLoading: false, error: null, refetch: jest.fn() });
  (requireSupabase as jest.Mock).mockReturnValue({
    rpc: mockRpc,
    from: jest.fn(() => ({ insert: mockInsert })),
  });
  (invalidateBorrowRequests as jest.Mock).mockImplementation(mockInvalidate);
  mockRpc.mockResolvedValue({ data: "accepted", error: null });
  mockInsert.mockResolvedValue({ error: null });
});

describe("ActivityScreen", () => {
  it("groups requests by status and opens the request thread", async () => {
    const rows: BorrowRequestSummary[] = [
      { ...request, role: "lender", status: "requested" },
      { ...request, id: "request-2", role: "borrower", status: "accepted", dueDate: "2026-11-10" },
      { ...request, id: "request-3", role: "lender", status: "returned" },
    ];
    (useBorrowRequests as jest.Mock).mockReturnValue({ data: rows, isLoading: false, error: null, refetch: jest.fn() });

    await render(<ActivityScreen />);

    expect(screen.getByText("Needs a response")).toBeOnTheScreen();
    expect(screen.getByText("In progress")).toBeOnTheScreen();
    expect(screen.getByText("Past requests")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Piranesi, Ana wants to borrow" }));
    expect(router.push).toHaveBeenCalledWith({ pathname: "/requests/[id]", params: { id: "request-1" } });
  });

  it("shows the empty activity state", async () => {
    await render(<ActivityScreen />);
    expect(screen.getByText("Borrow requests and loan updates will show up here.")).toBeOnTheScreen();
  });
});

describe("RequestDetailScreen", () => {
  it("shows the request thread and lets the lender accept", async () => {
    await render(<RequestDetailScreen />);

    expect(screen.getByText("Ana wants to borrow")).toBeOnTheScreen();
    expect(screen.getByText("Could I borrow this?")).toBeOnTheScreen();
    expect(screen.getByText("Requested")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Accept · due in 3 weeks" }));

    expect(mockRpc).toHaveBeenCalledWith("respond_to_request", {
      p_request_id: request.id,
      p_response: "accepted",
    });
    expect(mockInvalidate).toHaveBeenCalledWith(request.id);
  });

  it("sends messages in the request thread", async () => {
    await render(<RequestDetailScreen />);
    await fireEvent.changeText(screen.getByLabelText("Message Ana"), "Saturday works.");
    await fireEvent.press(screen.getByRole("button", { name: "Send message" }));

    expect(mockInsert).toHaveBeenCalledWith({
      request_id: request.id,
      sender_id: "lender-1",
      body: "Saturday works.",
    });
    expect(mockInvalidate).toHaveBeenCalledWith(request.id);
  });

  it("lets a lender mark an accepted request lent and later returned", async () => {
    (useBorrowRequest as jest.Mock).mockReturnValue({
      data: { ...request, status: "accepted", dueDate: "2026-11-10" },
      isLoading: false,
      error: null,
    });
    await render(<RequestDetailScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Mark as lent" }));
    expect(mockRpc).toHaveBeenCalledWith("mark_lent", { p_request_id: request.id });

    jest.clearAllMocks();
    (useBorrowRequest as jest.Mock).mockReturnValue({
      data: { ...request, status: "lent", dueDate: "2026-11-10" },
      isLoading: false,
      error: null,
    });
    await render(<RequestDetailScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Mark as returned" }));
    expect(mockRpc).toHaveBeenCalledWith("mark_returned", { p_request_id: request.id });
  });

  it("lets a borrower cancel a pending request", async () => {
    (useBorrowRequest as jest.Mock).mockReturnValue({
      data: { ...request, role: "borrower", borrowerId: "lender-1", lenderId: "borrower-1" },
      isLoading: false,
      error: null,
    });
    await render(<RequestDetailScreen />);
    await fireEvent.press(screen.getByRole("button", { name: "Cancel request" }));
    expect(mockRpc).toHaveBeenCalledWith("cancel_request", { p_request_id: request.id });
  });
});
