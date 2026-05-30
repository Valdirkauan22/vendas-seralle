import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useCallback } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getHoje, useVendas, type Venda } from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

function formatMoeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatHora(createdAt: string): string {
  const d = new Date(createdAt);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function VendaItem({ venda, onPress }: { venda: Venda; onPress: () => void }) {
  const colors = useColors();
  const total = venda.valor * venda.quantidade;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.vendaItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.75 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      <View style={styles.vendaLeft}>
        <View style={[styles.vendaDot, { backgroundColor: colors.primary }]} />
        <View style={styles.vendaInfo}>
          <Text
            style={[styles.vendaProduto, { color: colors.foreground }]}
            numberOfLines={1}
          >
            {venda.produto}
          </Text>
          {venda.cliente ? (
            <Text
              style={[styles.vendaCliente, { color: colors.mutedForeground }]}
              numberOfLines={1}
            >
              {venda.cliente}
            </Text>
          ) : null}
          <Text style={[styles.vendaHora, { color: colors.mutedForeground }]}>
            {formatHora(venda.createdAt)}
            {venda.quantidade > 1 ? `  ·  ${venda.quantidade}x` : ""}
          </Text>
        </View>
      </View>
      <View style={styles.vendaRight}>
        <Text style={[styles.vendaValor, { color: colors.primary }]}>
          {formatMoeda(total)}
        </Text>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </Pressable>
  );
}

function EmptyState({ colors }: { colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.emptyContainer}>
      <View
        style={[styles.emptyIcon, { backgroundColor: colors.accent }]}
      >
        <Feather name="shopping-bag" size={32} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
        Nenhuma venda hoje
      </Text>
      <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
        Toque no botão + para registrar sua primeira venda do dia
      </Text>
    </View>
  );
}

export default function HojeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vendasDeHoje, totalPorData, loading } = useVendas();

  const hoje = getHoje();
  const vendasHoje = vendasDeHoje();
  const totalHoje = totalPorData(hoje);
  const ticketMedio =
    vendasHoje.length > 0 ? totalHoje / vendasHoje.length : 0;

  const handleNovaVenda = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/venda/nova");
  }, []);

  const handleVenda = useCallback((id: string) => {
    Haptics.selectionAsync();
    router.push(`/venda/${id}`);
  }, []);

  const topPadding =
    Platform.OS === "web" ? 67 : insets.top;
  const bottomPadding =
    Platform.OS === "web" ? 34 + 84 : insets.bottom + 80;

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
        <View>
          <Text style={[styles.headerLabel, { color: colors.mutedForeground }]}>
            Hoje
          </Text>
          <Text style={[styles.headerDate, { color: colors.foreground }]}>
            {new Date().toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.resumoContainer,
          { backgroundColor: colors.primary },
        ]}
      >
        <View style={styles.resumoMain}>
          <Text style={[styles.resumoLabel, { color: "rgba(255,255,255,0.75)" }]}>
            Total do dia
          </Text>
          <Text style={[styles.resumoValor, { color: "#FFFFFF" }]}>
            {formatMoeda(totalHoje)}
          </Text>
        </View>
        <View style={styles.resumoStats}>
          <View style={styles.resumoStat}>
            <Text style={[styles.resumoStatVal, { color: "#FFFFFF" }]}>
              {vendasHoje.length}
            </Text>
            <Text
              style={[
                styles.resumoStatLabel,
                { color: "rgba(255,255,255,0.75)" },
              ]}
            >
              {vendasHoje.length === 1 ? "Venda" : "Vendas"}
            </Text>
          </View>
          <View
            style={[
              styles.resumoSeparator,
              { backgroundColor: "rgba(255,255,255,0.3)" },
            ]}
          />
          <View style={styles.resumoStat}>
            <Text style={[styles.resumoStatVal, { color: "#FFFFFF" }]}>
              {formatMoeda(ticketMedio)}
            </Text>
            <Text
              style={[
                styles.resumoStatLabel,
                { color: "rgba(255,255,255,0.75)" },
              ]}
            >
              Ticket médio
            </Text>
          </View>
        </View>
      </View>

      <FlatList
        data={vendasHoje}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPadding },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={vendasHoje.length > 0}
        refreshControl={
          <RefreshControl refreshing={loading} tintColor={colors.primary} />
        }
        ListEmptyComponent={<EmptyState colors={colors} />}
        ListHeaderComponent={
          vendasHoje.length > 0 ? (
            <Text
              style={[styles.sectionTitle, { color: colors.mutedForeground }]}
            >
              VENDAS REGISTRADAS
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <VendaItem venda={item} onPress={() => handleVenda(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <Pressable
        onPress={handleNovaVenda}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: colors.primary,
            bottom: bottomPadding - 40,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <Feather name="plus" size={26} color="#FFFFFF" />
      </Pressable>
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
  headerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  headerDate: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    textTransform: "capitalize",
  },
  resumoContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    paddingBottom: 18,
  },
  resumoMain: { marginBottom: 16 },
  resumoLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  resumoValor: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
  },
  resumoStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  resumoStat: { flex: 1, alignItems: "center" },
  resumoStatVal: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  resumoStatLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  resumoSeparator: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  listContent: { padding: 16, paddingTop: 8 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 8,
  },
  vendaItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  vendaLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  vendaDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  vendaInfo: { flex: 1 },
  vendaProduto: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  vendaCliente: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  vendaHora: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 3,
  },
  vendaRight: { flexDirection: "row", alignItems: "center", gap: 6 },
  vendaValor: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  separator: { height: 8 },
  emptyContainer: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
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
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
});
