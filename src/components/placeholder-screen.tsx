import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/constants/theme";

// Temporary body for tabs that haven't been built yet.
export function PlaceholderScreen({ title }: { title: string }) {
  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>Coming soon.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: colors.ink,
  },
  body: {
    fontSize: 16,
    color: colors.inkMuted,
  },
});
