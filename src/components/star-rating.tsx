import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/constants/theme";

type Props = {
  value: number | null;
  // Omit to show the rating read-only.
  onChange?: (value: number | null) => void;
  size?: number;
};

// 1–5 stars; tapping the current rating again clears it.
export function StarRating({ value, onChange, size = 30 }: Props) {
  if (!onChange) {
    return (
      <View style={styles.row} accessible accessibilityLabel={`Rated ${value ?? 0} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Ionicons key={star} name={value !== null && star <= value ? "star" : "star-outline"} size={size} color={colors.amber} />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          key={star}
          accessibilityRole="button"
          accessibilityLabel={`Rate ${star} ${star === 1 ? "star" : "stars"}`}
          accessibilityState={{ selected: value === star }}
          onPress={() => onChange(value === star ? null : star)}
          hitSlop={4}
        >
          <Ionicons name={value !== null && star <= value ? "star" : "star-outline"} size={size} color={colors.amber} />
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
  },
});
