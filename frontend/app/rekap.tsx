import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { api, RekapGroup } from "@/src/lib/api";
import { authStorage, User } from "@/src/lib/auth";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

/** Pad string to width, trimming with … if longer */
function pad(s: string, w: number): string {
  const str = (s ?? "").toString();
  if (str.length === w) return str;
  if (str.length > w) return str.slice(0, Math.max(0, w - 1)) + "…";
  return str + " ".repeat(w - str.length);
}

function buildTable(items: { nomor: string; keterangan: string }[]): string {
  const NO_W = 3;
  const NOMOR_W = 14;
  const KET_W = 24;
  const sep =
    "+" + "-".repeat(NO_W + 2) + "+" + "-".repeat(NOMOR_W + 2) + "+" + "-".repeat(KET_W + 2) + "+";
  const header =
    "| " +
    pad("NO", NO_W) +
    " | " +
    pad("NOMOR", NOMOR_W) +
    " | " +
    pad("KETERANGAN", KET_W) +
    " |";
  const rows = items.map(
    (it, i) =>
      "| " +
      pad(String(i + 1), NO_W) +
      " | " +
      pad(it.nomor, NOMOR_W) +
      " | " +
      pad(it.keterangan || "-", KET_W) +
      " |"
  );
  if (rows.length === 0) {
    return [sep, header, sep, "| " + pad("(kosong)", NO_W + NOMOR_W + KET_W + 6) + " |", sep].join(
      "\n"
    );
  }
  return [sep, header, sep, ...rows, sep].join("\n");
}

function buildRekapText(
  groups: RekapGroup[],
  isAdmin: boolean,
  generatedAt: string
): string {
  const lines: string[] = [];
  lines.push("REKAP CADANGAN LOKOMOTIF · KERETA · GERBONG");
  lines.push("Tanggal Rekap: " + new Date(generatedAt).toLocaleString("id-ID"));
  lines.push("Mode        : " + (isAdmin ? "ADMIN (Seluruh Pusdal)" : "PUSDAL"));
  lines.push("");
  if (groups.length === 0) {
    lines.push("(Belum ada data)");
    return lines.join("\n");
  }
  groups.forEach((g, idx) => {
    lines.push("========================================");
    lines.push(`${g.owner.toUpperCase()} — ${g.region.toUpperCase()}`);
    lines.push("========================================");
    if (g.categories.length === 0) {
      lines.push("(Belum ada data)");
    } else {
      g.categories.forEach((c) => {
        lines.push("");
        lines.push("[" + c.label.toUpperCase() + "]");
        lines.push(buildTable(c.items));
      });
    }
    if (idx < groups.length - 1) lines.push("");
  });
  return lines.join("\n");
}

export default function RekapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<RekapGroup[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const u = await authStorage.getUser();
      setUser(u);
      const res = await api.rekap();
      setGroups(res.groups);
      setGeneratedAt(res.generated_at);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat rekap");
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

  const text = useMemo(
    () => buildRekapText(groups, user?.role === "admin", generatedAt || new Date().toISOString()),
    [groups, user, generatedAt]
  );

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          testID="rekap-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>OUTPUT</Text>
          <Text style={styles.headerTitle}>REKAP TEXT</Text>
        </View>
        <Pressable
          testID="rekap-refresh-button"
          onPress={load}
          style={styles.backBtn}
          hitSlop={8}
        >
          <Ionicons name="refresh" size={20} color={colors.onSurface} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 96,
        }}
        horizontal={false}
      >
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : error ? (
          <View style={styles.errorBox} testID="rekap-error">
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            style={styles.textFrame}
            contentContainerStyle={{ padding: spacing.md }}
          >
            <Text
              selectable
              testID="rekap-text"
              style={styles.rekapText}
            >
              {text}
            </Text>
          </ScrollView>
        )}
      </ScrollView>

      {/* Sticky Copy CTA */}
      <View
        style={[
          styles.copyCta,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Pressable
          testID="rekap-copy-button"
          onPress={handleCopy}
          disabled={loading}
          style={({ pressed }) => [
            styles.copyBtn,
            copied && { backgroundColor: colors.success },
            (pressed || loading) && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name={copied ? "checkmark" : "copy"}
            size={20}
            color="#FFF"
          />
          <Text style={styles.copyText}>
            {copied ? "TERSALIN" : "SALIN TEXT"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderStrong,
  },
  backBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.sm,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.muted,
    fontFamily: mono,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.onSurface, letterSpacing: 1 },
  textFrame: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
  },
  rekapText: {
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: mono,
  },
  centerBox: { padding: spacing.xxl, alignItems: "center" },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "#FEF2F2",
    padding: spacing.md,
  },
  errorText: { color: colors.error, fontFamily: mono, fontSize: 12 },
  copyCta: {
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
  copyBtn: {
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  copyText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 14,
  },
});
