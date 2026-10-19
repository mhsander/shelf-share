import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/avatar";
import { colors } from "@/constants/theme";
import { useProfile } from "@/hooks/use-profile";
import type { BlockedUser } from "@/types/profile";

export default function BlockedUsersScreen() {
  const { blocked, unblock } = useProfile();

  function confirmUnblock(user: BlockedUser) {
    Alert.alert(`Unblock ${user.displayName}?`, "They'll be able to see your profile and books again.", [
      { text: "Cancel", style: "cancel" },
      { text: "Unblock", onPress: () => unblock(user.id) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.heading}>Blocked users</Text>
        <View style={styles.iconButtonSpacer} />
      </View>

      <FlatList
        data={blocked}
        keyExtractor={(user) => user.id}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar name={item.displayName} uri={null} size={40} />
            <Text style={styles.name}>{item.displayName}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Unblock ${item.displayName}`}
              onPress={() => confirmUnblock(item)}
              style={({ pressed }) => [styles.unblock, pressed && styles.pressed]}
            >
              <Text style={styles.unblockLabel}>Unblock</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>You haven&apos;t blocked anyone.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.ink,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonSpacer: {
    width: 44,
  },
  content: {
    padding: 20,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
  },
  unblock: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  unblockLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  pressed: {
    opacity: 0.7,
  },
  empty: {
    fontSize: 15,
    color: colors.inkMuted,
    textAlign: "center",
    paddingVertical: 32,
  },
});
