import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { coverColors, type CoverColor } from "@/constants/theme";

const colorNames = Object.keys(coverColors) as CoverColor[];

// Stable placeholder color for a book without a cover image.
export function coverColorFor(id: string): CoverColor {
  const hash = [...id].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0);
  return colorNames[hash % colorNames.length];
}

type Props = {
  color: CoverColor;
  // Cover image from the metadata lookup; the solid color shows when it's missing.
  uri?: string | null;
  width?: number;
};

export function BookCover({ color, uri, width = 48 }: Props) {
  const size = { width, height: width * 1.42 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.cover, size, { backgroundColor: coverColors[color] }]} contentFit="cover" />;
  }

  return (
    <View style={[styles.cover, styles.placeholder, size, { backgroundColor: coverColors[color] }]}>
      <View style={styles.stripe} />
    </View>
  );
}

const styles = StyleSheet.create({
  cover: {
    borderRadius: 6,
  },
  placeholder: {
    justifyContent: "flex-end",
    padding: 6,
  },
  stripe: {
    height: 2,
    backgroundColor: "rgba(255, 255, 255, 0.55)",
  },
});
