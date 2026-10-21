// Icon fonts can't load under Jest; render the icon name as text instead.
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = require("react-native");
  const { createElement } = require("react");
  return { __esModule: true, default: ({ name }: { name: string }) => createElement(Text, null, name) };
});

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("@react-native-google-signin/google-signin", () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(),
    signIn: jest.fn(),
  },
  isErrorWithCode: (error: unknown): error is { code: string } =>
    typeof error === "object" && error !== null && "code" in error,
}));
