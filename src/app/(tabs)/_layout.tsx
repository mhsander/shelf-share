import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import type { ColorValue } from "react-native";

import { colors } from "@/constants/theme";

type TabIconProps = {
  name: ComponentProps<typeof Ionicons>["name"];
  color: ColorValue;
  size: number;
};

function TabIcon({ name, color, size }: TabIconProps) {
  // Tint colors below are hex strings; React Navigation types them more loosely.
  return <Ionicons name={name} size={size} color={color as string} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.inkMuted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
        tabBarLabelStyle: { fontSize: 12, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: "Search", tabBarIcon: (props) => <TabIcon name="search-outline" {...props} /> }}
      />
      <Tabs.Screen
        name="library"
        options={{ title: "My library", tabBarIcon: (props) => <TabIcon name="book-outline" {...props} /> }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: "Activity", tabBarIcon: (props) => <TabIcon name="swap-horizontal-outline" {...props} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: "Profile", tabBarIcon: (props) => <TabIcon name="person-outline" {...props} /> }}
      />
    </Tabs>
  );
}
