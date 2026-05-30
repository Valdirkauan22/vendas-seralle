import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  CONFIG_MES_PADRAO,
  getMesAtualId,
  getMesId,
  getHojeStr,
  nomeMes,
  useVendas,
} from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProgressBar({
  valor,
  meta,
  label,
  pares,
  metaPares,
  cor,
  colors,
}: {
  valor: number;
  meta: number;
  label: string;
  pares: number;
  metaPares: number;
  cor: string;
  colors: ReturnType<typeof useColors>;
}) {
  const pct = Math.min(valor / meta, 1);
  const atingiu = valor >= meta;
  const falta = meta - valor;

  return (
    <View style={styles.cotaRow}>
      <View style={styles.cotaHeader}>
        <View style={styles.cotaLabelRow}>
          <View style={[styles.cotaDot, { backgroundColor: cor }]} />
          <Text style={[styles.cotaLabel, { color: colors.foreground }]}>
            {label}
          </Text>
          {atingiu && (
            <View style={[styles.badge, { backgroundColor: cor + "22" }]}>
              <Text style={[styles.badgeText, { color: cor }]}>✓ Atingida</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cotaValores, { color: colors.mutedForeground }]}>
          {pares}/{metaPares} pares · {formatMoeda(meta)}
        </Text>
      </View>
      <View
        style={[styles.progressTrack, { backgroundColor: colors.muted }]}
      >
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%` as any, backgroundColor: cor },
          ]}
        />
      </View>
      <View style={styles.cotaFooter}>
        <Text style={[styles.cotaPct, { color: cor }]}>
          {(pct * 100).toFixed(1)}%
        </Text>
        {!atingiu && (
          <Text style={[styles.cotaFalta, { color: colors.mutedForeground }]}>
            Falta {formatMoeda(falta)}
          </Text>
        )}
      </View>
    </View>
  );
}

export default function ResumoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTotalMes, getConfigMes, getDia } = useVendas();

  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);

  const mesId = getMesId(ano, mes);
  const total = getTotalMes(mesId);
  const config = getConfigMes(mesId);
  const hoje = getHojeStr();
  const diaHoje = getDia(hoje);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const handlePrevMes = useCallback(() => {
    Haptics.selectionAsync();
    if (mes === 1) { setMes(12); setAno((a) => a - 1); }
    else setMes((m) => m - 1);
  }, [mes]);

  const handleNextMes = useCallback(() => {
    Haptics.selectionAsync();
    if (mes === 12) { setMes(1); setAno((a) => a + 1); }
    else setMes((m) => m + 1);
  }, [mes]);

  const handleHoje = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/dia/${hoje}`);
  }, [hoje]);

  const isHojeMesAtual =
    ano === now.getFullYear() && mes === now.getMonth() + 1;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handlePrevMes}
          style={({ pressed }) => [styles.navArrow, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerMes, { color: colors.foreground }]}>
            {nomeMes(mes)}
          </Text>
          <Text style={[styles.headerAno, { color: colors.mutedForeground }]}>
            {ano}
          </Text>
        </View>
        <Pressable
          onPress={handleNextMes}
          style={({ pressed }) => [styles.navArrow, { opacity: pressed ? 0.5 : 1 }]}
        >
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: bottomPad + 16 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Totais mensais */}
        <View
          style={[
            styles.totalCard,
            { backgroundColor: colors.primary },
          ]}
        >
          <View style={styles.totalRow}>
            <View style={styles.totalHalf}>
              <Text style={[styles.totalLabel, { color: "rgba(255,255,255,0.75)" }]}>
                VENDA MENSAL
              </Text>
              <Text style={[styles.totalValor, { color: "#fff" }]}>
                {formatMoeda(total.valor)}
              </Text>
            </View>
            <View style={[styles.totalDivider, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
            <View style={styles.totalHalf}>
              <Text style={[styles.totalLabel, { color: "rgba(255,255,255,0.75)" }]}>
                PARES VENDIDOS
              </Text>
              <Text style={[styles.totalValor, { color: "#fff" }]}>
                {total.pares}
              </Text>
            </View>
          </View>
          {total.margem > 0 && (
            <View style={[styles.margemRow, { borderTopColor: "rgba(255,255,255,0.2)" }]}>
              <Feather name="trending-up" size={13} color="rgba(255,255,255,0.75)" />
              <Text style={[styles.margemText, { color: "rgba(255,255,255,0.75)" }]}>
                Margem média: {total.margem.toFixed(1)}%
              </Text>
            </View>
          )}
          {total.dias > 0 && (
            <Text style={[styles.diasText, { color: "rgba(255,255,255,0.6)" }]}>
              {total.dias} {total.dias === 1 ? "dia" : "dias"} com lançamento
            </Text>
          )}
        </View>

        {/* Hoje */}
        {isHojeMesAtual && (
          <Pressable
            onPress={handleHoje}
            style={({ pressed }) => [
              styles.hojeCard,
              {
                backgroundColor: colors.card,
                borderColor: diaHoje ? colors.primary : colors.border,
                borderWidth: diaHoje ? 1.5 : 1,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View style={styles.hojeLeft}>
              <Feather
                name={diaHoje ? "check-circle" : "circle"}
                size={18}
                color={diaHoje ? colors.primary : colors.mutedForeground}
              />
              <View>
                <Text style={[styles.hojeTitle, { color: colors.foreground }]}>
                  Hoje
                </Text>
                {diaHoje ? (
                  <Text style={[styles.hojeSubtitle, { color: colors.mutedForeground }]}>
                    {formatMoeda(diaHoje.valor)} · {diaHoje.pares} pares
                    {diaHoje.margem > 0 ? ` · ${diaHoje.margem}%` : ""}
                  </Text>
                ) : (
                  <Text style={[styles.hojeSubtitle, { color: colors.mutedForeground }]}>
                    Toque para lançar as vendas do dia
                  </Text>
                )}
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </Pressable>
        )}

        {/* Metas */}
        <View
          style={[
            styles.metasCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.metasTitle, { color: colors.foreground }]}>
            Metas do Mês
          </Text>
          <ProgressBar
            label="Cota A"
            valor={total.valor}
            meta={config.cotaA.valor}
            pares={total.pares}
            metaPares={config.cotaA.pares}
            cor="#10B981"
            colors={colors}
          />
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <ProgressBar
            label="Cota B"
            valor={total.valor}
            meta={config.cotaB.valor}
            pares={total.pares}
            metaPares={config.cotaB.pares}
            cor="#3B82F6"
            colors={colors}
          />
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <ProgressBar
            label="Cota C"
            valor={total.valor}
            meta={config.cotaC.valor}
            pares={total.pares}
            metaPares={config.cotaC.pares}
            cor="#8B5CF6"
            colors={colors}
          />
        </View>

        {/* Configurar metas */}
        <Pressable
          onPress={() => router.push(`/metas/${mesId}`)}
          style={({ pressed }) => [
            styles.configBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="settings" size={15} color={colors.mutedForeground} />
          <Text style={[styles.configBtnText, { color: colors.mutedForeground }]}>
            Configurar metas do mês
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navArrow: { padding: 10 },
  headerCenter: { alignItems: "center" },
  headerMes: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerAno: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { padding: 16, gap: 14 },
  totalCard: {
    borderRadius: 16,
    padding: 20,
  },
  totalRow: { flexDirection: "row", alignItems: "center" },
  totalHalf: { flex: 1 },
  totalDivider: { width: 1, height: 48, marginHorizontal: 16 },
  totalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 4 },
  totalValor: { fontSize: 26, fontFamily: "Inter_700Bold" },
  margemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  margemText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  diasText: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 6 },
  hojeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 14,
    gap: 12,
  },
  hojeLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  hojeTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  hojeSubtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  metasCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  metasTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cotaRow: { gap: 6 },
  cotaHeader: { gap: 2 },
  cotaLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cotaDot: { width: 8, height: 8, borderRadius: 4 },
  cotaLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cotaValores: { fontSize: 12, fontFamily: "Inter_400Regular", paddingLeft: 16 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },
  cotaFooter: { flexDirection: "row", justifyContent: "space-between" },
  cotaPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cotaFalta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaDivider: { height: StyleSheet.hairlineWidth },
  configBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  configBtnText: { fontSize: 13, fontFamily: "Inter_500Medium" },
});
