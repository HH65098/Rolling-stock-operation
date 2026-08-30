import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system/legacy";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { api, RekapGroup } from "@/src/lib/api";
import { authStorage, User } from "@/src/lib/auth";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

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
    "| " + pad("NO", NO_W) + " | " + pad("NOMOR", NOMOR_W) + " | " + pad("KETERANGAN", KET_W) + " |";
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
    return [sep, header, sep, "| " + pad("(kosong)", NO_W + NOMOR_W + KET_W + 6) + " |", sep].join("\n");
  }
  return [sep, header, sep, ...rows, sep].join("\n");
}

function buildRekapText(
  groups: RekapGroup[],
  generatedAt: string,
  startDate?: string,
  endDate?: string
): string {
  const lines: string[] = [];
  lines.push("REKAP CADANGAN LOKOMOTIF · KERETA · GERBONG");
  lines.push("Tanggal Rekap: " + new Date(generatedAt).toLocaleString("id-ID"));
  const range =
    startDate || endDate
      ? `${startDate || "…"} s/d ${endDate || "…"}`
      : "Semua tanggal";
  lines.push("Rentang Data : " + range);
  lines.push("");
  if (groups.length === 0) {
    lines.push("(Belum ada data pada rentang tersebut)");
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

function isValidDate(s: string): boolean {
  if (!s) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function RekapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState<RekapGroup[]>([]);
  const [generatedAt, setGeneratedAt] = useState("");
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedStart, setAppliedStart] = useState<string | undefined>();
  const [appliedEnd, setAppliedEnd] = useState<string | undefined>();

  const load = useCallback(
    async (s?: string, e?: string) => {
      setLoading(true);
      setError("");
      try {
        const u = await authStorage.getUser();
        setUser(u);
        void u;
        const res = await api.rekap(s || undefined, e || undefined);
        setGroups(res.groups);
        setGeneratedAt(res.generated_at);
      } catch (err: any) {
        setError(err?.message || "Gagal memuat rekap");
        if (String(err?.message || "").includes("Sesi berakhir")) {
          router.replace("/login");
        }
      } finally {
        setLoading(false);
      }
    },
    [router]
  );

  useEffect(() => {
    load();
  }, [load]);

  const text = useMemo(
    () => buildRekapText(groups, generatedAt || new Date().toISOString(), appliedStart, appliedEnd),
    [groups, generatedAt, appliedStart, appliedEnd]
  );

  const applyFilter = () => {
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      setError("Format tanggal harus YYYY-MM-DD");
      return;
    }
    setError("");
    setAppliedStart(startDate || undefined);
    setAppliedEnd(endDate || undefined);
    load(startDate, endDate);
  };

  const clearFilter = () => {
    setStartDate("");
    setEndDate("");
    setAppliedStart(undefined);
    setAppliedEnd(undefined);
    load();
  };

  const handleCopy = async () => {
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const fileName = `rekap-cadangan-${stamp}.txt`;
    try {
      if (Platform.OS === "web") {
        // Browser download via Blob
        const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
        const uri = `${dir}${fileName}`;
        await FileSystem.writeAsStringAsync(uri, text, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const available = await Sharing.isAvailableAsync();
        if (available) {
          await Sharing.shareAsync(uri, {
            mimeType: "text/plain",
            dialogTitle: "Simpan / bagikan rekap",
            UTI: "public.plain-text",
          });
        }
      }
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 2000);
    } catch (e: any) {
      setError(e?.message || "Gagal mengekspor file");
    }
  };

  return (
    <View style={[styles.wrap]}>
      <LinearGradient
        colors={[colors.kaiBlueDark, colors.kaiBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            testID="rekap-back-button"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </Pressable>
          <Image
            source={require("../assets/images/kai-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>OUTPUT</Text>
            <Text style={styles.headerTitle}>REKAP TEXT</Text>
          </View>
          <Pressable
            testID="rekap-refresh-button"
            onPress={() => load(appliedStart, appliedEnd)}
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
          paddingBottom: insets.bottom + 160,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Filter Card */}
        <View style={styles.filterCard}>
          <Text style={styles.filterTitle}>FILTER TANGGAL</Text>
          <View style={styles.filterRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>DARI</Text>
              <TextInput
                testID="rekap-start-input"
                value={startDate}
                onChangeText={setStartDate}
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inputLabel}>SAMPAI</Text>
              <TextInput
                testID="rekap-end-input"
                value={endDate}
                onChangeText={setEndDate}
                style={styles.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          <View style={styles.filterActions}>
            <Pressable
              testID="rekap-filter-clear"
              onPress={clearFilter}
              style={styles.secondaryBtn}
            >
              <Text style={styles.secondaryBtnText}>RESET</Text>
            </Pressable>
            <Pressable
              testID="rekap-filter-apply"
              onPress={applyFilter}
              style={styles.applyBtn}
            >
              <Ionicons name="funnel" size={14} color="#FFF" />
              <Text style={styles.applyBtnText}>TERAPKAN</Text>
            </Pressable>
          </View>
        </View>

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
            <Text selectable testID="rekap-text" style={styles.rekapText}>
              {text}
            </Text>
          </ScrollView>
        )}
      </ScrollView>

      {/* Sticky action buttons */}
      <View
        style={[
          styles.ctaBar,
          { paddingBottom: Math.max(insets.bottom, spacing.md) },
        ]}
      >
        <Pressable
          testID="rekap-download-button"
          onPress={handleDownload}
          disabled={loading}
          style={({ pressed }) => [
            styles.downloadBtn,
            downloaded && { backgroundColor: colors.success },
            (pressed || loading) && { opacity: 0.9 },
          ]}
        >
          <Ionicons
            name={downloaded ? "checkmark" : "download"}
            size={18}
            color="#FFF"
          />
          <Text style={styles.ctaText}>
            {downloaded ? "TERSIMPAN" : "UNDUH .TXT"}
          </Text>
        </Pressable>
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
          <Ionicons name={copied ? "checkmark" : "copy"} size={18} color="#FFF" />
          <Text style={styles.ctaText}>{copied ? "TERSALIN" : "SALIN"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    paddingHorizontal: spacing.md,
  },
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
  filterCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  filterTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.brand,
    marginBottom: spacing.sm,
    fontFamily: mono,
  },
  filterRow: { flexDirection: "row", gap: spacing.sm },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
    fontWeight: "700",
    fontFamily: mono,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    fontSize: 13,
    color: colors.onSurface,
    fontFamily: mono,
    marginTop: spacing.xs,
  },
  filterActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  secondaryBtnText: {
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 12,
    color: colors.onSurface,
  },
  applyBtn: {
    flex: 2,
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  applyBtnText: {
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 12,
    color: "#FFF",
  },
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
  ctaBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderStrong,
    flexDirection: "row",
    gap: spacing.sm,
  },
  downloadBtn: {
    flex: 1,
    backgroundColor: colors.onSurface,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  copyBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ctaText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 1.2,
    fontSize: 13,
  },
});
