import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

function fmtTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<{
    active: { owner: string; region: string; count: number; last_at: string }[];
    inactive: { owner: string; region: string }[];
    date: string;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.activityToday();
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat aktivitas");
      if (String(e?.message || "").includes("Sesi berakhir")) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.kaiBlueDark, colors.kaiBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            testID="activity-back"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </Pressable>
          <Image
            source={require("../assets/images/kai-logo-white.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>ADMIN</Text>
            <Text style={styles.headerTitle}>AKTIVITAS HARI INI</Text>
          </View>
          <Pressable
            testID="activity-refresh"
            onPress={load}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Ionicons name="refresh" size={18} color="#FFF" />
          </Pressable>
        </View>
        <View style={styles.orangeStripe} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.md,
        }}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : data ? (
          <>
            <Text style={styles.dateText}>
              Tanggal: {new Date(data.date).toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionHeadText}>
                AKTIF ({data.active.length})
              </Text>
            </View>
            {data.active.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>BELUM ADA PUSDAL YANG MENGISI HARI INI</Text>
              </View>
            ) : (
              data.active.map((r, i) => (
                <View key={r.owner} style={styles.row} testID={`activity-active-${i}`}>
                  <View style={styles.rank}>
                    <Text style={styles.rankText}>{String(i + 1).padStart(2, "0")}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowOwner}>{r.owner}</Text>
                    <Text style={styles.rowRegion}>{r.region}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.rowCount}>{r.count} DATA</Text>
                    <Text style={styles.rowTime}>{fmtTime(r.last_at)}</Text>
                  </View>
                </View>
              ))
            )}

            <View style={[styles.sectionHead, { marginTop: spacing.lg }]}>
              <Text style={styles.sectionHeadText}>
                BELUM AKTIF ({data.inactive.length})
              </Text>
            </View>
            {data.inactive.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>SEMUA PUSDAL SUDAH MENGISI HARI INI</Text>
              </View>
            ) : (
              <View style={styles.inactiveGrid}>
                {data.inactive.map((r) => (
                  <View key={r.owner} style={styles.chip}>
                    <Text style={styles.chipOwner}>{r.owner}</Text>
                    <Text style={styles.chipRegion}>{r.region}</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: { paddingHorizontal: spacing.md },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    padding: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  logo: { width: 40, height: 20 },
  headerLabel: { fontSize: 9, letterSpacing: 2, color: "#BFDBFE", fontFamily: mono, fontWeight: "800" },
  headerTitle: { fontSize: 17, fontWeight: "900", color: "#FFF", letterSpacing: 0.5 },
  orangeStripe: { height: 2, backgroundColor: colors.brand },
  dateText: {
    fontSize: 12,
    color: colors.onSurface,
    fontFamily: mono,
    fontWeight: "700",
  },
  sectionHead: {
    backgroundColor: colors.onSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sectionHeadText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontFamily: mono,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.sm,
  },
  rank: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  rankText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "800",
    fontFamily: mono,
  },
  rowOwner: { fontSize: 15, fontWeight: "800", color: colors.onSurface },
  rowRegion: { fontSize: 11, color: colors.muted, marginTop: 2, fontFamily: mono },
  rowCount: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.brand,
    letterSpacing: 1,
    fontFamily: mono,
  },
  rowTime: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 2,
    fontFamily: mono,
  },
  emptyBox: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: mono,
    letterSpacing: 1,
    textAlign: "center",
  },
  inactiveGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceSecondary,
  },
  chipOwner: { fontSize: 11, fontWeight: "800", color: colors.onSurface, fontFamily: mono },
  chipRegion: { fontSize: 9, color: colors.muted, fontFamily: mono },
  centerBox: { padding: spacing.xxl, alignItems: "center" },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "#FEF2F2",
    padding: spacing.md,
  },
  errorText: { color: colors.error, fontFamily: mono, fontSize: 12 },
});
