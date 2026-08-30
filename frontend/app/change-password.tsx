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
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@/src/lib/theme";
import { api } from "@/src/lib/api";

const mono = Platform.select({ ios: "Courier", android: "monospace" });

export default function ChangePasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);
    if (!oldPwd || !newPwd) {
      setError("Semua kolom wajib diisi");
      return;
    }
    if (newPwd.length < 6) {
      setError("Password baru minimal 6 karakter");
      return;
    }
    if (newPwd !== confirmPwd) {
      setError("Konfirmasi password tidak sesuai");
      return;
    }
    setLoading(true);
    try {
      await api.changePassword(oldPwd, newPwd);
      setSuccess(true);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch (e: any) {
      setError(e?.message || "Gagal mengubah password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <LinearGradient
        colors={[colors.kaiBlueDark, colors.kaiBlue]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            testID="change-password-back"
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
            <Text style={styles.headerLabel}>AKUN</Text>
            <Text style={styles.headerTitle}>GANTI PASSWORD</Text>
          </View>
        </View>
        <View style={styles.orangeStripe} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.inputLabel}>PASSWORD LAMA</Text>
          <TextInput
            testID="cp-old-input"
            value={oldPwd}
            onChangeText={setOldPwd}
            secureTextEntry
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.inputLabel}>PASSWORD BARU</Text>
          <TextInput
            testID="cp-new-input"
            value={newPwd}
            onChangeText={setNewPwd}
            secureTextEntry
            style={styles.input}
            placeholder="Minimal 6 karakter"
            placeholderTextColor={colors.muted}
          />

          <Text style={styles.inputLabel}>KONFIRMASI PASSWORD BARU</Text>
          <TextInput
            testID="cp-confirm-input"
            value={confirmPwd}
            onChangeText={setConfirmPwd}
            secureTextEntry
            style={styles.input}
            placeholder="Ulangi password baru"
            placeholderTextColor={colors.muted}
          />

          {!!error && (
            <View style={styles.errorBox} testID="cp-error">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {success && (
            <View style={styles.successBox} testID="cp-success">
              <Text style={styles.successText}>
                PASSWORD BERHASIL DIUBAH
              </Text>
            </View>
          )}

          <Pressable
            testID="cp-submit"
            onPress={handleSubmit}
            disabled={loading}
            style={[styles.primaryBtn, loading && { opacity: 0.85 }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.primaryBtnText}>SIMPAN</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  card: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    padding: spacing.md,
  },
  inputLabel: {
    fontSize: 10,
    letterSpacing: 1.2,
    color: colors.onSurface,
    fontWeight: "700",
    marginTop: spacing.md,
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
    marginTop: spacing.md,
  },
  errorText: { color: colors.error, fontSize: 12, fontFamily: mono },
  successBox: {
    borderWidth: 1,
    borderColor: colors.success,
    backgroundColor: "#F0FDF4",
    padding: spacing.sm,
    marginTop: spacing.md,
  },
  successText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    fontFamily: mono,
  },
  primaryBtn: {
    marginTop: spacing.lg,
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
    fontSize: 14,
  },
});
