import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_SYNC_CODE = "@diario_vendas:sync_code_v1";

// Pega a URL base da API — em dev usa o domínio do Replit, em prod usa a URL publicada
function getApiBase(): string {
  const domain =
    (typeof process !== "undefined" && process.env?.EXPO_PUBLIC_DOMAIN) ?? "";
  if (domain) return `https://${domain}/api`;
  return "/api";
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
}

export async function pushToCloud(syncCode: string, payload: SyncPayload): Promise<SyncResult> {
  try {
    const res = await fetch(`${getApiBase()}/sync/${syncCode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as any).error ?? "Erro de servidor" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: "Sem conexão" };
  }
}

export interface CloudData {
  profiles: Array<{ profileId: string; nome: string; syncCode: string; updatedAt: string }>;
  dias: Array<{ profileId: string; data: string; itensJson: string; margem: string; syncCode: string; updatedAt: string }>;
  configs: Array<{ profileId: string; mesId: string; configJson: string; syncCode: string; updatedAt: string }>;
}

export async function pullFromCloud(syncCode: string): Promise<CloudData | null> {
  try {
    const res = await fetch(`${getApiBase()}/sync/${syncCode}`);
    if (!res.ok) return null;
    return await res.json() as CloudData;
  } catch {
    return null;
  }
}
