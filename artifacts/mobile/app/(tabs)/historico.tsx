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
  diasNoMes,
  getMesId,
  getHojeStr,
  nomeMes,
  primeiroDiaSemana,
  useVendas,
} from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

const DIAS_SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];

function formatMoeda(v: number) {
  if (v >= 1000)
    return `R$${(v / 1000).toFixed(1).replace(".", ",")}k`;
  return `R$${v.toLocaleString("pt-BR")}`;
}

interface CelulaDiaProps {
  dia: number;
  data: string;
  isHoje: boolean;
  isHojeMes: boolean;
  temDado: boolean;
  valor: number;
  pares: number;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}

function CelulaDia({ dia, isHoje, temDado, valor, pares, onPress, colors }: CelulaDiaProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.celula,
        {
          backgroundColor: isHoje
            ? colors.primary
            : temDado
            ? colors.accent
            : colors.card,
          borderColor: isHoje
            ? colors.primary
            : temDado
            ? colors.secondary
            : colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.celulaDia,
          {
            color: isHoje
              ? "#fff"
              : temDado
              ? colors.primaryForeground === "#FFFFFF" ? colors.primary : colors.foreground
              : colors.mutedForeground,
            fontFamily: isHoje ? "Inter_700Bold" : "Inter_500Medium",
          },
        ]}
      >
        {dia}
      </Text>
      {temDado && (
        <Text
          style={[
            styles.celulaValor,
            { color: isHoje ? "rgba(255,255,255,0.85)" : colors.primary },
          ]}
          numberOfLines={1}
        >
          {formatMoeda(valor)}
        </Text>
      )}
      {temDado && pares > 0 && (
        <Text
          style={[
            styles.celulaPares,
            { color: isHoje ? "rgba(255,255,255,0.7)" : colors.mutedForeground },
          ]}
        >
          {pares}p
        </Text>
      )}
    </Pressable>
  );
}

export default function CalendarioScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getDia, getTotalMes } = useVendas();

  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);

  const mesId = getMesId(ano, mes);
  const totalDias = diasNoMes(ano, mes);
  const primeiroSemana = primeiroDiaSemana(ano, mes);
  const hoje = getHojeStr();
  const total = getTotalMes(mesId);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const handlePrev = useCallback(() => {
    Haptics.selectionAsync();
    if (mes === 1) { setMes(12); setAno((a) => a - 1); }
    else setMes((m) => m - 1);
  }, [mes]);

  const handleNext = useCallback(() => {
    Haptics.selectionAsync();
    if (mes === 12) { setMes(1); setAno((a) => a + 1); }
    else setMes((m) => m + 1);
  }, [mes]);

  const handleDia = useCallback(
    (d: number) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const data = `${ano}-${String(mes).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      router.push(`/dia/${data}`);
    },
    [ano, mes]
  );

  // Build grid cells (blanks + days)
  const cells: Array<{ dia: number | null }> = [];
  for (let i = 0; i < primeiroSemana; i++) cells.push({ dia: null });
  for (let d = 1; d <= totalDias; d++) cells.push({ dia: d });
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push({ dia: null });

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
          onPress={handlePrev}
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
          onPress={handleNext}
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
        {/* Resumo rápido */}
        {total.dias > 0 && (
          <View
            style={[
              styles.resumoStrip,
              { backgroundColor: colors.accent, borderColor: colors.secondary },
            ]}
          >
            <View style={styles.resumoItem}>
              <Text style={[styles.resumoVal, { color: colors.primary }]}>
                {total.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Text>
              <Text style={[styles.resumoLabel, { color: colors.mutedForeground }]}>
                Venda Mensal
              </Text>
            </View>
            <View style={[styles.resumoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.resumoItem}>
              <Text style={[styles.resumoVal, { color: colors.primary }]}>
                {total.pares}
              </Text>
              <Text style={[styles.resumoLabel, { color: colors.mutedForeground }]}>
                Pares
              </Text>
            </View>
            <View style={[styles.resumoDivider, { backgroundColor: colors.border }]} />
            <View style={styles.resumoItem}>
              <Text style={[styles.resumoVal, { color: colors.primary }]}>
                {total.dias}
              </Text>
              <Text style={[styles.resumoLabel, { color: colors.mutedForeground }]}>
                Dias
              </Text>
            </View>
          </View>
        )}

        {/* Cabeçalho dias da semana */}
        <View style={[styles.semanaRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {DIAS_SEMANA.map((d, i) => (
            <View key={i} style={styles.semanaCell}>
              <Text style={[styles.semanaLabel, { color: colors.mutedForeground }]}>
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Grade do calendário */}
        <View
          style={[
            styles.grade,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, row) => (
            <View key={row} style={styles.gradeRow}>
              {cells.slice(row * 7, row * 7 + 7).map((cell, col) => {
                if (cell.dia === null) {
                  return <View key={col} style={styles.celulaVazia} />;
                }
                const data = `${ano}-${String(mes).padStart(2, "0")}-${String(cell.dia).padStart(2, "0")}`;
                const diaData = getDia(data);
                const isHoje = data === hoje;
                return (
                  <CelulaDia
                    key={col}
                    dia={cell.dia}
                    data={data}
                    isHoje={isHoje}
                    isHojeMes={ano === now.getFullYear() && mes === now.getMonth() + 1}
                    temDado={!!diaData}
                    valor={diaData?.valor ?? 0}
                    pares={diaData?.pares ?? 0}
                    onPress={() => handleDia(cell.dia!)}
                    colors={colors}
                  />
                );
              })}
            </View>
          ))}
        </View>

        <View style={styles.legendaRow}>
          <View style={[styles.legendaDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.legendaText, { color: colors.mutedForeground }]}>
            Hoje
          </Text>
          <View style={[styles.legendaDot, { backgroundColor: colors.accent, borderWidth: 1, borderColor: colors.secondary }]} />
          <Text style={[styles.legendaText, { color: colors.mutedForeground }]}>
            Com lançamento
          </Text>
        </View>
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
  scroll: { padding: 12, gap: 10 },
  resumoStrip: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    justifyContent: "space-around",
  },
  resumoItem: { alignItems: "center", flex: 1 },
  resumoVal: { fontSize: 16, fontFamily: "Inter_700Bold" },
  resumoLabel: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  resumoDivider: { width: 1, height: 32 },
  semanaRow: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 8,
  },
  semanaCell: { flex: 1, alignItems: "center" },
  semanaLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  grade: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    padding: 4,
    gap: 4,
  },
  gradeRow: {
    flexDirection: "row",
    gap: 4,
  },
  celula: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
    minHeight: 52,
  },
  celulaDia: { fontSize: 13 },
  celulaValor: { fontSize: 9, fontFamily: "Inter_600SemiBold", marginTop: 1 },
  celulaPares: { fontSize: 9, fontFamily: "Inter_400Regular" },
  celulaVazia: {
    flex: 1,
    aspectRatio: 0.9,
    minHeight: 52,
  },
  legendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 4,
  },
  legendaDot: { width: 10, height: 10, borderRadius: 5 },
  legendaText: { fontSize: 12, fontFamily: "Inter_400Regular", marginRight: 8 },
});
