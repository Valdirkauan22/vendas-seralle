import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const KEY = "@diario_vendas:notif_config";

export interface NotifConfig {
  enabled: boolean;
  hora: number;
  minuto: number;
}

export const NOTIF_PADRAO: NotifConfig = {
  enabled: false,
  hora: 18,
  minuto: 0,
};

// Import dinâmico: evita crash no Expo Go SDK 53+ onde expo-notifications
// foi removido do bundle padrão para Android. Verifica se as funções
// essenciais existem — no Expo Go elas são undefined mesmo o módulo carregando.
async function getNotifications() {
  try {
    const mod = await import("expo-notifications");
    if (typeof mod?.setNotificationHandler !== "function") return null;
    return mod;
  } catch {
    return null;
  }
}

// Inicializa o handler apenas se o módulo estiver disponível
export async function initNotificationHandler() {
  if (Platform.OS === "web") return;
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {
    // expo-notifications não disponível nesta plataforma (ex: Expo Go Android SDK 53+)
  }
}

export async function getNotifConfig(): Promise<NotifConfig> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return NOTIF_PADRAO;
    return { ...NOTIF_PADRAO, ...JSON.parse(raw) };
  } catch {
    return NOTIF_PADRAO;
  }
}

export async function saveNotifConfig(config: NotifConfig): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(config));
}

export async function requestPermission(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const Notifications = await getNotifications();
  if (!Notifications) return false;
  try {
    const { status: existing } = await Notifications.getPermissionsAsync();
    if (existing === "granted") return true;
    const { status } = await Notifications.requestPermissionsAsync();
    return status === "granted";
  } catch {
    return false;
  }
}

export async function cancelarNotificacao(): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignorar se não suportado
  }
}

export async function agendarNotificacao(config: NotifConfig): Promise<void> {
  await cancelarNotificacao();
  if (!config.enabled || Platform.OS === "web") return;

  const Notifications = await getNotifications();
  if (!Notifications) return;

  const granted = await requestPermission();
  if (!granted) return;

  try {
    const mensagens = [
      "Não esqueça de registrar suas vendas de hoje! 👟",
      "Hora de lançar as vendas do dia na Serallê! 📊",
      "Seus números de hoje estão esperando ser registrados! 💼",
      "Registre suas vendas agora e acompanhe seu progresso! 🎯",
    ];
    const body = mensagens[Math.floor(Math.random() * mensagens.length)];

    await Notifications.scheduleNotificationAsync({
      identifier: "daily-reminder",
      content: {
        title: "Diário de Vendas · Serallê",
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: config.hora,
        minute: config.minuto,
      },
    });
  } catch {
    // ignorar falhas de agendamento
  }
}

export async function aplicarConfigNotif(config: NotifConfig): Promise<void> {
  await saveNotifConfig(config);
  if (config.enabled) {
    await agendarNotificacao(config);
  } else {
    await cancelarNotificacao();
  }
}
