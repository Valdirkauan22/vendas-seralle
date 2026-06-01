import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";
import {
  NotifConfig,
  NOTIF_PADRAO,
  aplicarConfigNotif,
  getNotifConfig,
} from "@/utils/notifications";

export default function NotificacoesScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [config, setConfig] = useState<NotifConfig>(NOTIF_PADRAO);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getNotifConfig().then((c) => {
      setConfig(c);
      setLoading(false);
    });
  }, []);

  const handleToggle = (val: boolean) => {
    Haptics.selectionAsync();
    setConfig((c) => ({ ...c, enabled: val }));
  };

  const adjustHora = (delta: number) => {
    Haptics.selectionAsync();
    setConfig((c) => ({ ...c, hora: (c.hora + delta + 24) % 24 }));
  };

  const adjustMinuto = (delta: number) => {
    Haptics.selectionAsync();
    setConfig((c) => ({ ...c, minuto: (c.minuto + delta + 60) % 60 }));
  };

  const handleSalvar = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    try {
      await aplicarConfigNotif(config);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const horaStr = String(config.hora).padStart(2, "0");
  const minStr = String(config.minuto).padStart(2, "0");

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.navBar,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]}>Notificações</Text>
        <Pressable
          onPress={handleSalvar}
          disabled={saving || loading}
          style={({ pressed }) => [
            styles.saveBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Text style={[styles.saveBtnText, { color: "#fff" }]}>
            {saving ? "..." : "Salvar"}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={colors.primary} />
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Toggle */}
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleText}>
                <Text style={[styles.toggleTitle, { color: colors.foreground }]}>
                  Lembrete diário
                </Text>
                <Text style={[styles.toggleSub, { color: colors.mutedForeground }]}>
                  Receber notificação para registrar as vendas do dia
                </Text>
              </View>
              <Switch
                value={config.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.muted, true: colors.primary + "88" }}
                thumbColor={config.enabled ? colors.primary : colors.mutedForeground}
              />
            </View>
          </View>

          {/* Horário */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
              !config.enabled && styles.cardDisabled,
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>Horário do lembrete</Text>
            <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
              Escolha o horário em que você prefere ser lembrada
            </Text>

            <View style={styles.timeRow}>
              {/* Hora */}
              <View style={styles.timeBlock}>
                <Pressable
                  onPress={() => config.enabled && adjustHora(1)}
                  style={({ pressed }) => [
                    styles.timeBtn,
                    { backgroundColor: colors.muted, opacity: pressed || !config.enabled ? 0.5 : 1 },
                  ]}
                >
                  <Feather name="chevron-up" size={22} color={colors.foreground} />
                </Pressable>
                <View style={[styles.timeDisplay, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.timeText, { color: colors.foreground, opacity: config.enabled ? 1 : 0.4 }]}>
                    {horaStr}
                  </Text>
                </View>
                <Pressable
                  onPress={() => config.enabled && adjustHora(-1)}
                  style={({ pressed }) => [
                    styles.timeBtn,
                    { backgroundColor: colors.muted, opacity: pressed || !config.enabled ? 0.5 : 1 },
                  ]}
                >
                  <Feather name="chevron-down" size={22} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>hora</Text>
              </View>

              <Text style={[styles.timeSep, { color: config.enabled ? colors.foreground : colors.mutedForeground }]}>
                :
              </Text>

              {/* Minuto */}
              <View style={styles.timeBlock}>
                <Pressable
                  onPress={() => config.enabled && adjustMinuto(5)}
                  style={({ pressed }) => [
                    styles.timeBtn,
                    { backgroundColor: colors.muted, opacity: pressed || !config.enabled ? 0.5 : 1 },
                  ]}
                >
                  <Feather name="chevron-up" size={22} color={colors.foreground} />
                </Pressable>
                <View style={[styles.timeDisplay, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                  <Text style={[styles.timeText, { color: colors.foreground, opacity: config.enabled ? 1 : 0.4 }]}>
                    {minStr}
                  </Text>
                </View>
                <Pressable
                  onPress={() => config.enabled && adjustMinuto(-5)}
                  style={({ pressed }) => [
                    styles.timeBtn,
                    { backgroundColor: colors.muted, opacity: pressed || !config.enabled ? 0.5 : 1 },
                  ]}
                >
                  <Feather name="chevron-down" size={22} color={colors.foreground} />
                </Pressable>
                <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>min</Text>
              </View>
            </View>

            {config.enabled && (
              <View style={[styles.previewBanner, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "33" }]}>
                <Feather name="bell" size={14} color={colors.primary} />
                <Text style={[styles.previewText, { color: colors.primary }]}>
                  Você receberá um lembrete todos os dias às {horaStr}:{minStr}
                </Text>
              </View>
            )}
          </View>

          {Platform.OS === "web" && (
            <View style={[styles.webWarning, { backgroundColor: colors.warning + "18", borderColor: colors.warning + "44" }]}>
              <Feather name="alert-circle" size={15} color={colors.warning} />
              <Text style={[styles.webWarningText, { color: colors.warning }]}>
                Notificações push funcionam apenas no app instalado (iOS/Android)
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn: { padding: 4, width: 44 },
  navTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  saveBtn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 16, gap: 14 },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  cardDisabled: { opacity: 0.6 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleText: { flex: 1, gap: 4 },
  toggleTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  toggleSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  timeBlock: { alignItems: "center", gap: 8 },
  timeBtn: {
    width: 48,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  timeDisplay: {
    width: 80,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timeText: { fontSize: 36, fontFamily: "Inter_700Bold" },
  timeLabel: { fontSize: 12, fontFamily: "Inter_400Regular" },
  timeSep: { fontSize: 40, fontFamily: "Inter_700Bold", marginBottom: 24 },
  previewBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  previewText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
  webWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  webWarningText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1 },
});
