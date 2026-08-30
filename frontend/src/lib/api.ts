import { authStorage } from "./auth";

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type Entry = {
  id: string;
  category: string;
  nomor: string;
  keterangan: string;
  owner: string;
  region: string;
  created_at: string;
  updated_at: string;
};

export type Category = { key: string; label: string };

export type RekapCategory = {
  key: string;
  label: string;
  items: { nomor: string; keterangan: string }[];
};

export type RekapGroup = {
  owner: string;
  region: string;
  categories: RekapCategory[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await authStorage.getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (res.status === 401) {
    await authStorage.clear();
    throw new Error("Sesi berakhir. Silakan login ulang.");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (j?.detail) msg = j.detail;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  login: (username: string, password: string) =>
    request<{
      access_token: string;
      token_type: string;
      username: string;
      role: "admin" | "user";
      region: string;
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  me: () => request<{ username: string; role: "admin" | "user"; region: string }>("/api/auth/me"),
  categories: () => request<Category[]>("/api/categories"),
  listEntries: (category: string) => request<Entry[]>(`/api/entries/${category}`),
  createEntry: (category: string, nomor: string, keterangan: string) =>
    request<Entry>(`/api/entries/${category}`, {
      method: "POST",
      body: JSON.stringify({ nomor, keterangan }),
    }),
  updateEntry: (category: string, id: string, nomor: string, keterangan: string) =>
    request<Entry>(`/api/entries/${category}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ nomor, keterangan }),
    }),
  deleteEntry: (category: string, id: string) =>
    request<{ ok: boolean }>(`/api/entries/${category}/${id}`, { method: "DELETE" }),
  rekap: () =>
    request<{ groups: RekapGroup[]; generated_at: string }>("/api/rekap"),
};
