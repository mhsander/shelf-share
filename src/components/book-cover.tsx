import { StyleSheet, View } from "react-native";

import { coverColors, type CoverColor } from "@/constants/theme";

// Solid-color stand-in for books without a cover image.
export function BookCover({ color, width = 48 }: { color: CoverColor; width?: number }) {
  return (
    <View style={[styles.cover, { backgroundColor: coverColors[color], width, height: width * 1.42 }]}>
      <View style={styles.stripe} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 6,
    justifyContent: "flex-end",
    padding: 6,
  },
  stripe: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
});
