import { useCallback, useEffect, useState } from "react";
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
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { api, Entry } from "@/src/lib/api";

const LABELS: Record<string, string> = {
  tso_lokomotif: "TSO Lokomotif",
  tso_kereta: "TSO Kereta",
  tso_gerbong: "TSO Gerbong",
  tsgo_lokomotif: "TSGO Lokomotif",
  tsgo_kereta: "TSGO Kereta",
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
      style={[styles.wrap, { paddingTop: insets.top }]}
    >
      {/* Sticky header */}
      <View style={styles.header}>
        <Pressable
          testID="category-back-button"
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>KATEGORI</Text>
          <Text style={styles.headerTitle} testID="category-title">
            {label}
          </Text>
        </View>
      </View>

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
          <Text style={styles.formTitle}>
            {editingId ? "UBAH DATA" : "TAMBAH DATA"}
          </Text>

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
            style={[styles.input, { minHeight: 68, textAlignVertical: "top" }]}
            multiline
            placeholder="Catatan (opsional)"
            placeholderTextColor={colors.muted}
          />

          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.formActions}>
            {editingId && (
              <Pressable
                testID="entry-cancel-button"
                onPress={resetForm}
                style={[styles.secondaryBtn]}
              >
                <Text style={styles.secondaryBtnText}>BATAL</Text>
              </Pressable>
            )}
            <Pressable
              testID="entry-submit-button"
              onPress={handleSubmit}
              disabled={saving}
              style={[styles.primaryBtn, saving && { opacity: 0.8 }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {editingId ? "SIMPAN" : "TAMBAH"}
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {/* List */}
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
        ) : items.length === 0 ? (
          <View style={styles.emptyBox} testID="entries-empty">
            <Text style={styles.emptyText}>BELUM ADA DATA</Text>
          </View>
        ) : (
          items.map((it, idx) => (
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
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Ionicons name="pencil" size={16} color={colors.onSurface} />
                </Pressable>
                <Pressable
                  testID={`entry-delete-${idx}`}
                  onPress={() => handleDelete(it.id)}
                  style={[styles.iconBtn, { borderColor: colors.error }]}
                  hitSlop={8}
                >
                  <Ionicons name="trash" size={16} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const mono = Platform.select({ ios: "Courier", android: "monospace" });

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
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.onSurface,
  },
  formCard: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    gap: spacing.xs,
  },
  formTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    color: colors.brand,
    marginBottom: spacing.sm,
    fontFamily: mono,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
    fontWeight: "700",
    marginTop: spacing.sm,
    fontFamily: mono,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.onSurface,
    fontFamily: mono,
    marginTop: spacing.xs,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "#FEF2F2",
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  errorText: { color: colors.error, fontSize: 12, fontFamily: mono },
  formActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "800",
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
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 12,
    color: colors.onSurface,
  },
  listHead: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.onSurface,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.md,
  },
  listHeadCol1: { width: 32, color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 1, fontFamily: mono },
  listHeadCol2: { flex: 1.2, color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 1, fontFamily: mono },
  listHeadCol3: { flex: 1.6, color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 1, fontFamily: mono },
  listHeadCol4: { width: 76, color: "#FFF", fontSize: 10, fontWeight: "800", letterSpacing: 1, textAlign: "right", fontFamily: mono },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: colors.borderStrong,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  rowCol1: { width: 32, fontSize: 12, color: colors.onSurface, fontFamily: mono },
  rowCol2: { flex: 1.2, fontSize: 13, color: colors.onSurface, fontWeight: "700", fontFamily: mono },
  rowCol3: { flex: 1.6, fontSize: 12, color: colors.muted, fontFamily: mono, paddingRight: spacing.xs },
  rowCol4: { width: 76, flexDirection: "row", gap: spacing.xs, justifyContent: "flex-end" },
  iconBtn: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.xs,
  },
  emptyBox: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderTopWidth: 0,
    padding: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 12,
    letterSpacing: 1.5,
    color: colors.muted,
    fontWeight: "700",
    fontFamily: mono,
  },
});
