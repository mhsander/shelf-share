import Ionicons from "@expo/vector-icons/Ionicons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router, useIsFocused } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BookCover, coverColorFor } from "@/components/book-cover";
import { colors } from "@/constants/theme";
import { useLibrary } from "@/hooks/use-library";
import { lookupIsbn, type BookMetadata } from "@/lib/book-lookup";
import { isBookBarcode } from "@/lib/isbn";
import type { OwnedBook } from "@/types/book";

// Continuous batch scanning (spec §6.2, mockup 3): each hit opens a sheet, then scanning resumes.

type Sheet =
  | { kind: "idle" }
  | { kind: "looking"; isbn: string }
  | { kind: "found"; isbn: string; book: BookMetadata }
  | { kind: "duplicate"; isbn: string; existing: OwnedBook }
  | { kind: "error"; isbn: string };

// The same barcode usually stays in frame after a sheet closes; don't reopen it right away.
const rescanCooldownMs = 3000;

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const { books, addBook, findByIsbn } = useLibrary();
  const isFocused = useIsFocused();
  const [sheet, setSheet] = useState<Sheet>({ kind: "idle" });
  const [torchOn, setTorchOn] = useState(false);
  const [sessionStart] = useState(() => new Date().toISOString());
  const lastScan = useRef<{ isbn: string; at: number } | null>(null);

  const addedThisSession = books.filter((b) => b.addedAt >= sessionStart).length;

  function closeSheet(isbn: string) {
    lastScan.current = { isbn, at: Date.now() };
    setSheet({ kind: "idle" });
  }

  async function lookUp(isbn: string) {
    setSheet({ kind: "looking", isbn });
    const result = await lookupIsbn(isbn);

    if (result.status === "found") {
      setSheet({ kind: "found", isbn, book: result.book });
    } else if (result.status === "error") {
      setSheet({ kind: "error", isbn });
    } else {
      // Neither service knows it: type the details in, with the ISBN filled.
      closeSheet(isbn);
      const prefill = result.prefill;
      router.push({
        pathname: "/add-book",
        params: { isbn, title: prefill?.title ?? "", author: prefill?.author ?? "", coverUrl: prefill?.coverUrl ?? "", source: "scan" },
      });
    }
  }

  function handleScan({ data }: BarcodeScanningResult) {
    if (!isBookBarcode(data)) return;
    const last = lastScan.current;
    if (last && last.isbn === data && Date.now() - last.at < rescanCooldownMs) return;

    const existing = findByIsbn(data);
    if (existing) {
      setSheet({ kind: "duplicate", isbn: data, existing });
      return;
    }
    void lookUp(data);
  }

  async function addFound(isbn: string, book: BookMetadata) {
    try {
      const result = await addBook(
        { ...book, isbn, personalRating: null, personalReview: null },
        "scan",
      );
      if (!result.ok) {
        setSheet({ kind: "duplicate", isbn, existing: result.existing });
        return;
      }
      closeSheet(isbn);
    } catch (error) {
      Alert.alert(
        "Couldn't add this book",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  }

  function editFound(isbn: string, book: BookMetadata) {
    closeSheet(isbn);
    router.push({
      pathname: "/add-book",
      params: { isbn, title: book.title, author: book.author, coverUrl: book.coverUrl ?? "", source: "scan" },
    });
  }

  if (!permission) return <View style={styles.screen} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.screen, styles.permission]}>
        <Ionicons name="camera-outline" size={48} color={colors.onPrimary} />
        <Text style={styles.permissionText}>
          Shelf Share needs your camera to read barcodes on your books. Nothing is recorded or uploaded.
        </Text>
        {permission.canAskAgain ? (
          <Pressable accessibilityRole="button" onPress={requestPermission} style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>Allow camera</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} style={styles.primaryButton}>
            <Text style={styles.primaryLabel}>Open settings</Text>
          </Pressable>
        )}
        <Pressable accessibilityRole="button" onPress={() => router.replace("/add-book")}>
          <Text style={styles.link}>Enter it manually</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.link}>Cancel</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const scanning = isFocused && sheet.kind === "idle";

  return (
    <View style={styles.screen}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ["ean13"] }}
        onBarcodeScanned={scanning ? handleScan : undefined}
      />

      <SafeAreaView style={styles.overlay} edges={["top"]}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close scanner" onPress={() => router.back()} style={styles.roundButton}>
            <Ionicons name="close" size={24} color={colors.onPrimary} />
          </Pressable>
          <Text style={styles.counter}>Added this session: {addedThisSession}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
            onPress={() => setTorchOn((on) => !on)}
            style={styles.roundButton}
          >
            <Ionicons name={torchOn ? "flash" : "flash-outline"} size={22} color={colors.onPrimary} />
          </Pressable>
        </View>

        <View style={styles.center}>
          <View style={styles.frame}>
            <View style={styles.scanLine} />
          </View>
          <Text style={styles.hint}>Point at the barcode on the back cover</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push("/add-book")}>
            <Text style={styles.link}>No barcode? Enter it manually</Text>
          </Pressable>
        </View>
      </SafeAreaView>

      {sheet.kind !== "idle" && (
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {sheet.kind === "looking" && (
            <View style={styles.sheetRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.sheetMeta}>Looking up ISBN {sheet.isbn}…</Text>
            </View>
          )}

          {sheet.kind === "found" && (
            <>
              <View style={styles.sheetRow}>
                <BookCover color={coverColorFor(sheet.isbn)} uri={sheet.book.coverUrl} width={56} />
                <View style={styles.sheetText}>
                  <Text style={styles.sheetMeta}>Found it · ISBN {sheet.isbn}</Text>
                  <Text style={styles.sheetTitle} numberOfLines={2}>
                    {sheet.book.title}
                  </Text>
                  <Text style={styles.sheetAuthor} numberOfLines={1}>
                    {sheet.book.author}
                  </Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => editFound(sheet.isbn, sheet.book)}>
                <Text style={styles.sheetLink}>Edit details, rating or review</Text>
              </Pressable>
              <View style={styles.buttons}>
                <Pressable accessibilityRole="button" onPress={() => closeSheet(sheet.isbn)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryLabel}>Skip</Text>
                </Pressable>
                <Pressable accessibilityRole="button"                 onPress={() => void addFound(sheet.isbn, sheet.book)} style={[styles.primaryButton, styles.grow]}>
                  <Text style={styles.primaryLabel}>Add & scan next</Text>
                </Pressable>
              </View>
            </>
          )}

          {sheet.kind === "duplicate" && (
            <>
              <View style={styles.sheetRow}>
                <BookCover color={coverColorFor(sheet.existing.id)} uri={sheet.existing.coverUrl} width={56} />
                <View style={styles.sheetText}>
                  <Text style={styles.sheetMeta}>Already in your library</Text>
                  <Text style={styles.sheetTitle} numberOfLines={2}>
                    {sheet.existing.title}
                  </Text>
                  <Text style={styles.sheetAuthor} numberOfLines={1}>
                    {sheet.existing.author}
                  </Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={() => closeSheet(sheet.isbn)} style={styles.primaryButton}>
                <Text style={styles.primaryLabel}>Scan next</Text>
              </Pressable>
            </>
          )}

          {sheet.kind === "error" && (
            <>
              <Text style={styles.sheetMessage}>{"Couldn't look up this book. Check your connection."}</Text>
              <View style={styles.buttons}>
                <Pressable accessibilityRole="button" onPress={() => closeSheet(sheet.isbn)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryLabel}>Skip</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={() => void lookUp(sheet.isbn)} style={[styles.primaryButton, styles.grow]}>
                  <Text style={styles.primaryLabel}>Try again</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.scanner,
  },
  permission: {
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    padding: 32,
  },
  permissionText: {
    fontSize: 16,
    lineHeight: 23,
    color: colors.onPrimary,
    textAlign: "center",
  },
  overlay: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  counter: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 80,
  },
  frame: {
    width: "78%",
    aspectRatio: 2,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  scanLine: {
    height: 2,
    backgroundColor: colors.amber,
  },
  hint: {
    fontSize: 16,
    color: colors.onPrimary,
  },
  link: {
    fontSize: 15,
    fontWeight: "700",
    color: "#A8D5BC",
    textDecorationLine: "underline",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    gap: 16,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.background,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  sheetText: {
    flex: 1,
    gap: 2,
  },
  sheetMeta: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.primary,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: colors.ink,
  },
  sheetAuthor: {
    fontSize: 15,
    color: colors.inkMuted,
  },
  sheetLink: {
    fontSize: 15,
    fontWeight: "800",
    color: colors.primary,
    textDecorationLine: "underline",
  },
  sheetMessage: {
    fontSize: 16,
    color: colors.ink,
  },
  buttons: {
    flexDirection: "row",
    gap: 12,
  },
  grow: {
    flex: 1,
  },
  primaryButton: {
    height: 52,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  primaryLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.onPrimary,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.ink,
    backgroundColor: colors.surface,
  },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.ink,
  },
});
