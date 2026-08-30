import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { authStorage, User } from "@/src/lib/auth";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

type Cat = {
  key: string;
  label: string;
  short: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: "orange" | "blue";
};

const CATEGORIES: Cat[] = [
  { key: "cadangan_lokomotif", label: "Cadangan Lokomotif", short: "CAD LOK", icon: "train", accent: "orange" },
  { key: "tso_lokomotif", label: "TSO Lokomotif", short: "TSO LOK", icon: "train", accent: "blue" },
  { key: "tsgo_lokomotif", label: "TSGO Lokomotif", short: "TSGO LOK", icon: "train", accent: "orange" },
  { key: "cadangan_kereta", label: "Cadangan Kereta", short: "CAD KRT", icon: "subway", accent: "blue" },
  { key: "tso_kereta", label: "TSO Kereta", short: "TSO KRT", icon: "subway", accent: "orange" },
  { key: "tsgo_kereta", label: "TSGO Kereta", short: "TSGO KRT", icon: "subway", accent: "blue" },
  { key: "cadangan_gerbong", label: "Cadangan Gerbong", short: "CAD GBG", icon: "cube", accent: "orange" },
  { key: "tso_gerbong", label: "TSO Gerbong", short: "TSO GBG", icon: "cube", accent: "blue" },
  { key: "tsgo_gerbong", label: "TSGO Gerbong", short: "TSGO GBG", icon: "cube", accent: "orange" },
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
    <View style={styles.wrap}>
      {/* Hero Header */}
      <LinearGradient
        colors={[colors.kaiBlueDark, colors.kaiBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroLeft}>
            <Image
              source={require("../assets/images/kai-logo-white.png")}
              style={styles.logo}
              resizeMode="contain"
              testID="kai-logo"
            />
            <View style={styles.appNameBox}>
              <Text style={styles.appNameSmall}>ROLLING STOCK</Text>
              <Text style={styles.appNameSmall}>OPERATION</Text>
            </View>
          </View>
          <Pressable
            testID="dashboard-logout-button"
            onPress={handleLogout}
            style={styles.logoutBtn}
            hitSlop={8}
          >
            <Ionicons name="log-out-outline" size={16} color="#FFF" />
            <Text style={styles.logoutText}>KELUAR</Text>
          </Pressable>
        </View>

        <View style={styles.orangeStripe} />

        <View style={styles.userRow}>
          <View style={styles.userIcon}>
            <Ionicons
              name={user.role === "admin" ? "shield-checkmark" : "business"}
              size={18}
              color="#FFF"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userLabel}>
              {user.role === "admin" ? "ADMINISTRATOR" : "PUSDAL"}
            </Text>
            <Text style={styles.userName} testID="dashboard-username">
              {user.username}
            </Text>
            <Text style={styles.userRegion}>{user.region}</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl + (user.role === "admin" ? 200 : spacing.lg),
          gap: spacing.md,
        }}
      >
        <View style={styles.sectionHead}>
          <View style={styles.sectionBar} />
          <View>
            <Text style={styles.sectionTitle}>KATEGORI DATA</Text>
            <Text style={styles.sectionSub}>Pilih kategori untuk kelola cadangan</Text>
          </View>
        </View>

        <View style={styles.grid}>
          {CATEGORIES.map((c, idx) => {
            const isOrange = c.accent === "orange";
            const accentColor = isOrange ? colors.brand : colors.kaiBlue;
            const softBg = isOrange ? colors.brandTertiary : colors.kaiBlueSoft;
            const onSoft = isOrange ? colors.onBrandTertiary : colors.onKaiBlueSoft;
            return (
              <Pressable
                key={c.key}
                testID={`dashboard-category-${c.key}`}
                onPress={() => router.push(`/category/${c.key}`)}
                style={({ pressed }) => [
                  styles.gridItem,
                  { borderTopColor: accentColor },
                  pressed && { backgroundColor: colors.surfaceSecondary },
                ]}
              >
                <View style={styles.gridTop}>
                  <View style={[styles.gridIndex, { backgroundColor: accentColor }]}>
                    <Text style={styles.gridIndexText}>{String(idx + 1).padStart(2, "0")}</Text>
                  </View>
                  <View style={[styles.gridIconBox, { backgroundColor: softBg }]}>
                    <Ionicons name={c.icon} size={18} color={onSoft} />
                  </View>
                </View>
                <Text style={[styles.gridShort, { color: accentColor }]}>{c.short}</Text>
                <Text style={styles.gridLabel}>{c.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Quick links */}
        {user.role === "admin" && (
          <Pressable
            testID="dashboard-activity-link"
            onPress={() => router.push("/activity")}
            style={({ pressed }) => [
              styles.linkRow,
              { borderLeftColor: colors.kaiBlue },
              pressed && { backgroundColor: colors.kaiBlueSoft },
            ]}
          >
            <View style={[styles.linkIcon, { backgroundColor: colors.kaiBlueSoft }]}>
              <Ionicons name="pulse" size={18} color={colors.kaiBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.linkTitle}>AKTIVITAS HARI INI</Text>
              <Text style={styles.linkSub}>Pusdal yang mengisi data hari ini</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.kaiBlue} />
          </Pressable>
        )}

        <Pressable
          testID="dashboard-change-password-link"
          onPress={() => router.push("/change-password")}
          style={({ pressed }) => [
            styles.linkRow,
            { borderLeftColor: colors.brand },
            pressed && { backgroundColor: colors.brandTertiary },
          ]}
        >
          <View style={[styles.linkIcon, { backgroundColor: colors.brandTertiary }]}>
            <Ionicons name="key" size={18} color={colors.brand} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.linkTitle}>GANTI PASSWORD</Text>
            <Text style={styles.linkSub}>Ubah password akun {user.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.brand} />
        </Pressable>

        {user.role === "admin" && (
          <View style={styles.adminNote} testID="admin-note">
            <Ionicons name="shield-checkmark" size={14} color={colors.onBrandTertiary} />
            <Text style={styles.adminNoteText}>
              MODE ADMIN · Anda dapat melihat rekap seluruh Pusdal.
            </Text>
          </View>
        )}
        {user.role !== "admin" && (
          <View style={styles.userNote} testID="user-note">
            <Ionicons name="information-circle" size={14} color={colors.kaiBlue} />
            <Text style={styles.userNoteText}>
              Hasil rekap seluruh Pusdal hanya diakses Administrator.
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
            <LinearGradient
              colors={[colors.brand, colors.brandSecondary]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.rekapBtnInner}
            >
              <Ionicons name="document-text" size={20} color="#FFF" />
              <Text style={styles.rekapText}>REKAP TEXT</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surfaceSecondary },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  logo: { width: 72, height: 30 },
  appNameBox: {
    borderLeftWidth: 2,
    borderLeftColor: colors.brand,
    paddingLeft: spacing.sm,
  },
  appNameSmall: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    lineHeight: 12,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoutText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  orangeStripe: {
    height: 2,
    backgroundColor: colors.brand,
    marginTop: spacing.md,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  userIcon: {
    width: 40,
    height: 40,
    backgroundColor: "rgba(234,88,12,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  userLabel: {
    color: "#BFDBFE",
    fontSize: 9,
    letterSpacing: 2,
    fontFamily: mono,
    fontWeight: "800",
  },
  userName: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  userRegion: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
    letterSpacing: 1,
    fontFamily: mono,
  },
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  sectionBar: {
    width: 4,
    height: 28,
    backgroundColor: colors.brand,
  },
  sectionTitle: {
    fontSize: 13,
    letterSpacing: 1.5,
    color: colors.onSurface,
    fontWeight: "900",
    fontFamily: mono,
  },
  sectionSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  gridItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 3,
    padding: spacing.md,
    backgroundColor: colors.surface,
    minHeight: 130,
    justifyContent: "space-between",
  },
  gridTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  gridIndex: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  gridIndexText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    fontFamily: mono,
  },
  gridIconBox: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  gridShort: {
    fontSize: 11,
    letterSpacing: 1.5,
    fontWeight: "900",
    marginTop: spacing.md,
    fontFamily: mono,
  },
  gridLabel: {
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: "800",
    marginTop: 2,
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  linkIcon: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  linkTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: colors.onSurface,
    fontFamily: mono,
  },
  linkSub: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
  },
  adminNote: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.brand,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  adminNoteText: {
    color: colors.onBrandTertiary,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    flex: 1,
    fontFamily: mono,
  },
  userNote: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.kaiBlue,
    backgroundColor: colors.kaiBlueSoft,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  userNoteText: {
    color: colors.kaiBlueDark,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    flex: 1,
    fontFamily: mono,
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
    borderTopColor: colors.border,
  },
  rekapBtn: { overflow: "hidden" },
  rekapBtnInner: {
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  rekapText: {
    color: "#FFF",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 14,
    flex: 1,
    textAlign: "center",
  },
});
