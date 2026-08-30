import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "kai_rekap_token";
const USER_KEY = "kai_rekap_user";

export type User = {
  username: string;
  role: "admin" | "user";
  region: string;
};

async function setItem(key: string, value: string | null) {
  if (Platform.OS === "web") {
    if (value === null) return AsyncStorage.removeItem(key);
    return AsyncStorage.setItem(key, value);
  }
  if (value === null) return SecureStore.deleteItemAsync(key);
  return SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

export const authStorage = {
  getToken: () => getItem(TOKEN_KEY),
  setToken: (t: string | null) => setItem(TOKEN_KEY, t),
  getUser: async (): Promise<User | null> => {
    const raw = await getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as User;
    } catch {
      return null;
    }
  },
  setUser: (u: User | null) => setItem(USER_KEY, u ? JSON.stringify(u) : null),
  clear: async () => {
    await setItem(TOKEN_KEY, null);
    await setItem(USER_KEY, null);
  },
};
