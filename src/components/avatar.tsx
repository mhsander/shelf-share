import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/constants/theme";
import { initials } from "@/lib/profile";

type Props = {
  name: string;
  // Profile photo; initials show when it's missing.
  uri: string | null;
  size: number;
};

export function Avatar({ name, uri, size }: Props) {
  const circle = { width: size, height: size, borderRadius: size / 2 };

  if (uri) {
    return <Image source={{ uri }} style={[styles.base, circle]} contentFit="cover" accessibilityIgnoresInvertColors />;
  }

  return (
    <View style={[styles.base, styles.initialsCircle, circle]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.primarySoft,
  },
  initialsCircle: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  initials: {
    fontWeight: "800",
    color: colors.onPrimary,
  },
});
