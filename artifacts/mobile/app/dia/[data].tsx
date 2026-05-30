import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVendas, type VendaItem } from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

const DIAS_PT = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function formatData(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_PT[dt.getDay()]}, ${d} de ${MESES_PT[m - 1]}`;
}

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatMoeda(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseValorDigits(digits: string): number {
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

function digitsToDisplay(digits: string): string {
  if (!digits) return "";
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ─── Item de venda na lista ───────────────────────────────────────────────────
function VendaItemCard({
  item,
  onRemove,
  colors,
}: {
  item: VendaItem;
  onRemove: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[
        styles.itemCard,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <View style={styles.itemLeft}>
        <View style={[styles.itemDot, { backgroundColor: colors.primary }]} />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemValor, { color: colors.foreground }]}>
            {formatMoeda(item.valor)}
          </Text>
          <View style={styles.itemMeta}>
            {item.pares > 0 && (
              <Text style={[styles.itemTag, { color: colors.mutedForeground }]}>
                {item.pares} {item.pares === 1 ? "par" : "pares"}
              </Text>
            )}
            {item.descricao ? (
              <Text
                style={[styles.itemDescricao, { color: colors.mutedForeground }]}
                numberOfLines={1}
              >
                · {item.descricao}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.itemHora, { color: colors.mutedForeground }]}>
            {formatHora(item.hora)}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={onRemove}
        hitSlop={12}
        style={({ pressed }) => [styles.removeBtn, { opacity: pressed ? 0.5 : 1 }]}
      >
        <Feather name="trash-2" size={16} color={colors.destructive} />
      </Pressable>
    </View>
  );
}

// ─── Formulário de nova venda ─────────────────────────────────────────────────
function AddVendaForm({
  onSave,
  onCancel,
  colors,
}: {
  onSave: (valor: number, pares: number, descricao: string) => void;
  onCancel: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [valorDigits, setValorDigits] = useState("");
  const [pares, setPares] = useState("");
  const [descricao, setDescricao] = useState("");
  const [focusValor, setFocusValor] = useState(true);

  const paresRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);

  const handleValorChange = (text: string) => {
    setValorDigits(text.replace(/\D/g, ""));
  };

  const valor = parseValorDigits(valorDigits);
  const paresNum = parseInt(pares) || 0;
  const canSave = valor > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave(valor, paresNum, descricao.trim());
  };

  return (
    <View
      style={[
        styles.addForm,
        { backgroundColor: colors.card, borderColor: colors.primary },
      ]}
    >
      <Text style={[styles.addFormTitle, { color: colors.foreground }]}>
        Nova Venda
      </Text>

      <View style={styles.addFormRow}>
        {/* Valor */}
        <View style={styles.addFormFieldMain}>
          <Text style={[styles.addLabel, { color: colors.mutedForeground }]}>Valor R$</Text>
          <View
            style={[
              styles.addInputWrap,
              {
                borderColor: focusValor ? colors.primary : colors.border,
                borderWidth: focusValor ? 1.5 : 1,
                backgroundColor: colors.background,
              },
            ]}
          >
            <Text style={[styles.addPrefix, { color: colors.mutedForeground }]}>R$</Text>
            <TextInput
              style={[styles.addInput, styles.addInputLarge, { color: colors.foreground }]}
              value={digitsToDisplay(valorDigits)}
              onChangeText={handleValorChange}
              placeholder="0,00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => paresRef.current?.focus()}
              onFocus={() => setFocusValor(true)}
              onBlur={() => setFocusValor(false)}
              autoFocus
            />
          </View>
        </View>

        {/* Pares */}
        <View style={styles.addFormFieldSmall}>
          <Text style={[styles.addLabel, { color: colors.mutedForeground }]}>Pares</Text>
          <View
            style={[
              styles.addInputWrap,
              { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background },
            ]}
          >
            <TextInput
              ref={paresRef}
              style={[styles.addInput, { color: colors.foreground }]}
              value={pares}
              onChangeText={(t) => setPares(t.replace(/\D/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => descRef.current?.focus()}
            />
          </View>
        </View>
      </View>

      {/* Descrição */}
      <View>
        <Text style={[styles.addLabel, { color: colors.mutedForeground }]}>
          Descrição <Text style={{ fontFamily: "Inter_400Regular" }}>(opcional)</Text>
        </Text>
        <View
          style={[
            styles.addInputWrap,
            { borderColor: colors.border, borderWidth: 1, backgroundColor: colors.background },
          ]}
        >
          <TextInput
            ref={descRef}
            style={[styles.addInput, { color: colors.foreground }]}
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex: sapato social, tênis..."
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />
        </View>
      </View>

      {/* Botões */}
      <View style={styles.addFormBtns}>
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [
            styles.addCancelBtn,
            { borderColor: colors.border, backgroundColor: colors.background, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={[styles.addCancelText, { color: colors.mutedForeground }]}>Cancelar</Text>
        </Pressable>
        <Pressable
          onPress={handleSave}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.addSaveBtn,
            {
              backgroundColor: canSave ? colors.primary : colors.muted,
              opacity: pressed ? 0.8 : 1,
              flex: 1,
            },
          ]}
        >
          <Feather name="plus" size={16} color={canSave ? "#fff" : colors.mutedForeground} />
          <Text style={[styles.addSaveText, { color: canSave ? "#fff" : colors.mutedForeground }]}>
            Adicionar
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Tela principal ───────────────────────────────────────────────────────────
export default function DiaScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getDia, getDiaTotais, adicionarItem, removerItem, salvarMargemDia, removerDia } = useVendas();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [margemText, setMargemText] = useState("");
  const [margemFocus, setMargemFocus] = useState(false);
  const [saving, setSaving] = useState(false);

  const dia = data ? getDia(data) : null;
  const totais = data ? getDiaTotais(data) : null;
  const itens = dia?.itens ?? [];
  const margemAtual = dia?.margem ?? 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleAdicionarVenda = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMostrarForm(true);
  }, []);

  const handleSalvarItem = useCallback(
    async (valor: number, pares: number, descricao: string) => {
      if (!data) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaving(true);
      try {
        await adicionarItem(data, { valor, pares, descricao });
        setMostrarForm(false);
        Keyboard.dismiss();
      } finally {
        setSaving(false);
      }
    },
    [data, adicionarItem]
  );

  const handleRemoverItem = useCallback(
    (itemId: string) => {
      Alert.alert("Remover venda", "Deseja remover este lançamento?", [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            if (!data) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await removerItem(data, itemId);
          },
        },
      ]);
    },
    [data, removerItem]
  );

  const handleSalvarMargem = useCallback(async () => {
    if (!data) return;
    const m = parseFloat(margemText.replace(",", ".")) || 0;
    await salvarMargemDia(data, m);
    setMargemFocus(false);
    Keyboard.dismiss();
  }, [data, margemText, salvarMargemDia]);

  const handleLimparDia = useCallback(() => {
    if (!data || itens.length === 0) return;
    Alert.alert(
      "Limpar dia",
      "Remover todas as vendas deste dia?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Limpar",
          style: "destructive",
          onPress: async () => {
            await removerDia(data);
            router.back();
          },
        },
      ]
    );
  }, [data, itens.length, removerDia]);

  const ticketMedio =
    totais && totais.qtd > 0 ? totais.valor / totais.qtd : 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* NavBar */}
      <View
        style={[
          styles.navBar,
          {
            paddingTop: topPad + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.navCenter}>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>
            {data ? formatData(data) : "Dia"}
          </Text>
          <Text style={[styles.navSub, { color: colors.mutedForeground }]}>
            {itens.length === 0
              ? "Nenhuma venda"
              : `${itens.length} ${itens.length === 1 ? "venda" : "vendas"}`}
          </Text>
        </View>
        <Pressable
          onPress={handleLimparDia}
          style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
          disabled={itens.length === 0}
        >
          <Feather
            name="trash-2"
            size={18}
            color={itens.length > 0 ? colors.destructive : colors.border}
          />
        </Pressable>
      </View>

      {/* Total do dia */}
      <View style={[styles.totalCard, { backgroundColor: colors.primary }]}>
        <View style={styles.totalMain}>
          <Text style={[styles.totalLabel, { color: "rgba(255,255,255,0.75)" }]}>
            TOTAL DO DIA
          </Text>
          <Text style={[styles.totalValor, { color: "#fff" }]}>
            {formatMoeda(totais?.valor ?? 0)}
          </Text>
        </View>
        <View style={styles.totalStats}>
          <View style={styles.totalStat}>
            <Text style={[styles.totalStatVal, { color: "#fff" }]}>
              {totais?.pares ?? 0}
            </Text>
            <Text style={[styles.totalStatLabel, { color: "rgba(255,255,255,0.7)" }]}>
              Pares
            </Text>
          </View>
          {totais && totais.qtd > 0 && (
            <>
              <View style={[styles.totalStatDiv, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
              <View style={styles.totalStat}>
                <Text style={[styles.totalStatVal, { color: "#fff" }]}>
                  {formatMoeda(ticketMedio)}
                </Text>
                <Text style={[styles.totalStatLabel, { color: "rgba(255,255,255,0.7)" }]}>
                  Ticket médio
                </Text>
              </View>
            </>
          )}
          <View style={[styles.totalStatDiv, { backgroundColor: "rgba(255,255,255,0.3)" }]} />
          {/* Margem inline */}
          <View style={styles.totalStat}>
            <View style={styles.margemInputRow}>
              <TextInput
                style={[styles.margemInput, { color: margemFocus ? "#fff" : (margemAtual > 0 ? "#fff" : "rgba(255,255,255,0.5)") }]}
                value={margemFocus ? margemText : (margemAtual > 0 ? String(margemAtual) : "")}
                onChangeText={setMargemText}
                onFocus={() => {
                  setMargemText(margemAtual > 0 ? String(margemAtual) : "");
                  setMargemFocus(true);
                }}
                onBlur={handleSalvarMargem}
                placeholder="—"
                placeholderTextColor="rgba(255,255,255,0.4)"
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleSalvarMargem}
                selectTextOnFocus
              />
              <Text style={[styles.margemSuffix, { color: "rgba(255,255,255,0.75)" }]}>%</Text>
            </View>
            <Text style={[styles.totalStatLabel, { color: "rgba(255,255,255,0.7)" }]}>
              Margem
            </Text>
          </View>
        </View>
      </View>

      {/* Lista de vendas */}
      <FlatList
        data={itens}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: bottomPad + (mostrarForm ? 8 : 80) },
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          mostrarForm ? null : (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.accent }]}>
                <Feather name="shopping-bag" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Nenhuma venda lançada
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Toque em "+ Nova Venda" para registrar
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          itens.length > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
              VENDAS DO DIA
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <VendaItemCard
            item={item}
            onRemove={() => handleRemoverItem(item.id)}
            colors={colors}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        ListFooterComponent={
          mostrarForm ? (
            <AddVendaForm
              onSave={handleSalvarItem}
              onCancel={() => { setMostrarForm(false); Keyboard.dismiss(); }}
              colors={colors}
            />
          ) : null
        }
      />

      {/* Botão "+ Nova Venda" */}
      {!mostrarForm && (
        <View
          style={[
            styles.addBar,
            {
              paddingBottom: bottomPad + 8,
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <Pressable
            onPress={handleAdicionarVenda}
            style={({ pressed }) => [
              styles.addBarBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            <Feather name="plus" size={20} color="#fff" />
            <Text style={styles.addBarBtnText}>Nova Venda</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
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
  navBtn: { padding: 6, width: 40 },
  navCenter: { alignItems: "center", flex: 1 },
  navTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textTransform: "capitalize" },
  navSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  totalCard: {
    margin: 14,
    marginTop: 12,
    borderRadius: 16,
    padding: 18,
    paddingBottom: 16,
  },
  totalMain: { marginBottom: 14 },
  totalLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5, marginBottom: 4 },
  totalValor: { fontSize: 36, fontFamily: "Inter_700Bold" },
  totalStats: { flexDirection: "row", alignItems: "center" },
  totalStat: { flex: 1, alignItems: "center" },
  totalStatVal: { fontSize: 15, fontFamily: "Inter_700Bold" },
  totalStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular", marginTop: 3 },
  totalStatDiv: { width: 1, height: 30, marginHorizontal: 4 },
  margemInputRow: { flexDirection: "row", alignItems: "center" },
  margemInput: { fontSize: 15, fontFamily: "Inter_700Bold", minWidth: 32, textAlign: "right" },
  margemSuffix: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginLeft: 1 },
  listContent: { paddingHorizontal: 14, paddingTop: 4 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 10,
    marginTop: 4,
  },
  itemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  itemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  itemDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  itemInfo: { flex: 1 },
  itemValor: { fontSize: 17, fontFamily: "Inter_700Bold" },
  itemMeta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", marginTop: 3 },
  itemTag: { fontSize: 13, fontFamily: "Inter_500Medium" },
  itemDescricao: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },
  itemHora: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4 },
  removeBtn: { paddingLeft: 12 },
  emptyState: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", marginBottom: 6 },
  emptySubtitle: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  addBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  addBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
  },
  addBarBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  // AddVendaForm
  addForm: {
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  addFormTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  addFormRow: { flexDirection: "row", gap: 10 },
  addFormFieldMain: { flex: 1.6, gap: 4 },
  addFormFieldSmall: { flex: 1, gap: 4 },
  addLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },
  addInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  addPrefix: { fontSize: 15, fontFamily: "Inter_500Medium", marginRight: 4 },
  addInput: { flex: 1, fontSize: 16, fontFamily: "Inter_500Medium", paddingVertical: 12 },
  addInputLarge: { fontSize: 20, fontFamily: "Inter_700Bold" },
  addFormBtns: { flexDirection: "row", gap: 10 },
  addCancelBtn: {
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  addCancelText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  addSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  addSaveText: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
