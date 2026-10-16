import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";

import { colors } from "@/constants/theme";

// 1–5 stars; tapping the current rating again clears it.
export function StarRating({ value, onChange }: { value: number | null; onChange: (value: number | null) => void }) {
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
          <Ionicons name={value !== null && star <= value ? "star" : "star-outline"} size={30} color={colors.amber} />
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
