// Icon fonts can't load under Jest; render the icon name as text instead.
jest.mock("@expo/vector-icons/Ionicons", () => {
  const { Text } = require("react-native");
  const { createElement } = require("react");
  return { __esModule: true, default: ({ name }: { name: string }) => createElement(Text, null, name) };
});
