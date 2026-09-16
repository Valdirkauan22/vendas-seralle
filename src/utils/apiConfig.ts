import { Capacitor } from "@capacitor/core";

export const CLOUD_RUN_API_BASE =
  (import.meta as any).env?.VITE_BACKEND_URL ||
  "https://ais-dev-c3bxksr4hzv4e7jlqzkeja-549480991017.us-east1.run.app";

/**
 * Retorna a URL correta para chamadas de API do backend.
 * No ambiente Web (Navegador/PWA/AI Studio), usa caminho relativo ("" ou "/api/...").
 * No ambiente Nativo Android (Capacitor APK), usa o host do Cloud Run para não falhar com https://localhost.
 */
export function getApiUrl(endpoint: string): string {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  if (typeof window !== "undefined" && Capacitor.isNativePlatform()) {
    return `${CLOUD_RUN_API_BASE}${cleanEndpoint}`;
  }

  return cleanEndpoint;
}
