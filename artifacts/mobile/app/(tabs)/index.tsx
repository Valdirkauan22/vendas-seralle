import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfile } from "@/context/ProfileContext";
import {
  getMesId,
  getMesAtualId,
  getHojeStr,
  nomeMes,
  diasNoMes,
  useVendas,
  type SyncStatus,
} from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";
import { gerarECompartilharRelatorio } from "@/utils/relatorio";

function formatMoeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function ProgressBar({
  valor,
  meta,
  label,
  pares,
  metaPares,
  metaMargem,
  margemAtual,
  cor,
  colors,
}: {
  valor: number;
  meta: number;
  label: string;
  pares: number;
  metaPares: number;
  metaMargem: number;
  margemAtual: number;
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
          <Text style={[styles.cotaLabel, { color: colors.foreground }]}>{label}</Text>
          {atingiu && (
            <View style={[styles.badge, { backgroundColor: cor + "22" }]}>
              <Text style={[styles.badgeText, { color: cor }]}>✓ Atingida</Text>
            </View>
          )}
        </View>
        <Text style={[styles.cotaValores, { color: colors.mutedForeground }]}>
          {pares}/{metaPares} pares · {formatMoeda(meta)}
          {metaMargem > 0 ? ` · ${metaMargem}% margem` : ""}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View
          style={[
            styles.progressFill,
            { width: `${pct * 100}%` as any, backgroundColor: cor },
          ]}
        />
      </View>
      <View style={styles.cotaFooter}>
        <Text style={[styles.cotaPct, { color: cor }]}>{(pct * 100).toFixed(1)}%</Text>
        <View style={styles.cotaFooterRight}>
          {metaMargem > 0 && (
            <Text style={[styles.cotaMargem, { color: margemAtual >= metaMargem ? cor : colors.mutedForeground }]}>
              Margem: {margemAtual > 0 ? `${margemAtual.toFixed(1)}%` : "—"}/{metaMargem}%
            </Text>
          )}
          {!atingiu && (
            <Text style={[styles.cotaFalta, { color: colors.mutedForeground }]}>
              Falta {formatMoeda(falta)}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ResumoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getTotalMes, getConfigMes, getDiaTotais, getDiasMes, getDia, syncStatus, sincronizarAgora } = useVendas();
  const { perfilAtivo, perfis } = useProfile();

  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [exporting, setExporting] = useState(false);

  const mesId = getMesId(ano, mes);
  const total = getTotalMes(mesId);
  const config = getConfigMes(mesId);
  const hoje = getHojeStr();
  const totaisHoje = getDiaTotais(hoje);

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

  const isHojeMesAtual = ano === now.getFullYear() && mes === now.getMonth() + 1;

  const handleExportar = useCallback(async () => {
    if (total.dias === 0) {
      Alert.alert("Sem dados", "Não há vendas lançadas neste mês para exportar.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setExporting(true);
    try {
      await gerarECompartilharRelatorio({
        mesNome: nomeMes(mes),
        ano,
        total,
        config,
        diasMes: getDiasMes(mesId),
      });
    } catch (e) {
      Alert.alert("Erro", "Não foi possível gerar o relatório.");
    } finally {
      setExporting(false);
    }
  }, [total, config, mes, ano, mesId, getDiasMes]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
        ]}
      >
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/images/logo.webp")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View style={styles.headerRight}>
            {perfis.length > 0 && (
              <Pressable
                onPress={() => router.push("/perfis")}
                style={({ pressed }) => [
                  styles.perfilChip,
                  { backgroundColor: colors.muted, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <Feather name="user" size={12} color={colors.primary} />
                <Text style={[styles.perfilChipText, { color: colors.foreground }]} numberOfLines={1}>
                  {perfilAtivo?.nome ?? "—"}
                </Text>
                {perfis.length > 1 && (
                  <Feather name="chevron-down" size={12} color={colors.mutedForeground} />
                )}
              </Pressable>
            )}
            <Pressable
              onPress={() => sincronizarAgora()}
              style={({ pressed }) => [styles.bellBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather
                name={syncStatus === "syncing" ? "loader" : syncStatus === "error" ? "cloud-off" : "cloud"}
                size={19}
                color={syncStatus === "error" ? colors.destructive : syncStatus === "ok" ? "#10B981" : colors.mutedForeground}
              />
            </Pressable>
            <Pressable
              onPress={() => router.push("/notificacoes")}
              style={({ pressed }) => [styles.bellBtn, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Feather name="bell" size={20} color={colors.primary} />
            </Pressable>
          </View>
        </View>
        <View style={styles.mesNav}>
          <Pressable
            onPress={handlePrevMes}
            style={({ pressed }) => [styles.navArrow, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerMes, { color: colors.foreground }]}>{nomeMes(mes)}</Text>
            <Text style={[styles.headerAno, { color: colors.mutedForeground }]}>{ano}</Text>
          </View>
          <Pressable
            onPress={handleNextMes}
            style={({ pressed }) => [styles.navArrow, { opacity: pressed ? 0.5 : 1 }]}
          >
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 16 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Totais mensais */}
        <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
          <View style={styles.totalRow}>
            <View style={styles.totalHalf}>
              <Text style={[styles.totalLabel, { color: "rgba(255,255,255,0.75)" }]}>VENDA MENSAL</Text>
              <Text style={[styles.totalValor, { color: "#fff" }]}>{formatMoeda(total.valor)}</Text>
            </View>
            <View style={[styles.totalDivider, { backgroundColor: "rgba(255,255,255,0.25)" }]} />
            <View style={styles.totalHalf}>
              <Text style={[styles.totalLabel, { color: "rgba(255,255,255,0.75)" }]}>PARES VENDIDOS</Text>
              <Text style={[styles.totalValor, { color: "#fff" }]}>{total.pares}</Text>
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

        {/* Widget Hoje */}
        {isHojeMesAtual && (() => {
          const diaData = getDia(hoje);
          const ultimaVenda = diaData?.itens?.length
            ? diaData.itens[diaData.itens.length - 1]
            : null;
          const totalDias = diasNoMes(ano, mes);
          const metaDiaria = config.cotaA.valor / totalDias;
          const pctMeta = totaisHoje
            ? Math.min((totaisHoje.valor / metaDiaria) * 100, 100)
            : 0;
          const atingiuMeta = totaisHoje ? totaisHoje.valor >= metaDiaria : false;

          const diaSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][now.getDay()];
          const diaNum = now.getDate();
          const mesNomeHoje = nomeMes(now.getMonth() + 1);

          return (
            <View style={[styles.hojeWidget, { backgroundColor: colors.card, borderColor: totaisHoje ? colors.primary + "55" : colors.border, borderWidth: totaisHoje ? 1.5 : 1 }]}>
              {/* Header do widget */}
              <View style={styles.hojeWidgetHeader}>
                <View style={styles.hojeWidgetDateRow}>
                  <View style={[styles.hojeDotIndicador, { backgroundColor: totaisHoje ? colors.primary : colors.mutedForeground }]} />
                  <Text style={[styles.hojeWidgetDateText, { color: colors.mutedForeground }]}>
                    {diaSemana}, {diaNum} de {mesNomeHoje}
                  </Text>
                </View>
                <Pressable
                  onPress={handleHoje}
                  style={({ pressed }) => [
                    styles.hojeAddBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <Feather name="plus" size={14} color="#fff" />
                  <Text style={styles.hojeAddBtnText}>Lançar</Text>
                </Pressable>
              </View>

              {totaisHoje ? (
                <>
                  {/* Totais principais */}
                  <View style={styles.hojeValoresRow}>
                    <View style={styles.hojeValorMain}>
                      <Text style={[styles.hojeValorPrincipal, { color: colors.foreground }]}>
                        {formatMoeda(totaisHoje.valor)}
                      </Text>
                      <Text style={[styles.hojeValorSub, { color: colors.mutedForeground }]}>
                        {totaisHoje.pares} pares · {totaisHoje.qtd} {totaisHoje.qtd === 1 ? "venda" : "vendas"}
                        {totaisHoje.margem > 0 ? ` · ${totaisHoje.margem.toFixed(1)}% mg` : ""}
                      </Text>
                    </View>
                    {atingiuMeta && (
                      <View style={[styles.hojeMiniCheck, { backgroundColor: colors.primary + "18" }]}>
                        <Feather name="check" size={14} color={colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Barra de progresso vs meta diária */}
                  <View style={styles.hojeProgressArea}>
                    <View style={[styles.hojeProgressTrack, { backgroundColor: colors.muted }]}>
                      <View
                        style={[
                          styles.hojeProgressFill,
                          {
                            width: `${pctMeta}%` as any,
                            backgroundColor: atingiuMeta ? "#10B981" : colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.hojeProgressLabel, { color: colors.mutedForeground }]}>
                      {atingiuMeta
                        ? `✓ Meta diária atingida (${formatMoeda(metaDiaria)})`
                        : `${pctMeta.toFixed(0)}% da meta diária · falta ${formatMoeda(metaDiaria - totaisHoje.valor)}`}
                    </Text>
                  </View>

                  {/* Último lançamento */}
                  {ultimaVenda && (
                    <View style={[styles.hojeUltima, { borderTopColor: colors.border }]}>
                      <Feather name="clock" size={12} color={colors.mutedForeground} />
                      <Text style={[styles.hojeUltimaText, { color: colors.mutedForeground }]} numberOfLines={1}>
                        Último: {formatMoeda(ultimaVenda.valor)}
                        {ultimaVenda.descricao ? ` · ${ultimaVenda.descricao}` : ""}
                        {" · "}{new Date(ultimaVenda.hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                /* Estado vazio */
                <Pressable onPress={handleHoje} style={styles.hojeEmpty}>
                  <View style={[styles.hojeEmptyIcon, { backgroundColor: colors.muted }]}>
                    <Feather name="shopping-bag" size={22} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.hojeEmptyTitle, { color: colors.foreground }]}>
                    Nenhuma venda lançada hoje
                  </Text>
                  <Text style={[styles.hojeEmptySub, { color: colors.mutedForeground }]}>
                    Meta diária: {formatMoeda(metaDiaria)} (Cota A)
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })()}

        {/* Metas */}
        <View style={[styles.metasCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metasTitle, { color: colors.foreground }]}>Metas do Mês</Text>
          <ProgressBar
            label="Cota A" valor={total.valor} meta={config.cotaA.valor}
            pares={total.pares} metaPares={config.cotaA.pares}
            metaMargem={config.cotaA.margem ?? 0} margemAtual={total.margem}
            cor="#10B981" colors={colors}
          />
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <ProgressBar
            label="Cota B" valor={total.valor} meta={config.cotaB.valor}
            pares={total.pares} metaPares={config.cotaB.pares}
            metaMargem={config.cotaB.margem ?? 0} margemAtual={total.margem}
            cor="#3B82F6" colors={colors}
          />
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <ProgressBar
            label="Cota C" valor={total.valor} meta={config.cotaC.valor}
            pares={total.pares} metaPares={config.cotaC.pares}
            metaMargem={config.cotaC.margem ?? 0} margemAtual={total.margem}
            cor="#8B5CF6" colors={colors}
          />
          <View style={[styles.metaDivider, { backgroundColor: colors.border }]} />
          <ProgressBar
            label="Cota Alta" valor={total.valor} meta={config.cotaAlta.valor}
            pares={total.pares} metaPares={config.cotaAlta.pares}
            metaMargem={config.cotaAlta.margem ?? 0} margemAtual={total.margem}
            cor="#F59E0B" colors={colors}
          />
        </View>

        {/* Exportar relatório */}
        <Pressable
          onPress={handleExportar}
          disabled={exporting}
          style={({ pressed }) => [
            styles.exportBtn,
            { backgroundColor: colors.primary, opacity: pressed || exporting ? 0.75 : 1 },
          ]}
        >
          {exporting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Feather name="share" size={15} color="#fff" />
          )}
          <Text style={styles.exportBtnText}>
            {exporting ? "Gerando relatório..." : "Exportar relatório do mês"}
          </Text>
        </Pressable>

        {/* Histórico de metas */}
        <Pressable
          onPress={() => router.push("/historico-metas")}
          style={({ pressed }) => [
            styles.configBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="award" size={15} color={colors.mutedForeground} />
          <Text style={[styles.configBtnText, { color: colors.mutedForeground }]}>
            Histórico de metas
          </Text>
        </Pressable>

        {/* Configurar metas */}
        <Pressable
          onPress={() => router.push(`/metas/${mesId}`)}
          style={({ pressed }) => [
            styles.configBtn,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
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
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  logoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", paddingHorizontal: 8 },
  logo: { height: 36, width: 120 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  perfilChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 5,
    maxWidth: 140,
  },
  perfilChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold", flexShrink: 1 },
  bellBtn: { padding: 6 },
  mesNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  navArrow: { padding: 10 },
  headerCenter: { alignItems: "center" },
  headerMes: { fontSize: 20, fontFamily: "Inter_700Bold" },
  headerAno: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 1 },
  scroll: { padding: 16, gap: 14 },
  totalCard: { borderRadius: 16, padding: 20 },
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
  hojeWidget: { borderRadius: 16, overflow: "hidden" },
  hojeWidgetHeader: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  hojeWidgetDateRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  hojeDotIndicador: { width: 7, height: 7, borderRadius: 4 },
  hojeWidgetDateText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  hojeAddBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  hojeAddBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#fff" },
  hojeValoresRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 8,
  },
  hojeValorMain: { gap: 2 },
  hojeValorPrincipal: { fontSize: 28, fontFamily: "Inter_700Bold" },
  hojeValorSub: { fontSize: 13, fontFamily: "Inter_400Regular" },
  hojeMiniCheck: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  hojeProgressArea: { paddingHorizontal: 16, paddingBottom: 12, gap: 5 },
  hojeProgressTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  hojeProgressFill: { height: 5, borderRadius: 3 },
  hojeProgressLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  hojeUltima: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  hojeUltimaText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  hojeEmpty: { alignItems: "center", paddingVertical: 20, gap: 8 },
  hojeEmptyIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  hojeEmptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  hojeEmptySub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  metasCard: { borderRadius: 14, borderWidth: 1, padding: 18, gap: 14 },
  metasTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  cotaRow: { gap: 6 },
  cotaHeader: { gap: 2 },
  cotaLabelRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  cotaDot: { width: 8, height: 8, borderRadius: 4 },
  cotaLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  badgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  cotaValores: { fontSize: 12, fontFamily: "Inter_400Regular", paddingLeft: 16 },
  progressTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  cotaFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  cotaFooterRight: { alignItems: "flex-end", gap: 2 },
  cotaPct: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cotaMargem: { fontSize: 11, fontFamily: "Inter_500Medium" },
  cotaFalta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  metaDivider: { height: StyleSheet.hairlineWidth },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
  },
  exportBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
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
