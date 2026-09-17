import { LembretesConfig, LEMBRETES_CONFIG_PADRAO } from "@/types";
import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { PushNotifications } from "@capacitor/push-notifications";
import {
  initializeNativePushNotifications,
  sendCapacitorLocalNotification,
} from "@/lib/nativeNotifications";

const STORAGE_KEY = "@diario_vendas:lembretes_config_v1";
const FIRED_TODAY_KEY = "@diario_vendas:lembretes_fired_today";

/**
 * Lê a configuração de lembretes salva no dispositivo.
 */
export function getLembretesConfig(): LembretesConfig {
  if (typeof window === "undefined") return LEMBRETES_CONFIG_PADRAO;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return LEMBRETES_CONFIG_PADRAO;
    const parsed = JSON.parse(raw);
    return { ...LEMBRETES_CONFIG_PADRAO, ...parsed };
  } catch {
    return LEMBRETES_CONFIG_PADRAO;
  }
}

/**
 * Salva a configuração de lembretes.
 */
export function saveLembretesConfig(cfg: LembretesConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (err) {
    console.error("Erro ao salvar config de lembretes:", err);
  }
}

/**
 * Verifica se a notificação é suportada (Nativo Capacitor ou Web Notification API).
 */
export function isNotificationSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (Capacitor.isNativePlatform()) return true;
  return "Notification" in window;
}

/**
 * Retorna o status atual da permissão de notificação.
 */
export async function getNotificationPermissionAsync(): Promise<NotificationPermission | "unsupported"> {
  if (Capacitor.isNativePlatform()) {
    try {
      const status = await PushNotifications.checkPermissions();
      if (status.receive === "granted") return "granted";
      if (status.receive === "denied") return "denied";
      return "default";
    } catch {
      return "default";
    }
  }

  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (Capacitor.isNativePlatform()) {
    return "granted";
  }
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

/**
 * Solicita permissão para notificações nativas (Capacitor ou Navegador).
 */
export async function requestNotificationPermission(userId?: string | null): Promise<NotificationPermission | "unsupported"> {
  if (Capacitor.isNativePlatform()) {
    try {
      const success = await initializeNativePushNotifications(userId);
      return success ? "granted" : "denied";
    } catch (e) {
      console.warn("Erro ao solicitar no Capacitor:", e);
      return "denied";
    }
  }

  if (!("Notification" in window)) return "unsupported";

  if (Notification.permission === "granted" || Notification.permission === "denied") {
    return Notification.permission;
  }

  try {
    const timeoutPromise = new Promise<NotificationPermission>((resolve) => {
      setTimeout(() => {
        resolve(Notification.permission);
      }, 10000);
    });

    const requestPromise = new Promise<NotificationPermission>((resolve) => {
      try {
        const p = Notification.requestPermission((status) => {
          if (status) resolve(status);
        });
        if (p && typeof p.then === "function") {
          p.then(resolve).catch(() => resolve(Notification.permission));
        }
      } catch (err) {
        console.warn("Erro no requestPermission:", err);
        resolve(Notification.permission);
      }
    });

    const result = await Promise.race([requestPromise, timeoutPromise]);
    return result || Notification.permission;
  } catch (e) {
    console.warn("Erro ao solicitar permissão de notificação:", e);
    return Notification.permission;
  }
}

/**
 * Toca um sinal sonoro agradável e discreto de 2 tons (Chime Serallê)
 */
export function playChimeNotification(): void {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Nota 1 (Dó 5 - 523 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.18, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.36);

    // Nota 2 (Sol 5 - 784 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(783.99, now + 0.14);
    gain2.gain.setValueAtTime(0.0001, now + 0.14);
    gain2.gain.exponentialRampToValueAtTime(0.22, now + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.14);
    osc2.stop(now + 0.62);

    setTimeout(() => {
      try {
        ctx.close();
      } catch {}
    }, 1000);
  } catch (err) {
    console.warn("Áudio não pôde ser reproduzido:", err);
  }
}

/**
 * Dispara uma notificação para o usuário:
 * 1. Som nativo/WebAudio
 * 2. Banner in-app
 * 3. Notificação nativa Android (via Capacitor Local/Push Notifications) ou Web Notification
 */
export async function sendNativeNotification(
  title: string,
  options?: NotificationOptions & { sound?: boolean; type?: "fechamento" | "ritmo" | "geral" }
): Promise<boolean> {
  const config = getLembretesConfig();

  // 1. Toca o sinal sonoro característico da Serallê
  if (config.somHabilitado || options?.sound) {
    playChimeNotification();
  }

  // 2. Dispara o banner visual flutuante interno do Diário Serallê
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(
        new CustomEvent("seralle-notification", {
          detail: {
            title,
            body: options?.body || "",
            type: options?.type || "geral",
          },
        })
      );
    } catch {}
  }

  // 3. Se for aplicativo Android Nativo (Capacitor)
  if (Capacitor.isNativePlatform()) {
    try {
      const ok = await sendCapacitorLocalNotification(title, options?.body || "Acesse o Diário Serallê para conferir.");
      if (ok) return true;
    } catch (e) {
      console.warn("Erro ao disparar via Capacitor:", e);
    }
  }

  // 4. Se for Web / PWA clássico
  if (!isNotificationSupported()) return false;
  if (typeof Notification !== "undefined" && Notification.permission !== "granted") return false;

  const defaultOptions: NotificationOptions = {
    icon: "/icon-192.png?v=2",
    badge: "/icon-192.png?v=2",
    tag: "seralle-notificacao",
    ...options,
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && reg.showNotification) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    }

    if (typeof Notification !== "undefined") {
      new Notification(title, defaultOptions);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Falha ao emitir notificação no navegador:", err);
    return false;
  }
}

/**
 * Controle para não repetir o mesmo alerta no mesmo dia.
 */
export function hasNotificationFiredToday(type: "fechamento" | "ritmo"): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(FIRED_TODAY_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return data[`${type}_${today}`] === true;
  } catch {
    return false;
  }
}

export function markNotificationFiredToday(type: "fechamento" | "ritmo"): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(FIRED_TODAY_KEY);
    const data = raw ? JSON.parse(raw) : {};
    const today = new Date().toISOString().slice(0, 10);
    data[`${type}_${today}`] = true;
    localStorage.setItem(FIRED_TODAY_KEY, JSON.stringify(data));
  } catch (err) {
    console.error(err);
  }
}
