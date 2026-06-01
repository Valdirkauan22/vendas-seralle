import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const KEY = "@diario_vendas:notif_config";
const NOTIF_ID = "daily-reminder";

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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function cancelarNotificacao(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

export async function agendarNotificacao(config: NotifConfig): Promise<void> {
  await cancelarNotificacao();
  if (!config.enabled || Platform.OS === "web") return;

  const granted = await requestPermission();
  if (!granted) return;

  const mensagens = [
    "Não esqueça de registrar suas vendas de hoje! 👟",
    "Hora de lançar as vendas do dia na Serallê! 📊",
    "Seus números de hoje estão esperando ser registrados! 💼",
    "Registre suas vendas agora e acompanhe seu progresso! 🎯",
  ];
  const body = mensagens[Math.floor(Math.random() * mensagens.length)];

  await Notifications.scheduleNotificationAsync({
    identifier: NOTIF_ID,
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
}

export async function aplicarConfigNotif(config: NotifConfig): Promise<void> {
  await saveNotifConfig(config);
  if (config.enabled) {
    await agendarNotificacao(config);
  } else {
    await cancelarNotificacao();
  }
}
