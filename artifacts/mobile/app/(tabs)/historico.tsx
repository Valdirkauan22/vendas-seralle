import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVendas, type Venda } from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDataLabel(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);

  const isHoje =
    dt.getDate() === hoje.getDate() &&
    dt.getMonth() === hoje.getMonth() &&
    dt.getFullYear() === hoje.getFullYear();
  const isOntem =
    dt.getDate() === ontem.getDate() &&
    dt.getMonth() === ontem.getMonth() &&
    dt.getFullYear() === ontem.getFullYear();

  if (isHoje) return "Hoje";
  if (isOntem) return "Ontem";

  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

interface DiaGroup {
  data: string;
  vendas: Venda[];
  total: number;
}

function VendaMiniItem({
  venda,
  onPress,
  colors,
}: {
  venda: Venda;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const total = venda.valor * venda.quantidade;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.miniItem,
        {
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={styles.miniItemLeft}>
        <Text
          style={[styles.miniProduto, { color: colors.foreground }]}
          numberOfLines={1}
        >
          {venda.produto}
        </Text>
        {venda.cliente ? (
          <Text
            style={[styles.miniCliente, { color: colors.mutedForeground }]}
            numberOfLines={1}
          >
            {venda.cliente}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.miniValor, { color: colors.primary }]}>
        {formatMoeda(total)}
      </Text>
    </Pressable>
  );
}

function DiaCard({
  group,
  colors,
}: {
  group: DiaGroup;
  colors: ReturnType<typeof useColors>;
}) {
  const handleVenda = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push(`/venda/${id}`);
  }, []);

  return (
    <View
      style={[
        styles.diaCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.diaHeader}>
        <View style={styles.diaHeaderLeft}>
          <Text
            style={[styles.diaLabel, { color: colors.foreground }]}
          >
            {formatDataLabel(group.data)}
          </Text>
          <Text style={[styles.diaCount, { color: colors.mutedForeground }]}>
            {group.vendas.length} {group.vendas.length === 1 ? "venda" : "vendas"}
          </Text>
        </View>
        <Text style={[styles.diaTotal, { color: colors.primary }]}>
          {formatMoeda(group.total)}
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {group.vendas.map((v, i) => (
        <React.Fragment key={v.id}>
          <VendaMiniItem
            venda={v}
            onPress={() => handleVenda(v.id)}
            colors={colors}
          />
          {i < group.vendas.length - 1 && (
            <View
              style={[
                styles.miniDivider,
                { backgroundColor: colors.border },
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

export default function HistoricoScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vendas } = useVendas();

  const topPadding = Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding = Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

  const groups = useMemo<DiaGroup[]>(() => {
    const map = new Map<string, Venda[]>();
    for (const v of vendas) {
      if (!map.has(v.data)) map.set(v.data, []);
      map.get(v.data)!.push(v);
    }
    const result: DiaGroup[] = [];
    for (const [data, vs] of map) {
      const sortedVs = [...vs].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const total = vs.reduce((acc, v) => acc + v.valor * v.quantidade, 0);
      result.push({ data, vendas: sortedVs, total });
    }
    return result.sort((a, b) => b.data.localeCompare(a.data));
  }, [vendas]);

  const totalGeral = useMemo(
    () => groups.reduce((acc, g) => acc + g.total, 0),
    [groups]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: topPadding + 16,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>
          Histórico
        </Text>
        {groups.length > 0 && (
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
            {groups.length} {groups.length === 1 ? "dia" : "dias"} · {formatMoeda(totalGeral)} total
          </Text>
        )}
      </View>

      <FlatList
        data={groups}
        keyExtractor={(item) => item.data}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View
              style={[styles.emptyIcon, { backgroundColor: colors.accent }]}
            >
              <Feather name="bar-chart-2" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
              Nenhum histórico ainda
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.mutedForeground }]}
            >
              Suas vendas aparecerão aqui organizadas por dia
            </Text>
          </View>
        }
        renderItem={({ item }) => <DiaCard group={item} colors={colors} />}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  listContent: { padding: 16, paddingTop: 12 },
  diaCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  diaHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  diaHeaderLeft: { flex: 1 },
  diaLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
  },
  diaCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  diaTotal: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  miniItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  miniItemLeft: { flex: 1, marginRight: 8 },
  miniProduto: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  miniCliente: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  miniValor: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  miniDivider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 64,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
