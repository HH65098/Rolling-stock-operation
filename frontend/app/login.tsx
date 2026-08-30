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
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, spacing } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { authStorage } from "@/src/lib/auth";
import { Ionicons } from "@expo/vector-icons";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

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
        contentContainerStyle={{
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero header with logo */}
        <LinearGradient
          colors={[colors.kaiBlueDark, colors.kaiBlue]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { paddingTop: insets.top + spacing.md }]}
        >
          <View style={styles.heroTop}>
            <Image
              source={require("../assets/images/kai-logo-white.png")}
              style={styles.logo}
              resizeMode="contain"
              testID="kai-logo"
            />
            <View style={styles.orangeBadge}>
              <Text style={styles.orangeBadgeText}>RSO</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>ROLLING STOCK</Text>
          <Text style={styles.heroTitle}>OPERATION</Text>
          <View style={styles.orangeUnderline} />
          <Text style={styles.heroSub}>
            SISTEM REKAP CADANGAN · LOKOMOTIF · KERETA · GERBONG
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <Ionicons name="lock-closed" size={16} color={colors.brand} />
              <Text style={styles.cardLabel}>MASUK KE AKUN</Text>
            </View>
            <Text style={styles.cardSub}>Gunakan akun Pusdal Anda.</Text>

            <Text style={styles.inputLabel}>USERNAME</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="person-outline"
                size={16}
                color={colors.kaiBlue}
                style={styles.inputIcon}
              />
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
            </View>

            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Ionicons
                name="key-outline"
                size={16}
                color={colors.kaiBlue}
                style={styles.inputIcon}
              />
              <TextInput
                testID="login-password-input"
                value={password}
                onChangeText={setPassword}
                style={styles.input}
                secureTextEntry
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
              />
            </View>

            {!!error && (
              <View style={styles.errorBox} testID="login-error">
                <Ionicons name="alert-circle" size={14} color={colors.error} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable
              testID="login-submit-button"
              onPress={handleLogin}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                (pressed || loading) && { opacity: 0.9 },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>MASUK</Text>
                  <Ionicons name="arrow-forward" size={16} color="#FFF" />
                </>
              )}
            </Pressable>

            <Pressable
              testID="login-show-accounts-toggle"
              onPress={() => setShowAccounts((v) => !v)}
              style={styles.hintToggle}
            >
              <Ionicons
                name={showAccounts ? "chevron-up" : "chevron-down"}
                size={14}
                color={colors.kaiBlue}
              />
              <Text style={styles.hintToggleText}>
                {showAccounts ? "Sembunyikan" : "Lihat"} daftar akun preset
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
                    <View style={{ flex: 1 }}>
                      <Text style={styles.hintLabel}>{h.label}</Text>
                    </View>
                    <View style={styles.hintPwdBadge}>
                      <Text style={styles.hintPwd}>{h.pwd}</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <Text style={styles.footer}>
            © PT Kereta Api Indonesia (Persero) · v1.0
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.surface },
  hero: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    borderBottomWidth: 3,
    borderBottomColor: colors.brand,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  logo: {
    width: 96,
    height: 40,
  },
  orangeBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  orangeBadgeText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 11,
    letterSpacing: 2,
  },
  heroTitle: {
    color: "#FFF",
    fontSize: 26,
    fontWeight: "900",
    letterSpacing: 1.5,
    lineHeight: 30,
  },
  orangeUnderline: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
    width: 48,
    height: 3,
    backgroundColor: colors.brand,
  },
  heroSub: {
    color: "#BFDBFE",
    fontSize: 10,
    letterSpacing: 1.2,
    fontFamily: mono,
    marginTop: spacing.xs,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    // Subtle shadow via border only
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: "900",
    color: colors.onSurface,
    letterSpacing: 1,
  },
  cardSub: {
    fontSize: 12,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.5,
    color: colors.kaiBlueDark,
    fontWeight: "800",
    marginTop: spacing.md,
    fontFamily: mono,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: { marginRight: spacing.xs },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.onSurface,
    fontFamily: mono,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.error,
    backgroundColor: "#FEF2F2",
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    flex: 1,
    fontFamily: mono,
  },
  primaryBtn: {
    marginTop: spacing.lg,
    backgroundColor: colors.brand,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  primaryBtnText: {
    color: "#FFF",
    fontWeight: "900",
    letterSpacing: 2,
    fontSize: 15,
  },
  hintToggle: {
    marginTop: spacing.md,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  hintToggleText: { color: colors.kaiBlue, fontSize: 12, fontWeight: "700" },
  hintList: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.kaiBlueSoft,
  },
  hintItem: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
    flexDirection: "row",
    alignItems: "center",
  },
  hintLabel: {
    fontSize: 12,
    color: colors.kaiBlueDark,
    fontWeight: "700",
    fontFamily: mono,
  },
  hintPwdBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  hintPwd: {
    fontSize: 10,
    color: "#FFF",
    fontFamily: mono,
    fontWeight: "700",
  },
  footer: {
    textAlign: "center",
    fontSize: 10,
    color: colors.muted,
    marginTop: spacing.lg,
    fontFamily: mono,
    letterSpacing: 0.5,
  },
});
