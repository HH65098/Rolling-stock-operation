import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { authStorage, User } from "@/src/lib/auth";

type Cat = {
  key: string;
  label: string;
  short: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const CATEGORIES: Cat[] = [
  { key: "cadangan_lokomotif", label: "Cadangan Lokomotif", short: "CAD LOK", icon: "train" },
  { key: "tso_lokomotif", label: "TSO Lokomotif", short: "TSO LOK", icon: "train" },
  { key: "tsgo_lokomotif", label: "TSGO Lokomotif", short: "TSGO LOK", icon: "train" },
  { key: "cadangan_kereta", label: "Cadangan Kereta", short: "CAD KRT", icon: "subway" },
  { key: "tso_kereta", label: "TSO Kereta", short: "TSO KRT", icon: "subway" },
  { key: "tsgo_kereta", label: "TSGO Kereta", short: "TSGO KRT", icon: "subway" },
  { key: "cadangan_gerbong", label: "Cadangan Gerbong", short: "CAD GBG", icon: "cube" },
  { key: "tso_gerbong", label: "TSO Gerbong", short: "TSO GBG", icon: "cube" },
  { key: "tsgo_gerbong", label: "TSGO Gerbong", short: "TSGO GBG", icon: "cube" },
];

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const u = await authStorage.getUser();
    const token = await authStorage.getToken();
    if (!u || !token) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setLoading(false);
  }, [router]);

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogout = async () => {
    await authStorage.clear();
    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      {/* Sticky header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>PUSDAL</Text>
          <Text style={styles.headerTitle} testID="dashboard-username">
            {user.username}
          </Text>
          <Text style={styles.headerRegion}>{user.region}</Text>
        </View>
        <Pressable
          testID="dashboard-logout-button"
          onPress={handleLogout}
          style={styles.logoutBtn}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.onSurface} />
          <Text style={styles.logoutText}>KELUAR</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl + (user.role === "admin" ? 180 : spacing.lg),
          gap: spacing.md,
        }}
      >
        <Text style={styles.sectionTitle}>KATEGORI DATA</Text>
        <Text style={styles.sectionSub}>
          Pilih kategori untuk menambah / mengubah data cadangan.
        </Text>

        <View style={styles.grid}>
          {CATEGORIES.map((c, idx) => (
            <Pressable
              key={c.key}
              testID={`dashboard-category-${c.key}`}
              onPress={() => router.push(`/category/${c.key}`)}
              style={({ pressed }) => [
                styles.gridItem,
                pressed && { backgroundColor: colors.surfaceSecondary },
              ]}
            >
              <View style={styles.gridIconRow}>
                <View style={styles.gridIndex}>
                  <Text style={styles.gridIndexText}>{String(idx + 1).padStart(2, "0")}</Text>
                </View>
                <Ionicons name={c.icon} size={22} color={colors.onSurface} />
              </View>
              <Text style={styles.gridShort}>{c.short}</Text>
              <Text style={styles.gridLabel}>{c.label}</Text>
            </Pressable>
          ))}
        </View>

        {user.role === "admin" && (
          <Pressable
            testID="dashboard-activity-link"
            onPress={() => router.push("/activity")}
            style={({ pressed }) => [
              styles.linkRow,
              pressed && { backgroundColor: colors.surfaceSecondary },
            ]}
          >
            <Ionicons name="pulse" size={18} color={colors.brand} />
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>AKTIVITAS HARI INI</Text>
              <Text style={styles.linkSub}>Pusdal yang mengisi data hari ini</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.onSurface} />
          </Pressable>
        )}

        <Pressable
          testID="dashboard-change-password-link"
          onPress={() => router.push("/change-password")}
          style={({ pressed }) => [
            styles.linkRow,
            pressed && { backgroundColor: colors.surfaceSecondary },
          ]}
        >
          <Ionicons name="key" size={18} color={colors.brand} />
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>GANTI PASSWORD</Text>
            <Text style={styles.linkSub}>Ubah password akun {user.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.onSurface} />
        </Pressable>

        {user.role === "admin" && (
          <View style={styles.adminNote} testID="admin-note">
            <Text style={styles.adminNoteText}>
              MODE ADMIN · Anda dapat melihat data seluruh Pusdal pada rekap.
            </Text>
          </View>
        )}
        {user.role !== "admin" && (
          <View style={styles.userNote} testID="user-note">
            <Text style={styles.userNoteText}>
              Hasil rekap seluruh Pusdal hanya dapat diakses oleh Administrator.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Rekap CTA — admin only */}
      {user.role === "admin" && (
        <View
          style={[
            styles.rekapCta,
            { paddingBottom: Math.max(insets.bottom, spacing.md) },
          ]}
        >
          <Pressable
            testID="dashboard-rekap-button"
            onPress={() => router.push("/rekap")}
            style={({ pressed }) => [
              styles.rekapBtn,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons name="document-text-outline" size={20} color="#FFF" />
            <Text style={styles.rekapText}>REKAP TEXT</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  headerRegion: {
    fontSize: 12,
    color: colors.brand,
    fontWeight: "700",
    marginTop: 2,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  logoutBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: colors.onSurface,
  },
  sectionTitle: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.onSurface,
    fontWeight: "800",
    marginTop: spacing.sm,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  sectionSub: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 120,
    justifyContent: "space-between",
  },
  gridIconRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gridIndex: {
    backgroundColor: colors.onSurface,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  gridIndexText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  gridShort: {
    fontSize: 11,
    color: colors.brand,
    letterSpacing: 1.5,
    fontWeight: "800",
    marginTop: spacing.md,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  gridLabel: {
    fontSize: 15,
    color: colors.onSurface,
    fontWeight: "700",
    marginTop: 2,
  },
  adminNote: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
  },
  adminNoteText: {
    color: colors.onBrandTertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  userNote: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
  },
  userNoteText: {
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
  },
  linkTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.onSurface,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  linkSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  rekapCta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
  },
  rekapBtn: {
    backgroundColor: colors.onSurface,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  rekapText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 14,
  },
});
