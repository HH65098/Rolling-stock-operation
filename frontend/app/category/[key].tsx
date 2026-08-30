import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { api, Entry } from "@/src/lib/api";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

const LABELS: Record<string, string> = {
  cadangan_lokomotif: "Cadangan Lokomotif",
  tso_lokomotif: "TSO Lokomotif",
  tsgo_lokomotif: "TSGO Lokomotif",
  cadangan_kereta: "Cadangan Kereta",
  tso_kereta: "TSO Kereta",
  tsgo_kereta: "TSGO Kereta",
  cadangan_gerbong: "Cadangan Gerbong",
  tso_gerbong: "TSO Gerbong",
  tsgo_gerbong: "TSGO Gerbong",
};

export default function CategoryScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const category = key || "";
  const label = LABELS[category] || "Kategori";

  const [items, setItems] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [nomor, setNomor] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Search
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    if (!category) return;
    setError("");
    setLoading(true);
    try {
      const rows = await api.listEntries(category);
      setItems(rows);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat data");
      if (String(e?.message || "").includes("Sesi berakhir")) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [category, router]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.nomor.toLowerCase().includes(q) ||
        (it.keterangan || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const resetForm = () => {
    setEditingId(null);
    setNomor("");
    setKeterangan("");
  };

  const handleSubmit = async () => {
    if (!nomor.trim()) {
      setError("Nomor wajib diisi");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await api.updateEntry(category, editingId, nomor.trim(), keterangan.trim());
      } else {
        await api.createEntry(category, nomor.trim(), keterangan.trim());
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (it: Entry) => {
    setEditingId(it.id);
    setNomor(it.nomor);
    setKeterangan(it.keterangan);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteEntry(category, id);
      if (editingId === id) resetForm();
      await load();
    } catch (e: any) {
      setError(e?.message || "Gagal menghapus");
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      {/* Header */}
      <LinearGradient
        colors={[colors.kaiBlueDark, colors.kaiBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            testID="category-back-button"
            onPress={() => router.back()}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color="#FFF" />
          </Pressable>
          <Image
            source={require("../../assets/images/kai-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.headerLabel}>KATEGORI</Text>
            <Text style={styles.headerTitle} testID="category-title">
              {label}
            </Text>
          </View>
        </View>
        <View style={styles.orangeStripe} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
          gap: spacing.md,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Form */}
        <View style={styles.formCard}>
          <View style={styles.formHead}>
            <Ionicons
              name={editingId ? "create" : "add-circle"}
              size={16}
              color={colors.brand}
            />
            <Text style={styles.formTitle}>
              {editingId ? "UBAH DATA" : "TAMBAH DATA"}
            </Text>
          </View>

          <Text style={styles.inputLabel}>NOMOR</Text>
          <TextInput
            testID="entry-nomor-input"
            value={nomor}
            onChangeText={setNomor}
            style={styles.input}
            placeholder="Contoh: CC201-01"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
          />

          <Text style={styles.inputLabel}>KETERANGAN</Text>
          <TextInput
            testID="entry-keterangan-input"
            value={keterangan}
            onChangeText={setKeterangan}
            style={[styles.input, { minHeight: 60, textAlignVertical: "top" }]}
            multiline
            placeholder="Catatan (opsional)"
            placeholderTextColor={colors.muted}
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={14} color={colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formActions}>
            {editingId && (
              <Pressable
                testID="entry-cancel-button"
                onPress={resetForm}
                style={styles.secondaryBtn}
              >
                <Text style={styles.secondaryBtnText}>BATAL</Text>
              </Pressable>
            )}
            <Pressable
              testID="entry-submit-button"
              onPress={handleSubmit}
              disabled={saving}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || saving) && { opacity: 0.9 },
              ]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons
                    name={editingId ? "checkmark" : "add"}
                    size={16}
                    color="#FFF"
                  />
                  <Text style={styles.primaryBtnText}>
                    {editingId ? "SIMPAN" : "TAMBAH"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons
            name="search"
            size={16}
            color={colors.kaiBlue}
            style={{ marginRight: spacing.xs }}
          />
          <TextInput
            testID="entry-search-input"
            value={search}
            onChangeText={setSearch}
            style={styles.searchInput}
            placeholder="Cari nomor atau keterangan…"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 && (
            <Pressable
              testID="entry-search-clear"
              onPress={() => setSearch("")}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>
        {search.length > 0 && (
          <Text style={styles.searchInfo} testID="entry-search-info">
            {filtered.length} dari {items.length} data cocok dengan &quot;{search}&quot;
          </Text>
        )}

        {/* List Header */}
        <View style={styles.listHead}>
          <Text style={styles.listHeadCol1}>NO</Text>
          <Text style={styles.listHeadCol2}>NOMOR</Text>
          <Text style={styles.listHeadCol3}>KETERANGAN</Text>
          <Text style={styles.listHeadCol4}>AKSI</Text>
        </View>

        {loading ? (
          <View style={styles.emptyBox}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : filtered.length === 0 ? (
          <View style={styles.emptyBox} testID="entries-empty">
            <Ionicons
              name={search ? "search" : "cube-outline"}
              size={28}
              color={colors.muted}
            />
            <Text style={styles.emptyText}>
              {search
                ? "TIDAK ADA HASIL PENCARIAN"
                : "BELUM ADA DATA"}
            </Text>
          </View>
        ) : (
          filtered.map((it, idx) => (
            <View key={it.id} style={styles.row} testID={`entry-row-${idx}`}>
              <Text style={styles.rowCol1}>{String(idx + 1).padStart(2, "0")}</Text>
              <Text style={styles.rowCol2} numberOfLines={2}>
                {it.nomor}
              </Text>
              <Text style={styles.rowCol3} numberOfLines={2}>
                {it.keterangan || "-"}
              </Text>
              <View style={styles.rowCol4}>
                <Pressable
                  testID={`entry-edit-${idx}`}
                  onPress={() => startEdit(it)}
                  style={[styles.iconBtn, { borderColor: colors.kaiBlue }]}
                  hitSlop={8}
                >
                  <Ionicons name="pencil" size={14} color={colors.kaiBlue} />
                </Pressable>
                <Pressable
                  testID={`entry-delete-${idx}`}
                  onPress={() => handleDelete(it.id)}
                  style={[styles.iconBtn, { borderColor: colors.error }]}
                  hitSlop={8}
                >
                  <Ionicons name="trash" size={14} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surfaceSecondary },
  header: {
    paddingHorizontal: spacing.md,
    paddingBottom: 0,
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
  headerLabel: {
    fontSize: 9,
    letterSpacing: 2,
    color: "#BFDBFE",
    fontFamily: mono,
    fontWeight: "800",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "900",
    color: "#FFF",
    letterSpacing: 0.5,
  },
  orangeStripe: { height: 2, backgroundColor: colors.brand },

  formCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    padding: spacing.md,
    backgroundColor: colors.surface,
  },
  formHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.5,
    color: colors.onSurface,
    fontFamily: mono,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.kaiBlueDark,
    fontWeight: "800",
    marginTop: spacing.sm,
    fontFamily: mono,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    fontFamily: mono,
    marginTop: spacing.xs,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "#FEF2F2",
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: { color: colors.error, fontSize: 12, flex: 1, fontFamily: mono },
  formActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: spacing.sm,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "900",
    letterSpacing: 1.5,
    fontSize: 13,
  },
  secondaryBtn: {
    paddingHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    fontWeight: "900",
    letterSpacing: 1.5,
    fontSize: 12,
    color: colors.onSurface,
  },

  // Search
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.kaiBlue,
    backgroundColor: colors.kaiBlueSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.kaiBlueDark,
    fontFamily: mono,
    paddingVertical: 0,
  },
  searchInfo: {
    fontSize: 11,
    color: colors.kaiBlueDark,
    fontFamily: mono,
    fontWeight: "700",
  },

  // List
  listHead: {
    flexDirection: "row",
    backgroundColor: colors.kaiBlueDark,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  listHeadCol1: { width: 32, color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 1, fontFamily: mono },
  listHeadCol2: { flex: 1.2, color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 1, fontFamily: mono },
  listHeadCol3: { flex: 1.6, color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 1, fontFamily: mono },
  listHeadCol4: { width: 68, color: "#FFF", fontSize: 10, fontWeight: "900", letterSpacing: 1, textAlign: "right", fontFamily: mono },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowCol1: { width: 32, fontSize: 12, color: colors.muted, fontFamily: mono },
  rowCol2: { flex: 1.2, fontSize: 13, color: colors.onSurface, fontWeight: "800", fontFamily: mono },
  rowCol3: { flex: 1.6, fontSize: 12, color: colors.muted, fontFamily: mono, paddingRight: spacing.xs },
  rowCol4: { width: 68, flexDirection: "row", gap: spacing.xs, justifyContent: "flex-end" },
  iconBtn: {
    borderWidth: 1,
    padding: spacing.xs,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyText: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: colors.muted,
    fontWeight: "800",
    fontFamily: mono,
  },
});
