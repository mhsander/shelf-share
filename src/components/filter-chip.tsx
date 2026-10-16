import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/constants/theme";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function FilterChip({ label, selected = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.selected]}
    >
      <Text style={[styles.label, selected && styles.selectedLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  selected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    fontSize: 14,
    color: colors.ink,
  },
  selectedLabel: {
    color: colors.onPrimary,
    fontWeight: "700",
  },
});
