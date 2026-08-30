import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { authStorage } from "@/src/lib/auth";
import { Ionicons } from "@expo/vector-icons";

const HINTS = [
  { u: "admin", label: "Administrator", pwd: "admin123" },
  { u: "Pusdal1", label: "Pusdal1 - Jakarta", pwd: "pusdal123" },
  { u: "Pusdal2", label: "Pusdal2 - Bandung", pwd: "pusdal123" },
  { u: "Pusdal3", label: "Pusdal3 - Cirebon", pwd: "pusdal123" },
  { u: "Pusdal4", label: "Pusdal4 - Semarang", pwd: "pusdal123" },
  { u: "Pusdal5", label: "Pusdal5 - Purwokerto", pwd: "pusdal123" },
  { u: "Pusdal6", label: "Pusdal6 - Yogyakarta", pwd: "pusdal123" },
  { u: "Pusdal7", label: "Pusdal7 - Madiun", pwd: "pusdal123" },
  { u: "Pusdal8", label: "Pusdal8 - Surabaya", pwd: "pusdal123" },
  { u: "Pusdal9", label: "Pusdal9 - Jember", pwd: "pusdal123" },
  { u: "PusdalV1", label: "PusdalV1 - Medan", pwd: "pusdal123" },
  { u: "PusdalV2", label: "PusdalV2 - Padang", pwd: "pusdal123" },
  { u: "PusdalSS", label: "PusdalSS - Sumatera Selatan", pwd: "pusdal123" },
];

export default function Login() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAccounts, setShowAccounts] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError("Username dan password wajib diisi");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await api.login(username.trim(), password);
      await authStorage.setToken(res.access_token);
      await authStorage.setUser({
        username: res.username,
        role: res.role,
        region: res.region,
      });
      router.replace("/dashboard");
    } catch (e: any) {
      setError(e?.message || "Gagal login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.brandRow}>
          <View style={styles.brandBadge}>
            <Ionicons name="train" size={22} color={colors.onBrandSecondary || "#FFF"} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.brandTitle}>REKAP CADANGAN</Text>
            <Text style={styles.brandSubtitle}>LOKOMOTIF · KERETA · GERBONG</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>MASUK</Text>
          <Text style={styles.cardSub}>Gunakan akun Pusdal yang telah disediakan.</Text>

          <Text style={styles.inputLabel}>USERNAME</Text>
          <TextInput
            testID="login-username-input"
            value={username}
            onChangeText={setUsername}
            style={styles.input}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Pusdal1"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.inputLabel}>PASSWORD</Text>
          <TextInput
            testID="login-password-input"
            value={password}
            onChangeText={setPassword}
            style={styles.input}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />

          {!!error && (
            <View style={styles.errorBox} testID="login-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <Pressable
            testID="login-submit-button"
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || loading) && { opacity: 0.85 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>MASUK</Text>
            )}
          </Pressable>

          <Pressable
            testID="login-show-accounts-toggle"
            onPress={() => setShowAccounts((v) => !v)}
            style={styles.hintToggle}
          >
            <Text style={styles.hintToggleText}>
              {showAccounts ? "▲ Sembunyikan daftar akun" : "▼ Lihat daftar akun preset"}
            </Text>
          </Pressable>

          {showAccounts && (
            <View style={styles.hintList} testID="login-accounts-list">
              {HINTS.map((h) => (
                <Pressable
                  key={h.u}
                  testID={`login-hint-${h.u}`}
                  onPress={() => {
                    setUsername(h.u);
                    setPassword(h.pwd);
                  }}
                  style={styles.hintItem}
                >
                  <Text style={styles.hintLabel}>{h.label}</Text>
                  <Text style={styles.hintPwd}>pwd: {h.pwd}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    paddingHorizontal: spacing.lg,
    gap: spacing.xl,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
    backgroundColor: colors.surfaceInverse,
  },
  brandBadge: {
    width: 44,
    height: 44,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
  },
  brandSubtitle: {
    color: "#A1A1AA",
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 1.2,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  card: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.surface,
  },
  cardLabel: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.onSurface,
    letterSpacing: 1,
  },
  cardSub: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.md,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
    fontWeight: "700",
    marginTop: spacing.sm,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
    marginTop: spacing.xs,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "#FEF2F2",
    padding: spacing.md,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    paddingVertical: spacing.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "800",
    letterSpacing: 1.5,
    fontSize: 15,
  },
  hintToggle: { marginTop: spacing.md, alignItems: "center" },
  hintToggleText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  hintList: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  hintItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hintLabel: {
    fontSize: 12,
    color: colors.onSurface,
    fontWeight: "600",
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
  hintPwd: {
    fontSize: 10,
    color: colors.muted,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace" }),
  },
});
