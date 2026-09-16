import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_SYNC_CODE = "@diario_vendas:sync_code_v1";
const KEY_FIREBASE_TOKEN = "@diario_vendas:firebase_token_v1";
const KEY_AUTH_USER = "@diario_vendas:firebase_user_v1";

// Pega a URL base da API — em dev usa o domínio do Replit, em prod usa a URL publicada
function getApiBase(): string {
  const domain =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DOMAIN) ?? "";
  if (domain) return `https://${domain}/api`;
  return "/api";
}

export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_FIREBASE_TOKEN);
  } catch {
    return null;
  }
}

export async function saveAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(KEY_FIREBASE_TOKEN, token.trim());
}

export async function removeAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(KEY_FIREBASE_TOKEN);
  await AsyncStorage.removeItem(KEY_AUTH_USER);
}

export async function getAuthUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY_AUTH_USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function saveAuthUser(user: any): Promise<void> {
  await AsyncStorage.setItem(KEY_AUTH_USER, JSON.stringify(user));
}

export async function getSyncCode(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(KEY_SYNC_CODE);
  } catch {
    return null;
  }
}

export async function saveSyncCode(code: string): Promise<void> {
  await AsyncStorage.setItem(KEY_SYNC_CODE, code.trim().toUpperCase());
}

export async function removeSyncCode(): Promise<void> {
  await AsyncStorage.removeItem(KEY_SYNC_CODE);
}

export function gerarSyncCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

interface SyncPayload {
  profiles: Array<{ profileId: string; nome: string }>;
  dias: Array<{ profileId: string; data: string; itensJson: string; margem: string }>;
  configs: Array<{ profileId: string; mesId: string; configJson: string }>;
}

interface SyncResult {
  ok: boolean;
  error?: string;
  ownerUid?: string;
}

export async function pushToCloud(syncCode: string, payload: SyncPayload): Promise<SyncResult> {
  const token = await getAuthToken();
  if (!token) {
    return {
      ok: false,
      error: "Usuário não autenticado no Firebase. É necessário conectar sua conta para sincronizar.",
    };
  }

  try {
    const res = await fetch(`${getApiBase()}/sync/${syncCode}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as any).error ?? `Erro HTTP ${res.status}` };
    }
    const data = await res.json().catch(() => ({}));
    return { ok: true, ownerUid: data.ownerUid };
  } catch (e: any) {
    return { ok: false, error: e.message || "Erro de conexão com o servidor" };
  }
}

export interface CloudData {
  profiles: Array<{ profileId: string; nome: string; syncCode: string; updatedAt: string }>;
  dias: Array<{ profileId: string; data: string; itensJson: string; margem: string; syncCode: string; updatedAt: string }>;
  configs: Array<{ profileId: string; mesId: string; configJson: string; syncCode: string; updatedAt: string }>;
  ownerUid?: string;
}

export async function pullFromCloud(syncCode: string): Promise<CloudData | null> {
  const token = await getAuthToken();
  if (!token) {
    console.warn("Pull ignorado: autenticação Firebase pendente.");
    return null;
  }

  try {
    const res = await fetch(`${getApiBase()}/sync/${syncCode}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as CloudData;
  } catch {
    return null;
  }
}
