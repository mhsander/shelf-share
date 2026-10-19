import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/constants/theme";

type Props = {
  label: string;
  icon: ComponentProps<typeof Ionicons>["name"];
  // Short value shown before the chevron, such as a count.
  detail?: string;
  danger?: boolean;
  onPress: () => void;
};

export function SettingsRow({ label, icon, detail, danger = false, onPress }: Props) {
  const tint = danger ? colors.danger : colors.ink;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Ionicons name={icon} size={20} color={tint} />
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
      {detail && <Text style={styles.detail}>{detail}</Text>}
      {!danger && <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.greySoft,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  detail: {
    fontSize: 15,
    color: colors.inkMuted,
  },
});
