import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo } from "react";
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
  nomeMes,
  useVendas,
} from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const COTAS = [
  { key: "cotaA" as const, label: "A", cor: "#10B981" },
  { key: "cotaB" as const, label: "B", cor: "#3B82F6" },
  { key: "cotaC" as const, label: "C", cor: "#8B5CF6" },
  { key: "cotaAlta" as const, label: "Alta", cor: "#F59E0B" },
];

function pontuacaoCota(key: string): number {
  return { cotaA: 1, cotaB: 2, cotaC: 3, cotaAlta: 4 }[key] ?? 0;
}

function melhorCota(atingidas: string[]): { label: string; cor: string } | null {
  if (!atingidas.length) return null;
  const melhor = COTAS.filter((c) => atingidas.includes(c.key)).sort(
    (a, b) => pontuacaoCota(b.key) - pontuacaoCota(a.key)
  )[0];
  return melhor ?? null;
}

export default function HistoricoMetasScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { dias, configs, getTotalMes } = useVendas();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const meses = useMemo(() => {
    const mesIds = new Set<string>();
    Object.keys(dias).forEach((data) => mesIds.add(data.slice(0, 7)));
    Object.keys(configs).forEach((id) => mesIds.add(id));
    return Array.from(mesIds).sort((a, b) => b.localeCompare(a));
  }, [dias, configs]);

  const dadosMeses = useMemo(() =>
    meses.map((mesId) => {
      const [anoStr, mesStr] = mesId.split("-");
      const ano = parseInt(anoStr);
      const mes = parseInt(mesStr);
      const total = getTotalMes(mesId);
      const config = configs[mesId] ?? CONFIG_MES_PADRAO;

      const atingidas = COTAS.filter(
        (c) => total.valor >= config[c.key].valor && total.valor > 0
      ).map((c) => c.key);

      return { mesId, ano, mes, total, config, atingidas };
    }),
    [meses, configs, getTotalMes]
  );

  // Estatísticas gerais
  const stats = useMemo(() => {
    let melhorValor = 0;
    let melhorMesLabel = "";
    let totalCotasA = 0, totalCotasB = 0, totalCotasC = 0, totalCotasAlta = 0;

    dadosMeses.forEach(({ mes, ano, total, atingidas }) => {
      if (total.valor > melhorValor) {
        melhorValor = total.valor;
        melhorMesLabel = `${nomeMes(mes)} ${ano}`;
      }
      if (atingidas.includes("cotaA")) totalCotasA++;
      if (atingidas.includes("cotaB")) totalCotasB++;
      if (atingidas.includes("cotaC")) totalCotasC++;
      if (atingidas.includes("cotaAlta")) totalCotasAlta++;
    });

    return { melhorValor, melhorMesLabel, totalCotasA, totalCotasB, totalCotasC, totalCotasAlta };
  }, [dadosMeses]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Navbar */}
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
        <View>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Histórico de Metas</Text>
        </View>
        <View style={styles.navBtn} />
      </View>

      {dadosMeses.length === 0 ? (
        <View style={styles.empty}>
          <Feather name="bar-chart-2" size={48} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sem histórico ainda</Text>
          <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
            Lance suas vendas para acompanhar o progresso nas metas mês a mês.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Card de estatísticas */}
          <View style={[styles.statsCard, { backgroundColor: colors.primary }]}>
            <Text style={styles.statsTitle}>Resumo Geral</Text>
            <Text style={styles.statsSub}>{dadosMeses.length} {dadosMeses.length === 1 ? "mês" : "meses"} com dados</Text>

            <View style={styles.statsGrid}>
              {[
                { label: "Cota A", count: stats.totalCotasA, cor: "#10B981" },
                { label: "Cota B", count: stats.totalCotasB, cor: "#3B82F6" },
                { label: "Cota C", count: stats.totalCotasC, cor: "#8B5CF6" },
                { label: "Alta", count: stats.totalCotasAlta, cor: "#F59E0B" },
              ].map(({ label, count, cor }) => (
                <View key={label} style={styles.statsCell}>
                  <Text style={[styles.statsCellCount, { color: cor === "#F59E0B" ? "#F59E0B" : "#fff" }]}>
                    {count}×
                  </Text>
                  <Text style={styles.statsCellLabel}>{label}</Text>
                </View>
              ))}
            </View>

            {stats.melhorMesLabel ? (
              <View style={styles.melhorMes}>
                <Feather name="star" size={13} color="#F59E0B" />
                <Text style={styles.melhorMesText}>
                  Melhor mês: <Text style={{ fontFamily: "Inter_700Bold" }}>{stats.melhorMesLabel}</Text>
                  {" "}({formatMoeda(stats.melhorValor)})
                </Text>
              </View>
            ) : null}
          </View>

          {/* Lista de meses */}
          {dadosMeses.map(({ mesId, mes, ano, total, config, atingidas }) => {
            const melhor = melhorCota(atingidas);
            const temVendas = total.valor > 0;

            return (
              <Pressable
                key={mesId}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push(`/metas/${mesId}`);
                }}
                style={({ pressed }) => [
                  styles.mesCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: melhor ? melhor.cor + "55" : colors.border,
                    borderWidth: melhor ? 1.5 : 1,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {/* Cabeçalho do mês */}
                <View style={styles.mesHeader}>
                  <View>
                    <Text style={[styles.mesNome, { color: colors.foreground }]}>
                      {nomeMes(mes)} {ano}
                    </Text>
                    <Text style={[styles.mesDias, { color: colors.mutedForeground }]}>
                      {total.dias} {total.dias === 1 ? "dia" : "dias"} com lançamento
                    </Text>
                  </View>
                  {melhor ? (
                    <View style={[styles.melhorBadge, { backgroundColor: melhor.cor + "22", borderColor: melhor.cor + "44" }]}>
                      <Feather name="award" size={12} color={melhor.cor} />
                      <Text style={[styles.melhorBadgeText, { color: melhor.cor }]}>
                        Cota {melhor.label}
                      </Text>
                    </View>
                  ) : temVendas ? (
                    <View style={[styles.melhorBadge, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                      <Text style={[styles.melhorBadgeText, { color: colors.mutedForeground }]}>
                        Sem cota
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* Valor total */}
                {temVendas && (
                  <View style={[styles.totalRow, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Vendas</Text>
                      <Text style={[styles.totalValor, { color: colors.foreground }]}>
                        {formatMoeda(total.valor)}
                      </Text>
                    </View>
                    <View style={styles.totalRight}>
                      <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Pares</Text>
                      <Text style={[styles.totalValor, { color: colors.foreground }]}>{total.pares}</Text>
                    </View>
                    {total.margem > 0 && (
                      <View style={styles.totalRight}>
                        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>Margem</Text>
                        <Text style={[styles.totalValor, { color: colors.foreground }]}>
                          {total.margem.toFixed(1)}%
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Badges das cotas */}
                <View style={styles.cotasBadges}>
                  {COTAS.map((cota) => {
                    const atingiu = atingidas.includes(cota.key);
                    const metaValor = config[cota.key].valor;
                    const pctVal = temVendas ? Math.min((total.valor / metaValor) * 100, 100) : 0;
                    return (
                      <View key={cota.key} style={styles.cotaBadgeWrap}>
                        <View
                          style={[
                            styles.cotaBadge,
                            {
                              backgroundColor: atingiu ? cota.cor : colors.muted,
                              borderColor: atingiu ? cota.cor : colors.border,
                            },
                          ]}
                        >
                          {atingiu && <Feather name="check" size={10} color="#fff" />}
                          <Text style={[styles.cotaBadgeLabel, { color: atingiu ? "#fff" : colors.mutedForeground }]}>
                            {cota.label}
                          </Text>
                        </View>
                        {temVendas && !atingiu && (
                          <Text style={[styles.cotaPct, { color: colors.mutedForeground }]}>
                            {pctVal.toFixed(0)}%
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Pressable>
            );
          })}
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
  navBtn: { padding: 4, width: 40 },
  navTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 12 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", textAlign: "center" },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  statsCard: {
    borderRadius: 16,
    padding: 20,
    gap: 4,
  },
  statsTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: "#fff" },
  statsSub: { fontSize: 13, color: "rgba(255,255,255,0.7)", fontFamily: "Inter_400Regular", marginBottom: 8 },
  statsGrid: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  statsCell: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    gap: 2,
  },
  statsCellCount: { fontSize: 20, fontFamily: "Inter_700Bold" },
  statsCellLabel: { fontSize: 11, color: "rgba(255,255,255,0.8)", fontFamily: "Inter_500Medium" },
  melhorMes: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 8,
    padding: 10,
  },
  melhorMesText: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontFamily: "Inter_400Regular", flex: 1 },
  mesCard: {
    borderRadius: 16,
    overflow: "hidden",
    gap: 0,
  },
  mesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 12,
  },
  mesNome: { fontSize: 16, fontFamily: "Inter_700Bold" },
  mesDias: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  melhorBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  melhorBadgeText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  totalRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 16,
  },
  totalRight: { alignItems: "flex-end", flex: 1 },
  totalLabel: { fontSize: 10, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5 },
  totalValor: { fontSize: 15, fontFamily: "Inter_700Bold", marginTop: 2 },
  cotasBadges: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
  },
  cotaBadgeWrap: { alignItems: "center", gap: 3 },
  cotaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  cotaBadgeLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cotaPct: { fontSize: 10, fontFamily: "Inter_400Regular" },
});
