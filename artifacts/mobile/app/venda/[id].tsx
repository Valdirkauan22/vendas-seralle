import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useVendas } from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

function formatValorDisplay(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseValor(display: string): number {
  const clean = display.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function formatData(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  colors: ReturnType<typeof useColors>;
  prefix?: string;
  optional?: boolean;
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  returnKeyType = "next",
  onSubmitEditing,
  inputRef,
  colors,
  prefix,
  optional,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldContainer}>
      <View style={styles.fieldLabelRow}>
        <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        {optional && (
          <Text style={[styles.optionalTag, { color: colors.mutedForeground }]}>
            opcional
          </Text>
        )}
      </View>
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.border,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {prefix ? (
          <Text style={[styles.inputPrefix, { color: colors.mutedForeground }]}>
            {prefix}
          </Text>
        ) : null}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            { color: colors.foreground },
            multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.mutedForeground}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          blurOnSubmit={!!onSubmitEditing}
        />
      </View>
    </View>
  );
}

export default function VendaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { vendas, atualizarVenda, removerVenda } = useVendas();

  const venda = vendas.find((v) => v.id === id);

  const [produto, setProduto] = useState(venda?.produto ?? "");
  const [cliente, setCliente] = useState(venda?.cliente ?? "");
  const [valorDisplay, setValorDisplay] = useState(
    venda ? formatValorDisplay(venda.valor) : ""
  );
  const [quantidade, setQuantidade] = useState(
    venda ? String(venda.quantidade) : "1"
  );
  const [observacoes, setObservacoes] = useState(venda?.observacoes ?? "");
  const [saving, setSaving] = useState(false);

  const clienteRef = useRef<TextInput>(null);
  const qtdRef = useRef<TextInput>(null);
  const obsRef = useRef<TextInput>(null);

  const valor = parseValor(valorDisplay);
  const qtd = Math.max(1, parseInt(quantidade) || 1);
  const total = valor * qtd;

  const handleValorChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) { setValorDisplay(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValorDisplay(
      num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const canSave = produto.trim().length > 0 && valor > 0;

  const handleSalvar = async () => {
    if (!canSave || !id) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    try {
      await atualizarVenda(id, {
        produto: produto.trim(),
        cliente: cliente.trim(),
        valor,
        quantidade: qtd,
        observacoes: observacoes.trim(),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleExcluir = () => {
    Alert.alert(
      "Excluir venda",
      "Tem certeza que deseja excluir esta venda? Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await removerVenda(id);
            router.back();
          },
        },
      ]
    );
  };

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (!venda) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
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
          <Pressable onPress={() => router.back()} style={styles.navBtn}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>
            Detalhe
          </Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>
            Venda não encontrada
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          Editar Venda
        </Text>
        <Pressable
          onPress={handleSalvar}
          disabled={!canSave || saving}
          style={({ pressed }) => [
            styles.saveBtn,
            {
              backgroundColor: canSave ? colors.primary : colors.muted,
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Text
            style={[
              styles.saveBtnText,
              { color: canSave ? "#fff" : colors.mutedForeground },
            ]}
          >
            {saving ? "Salvando..." : "Salvar"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: bottomPad + 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.dataBanner,
            { backgroundColor: colors.accent, borderColor: colors.border },
          ]}
        >
          <Feather name="calendar" size={14} color={colors.mutedForeground} />
          <Text style={[styles.dataBannerText, { color: colors.mutedForeground }]}>
            {formatData(venda.data)}
          </Text>
        </View>

        <Field
          label="Produto / Serviço"
          value={produto}
          onChangeText={setProduto}
          placeholder="Ex: Consultoria, Produto A..."
          returnKeyType="next"
          onSubmitEditing={() => clienteRef.current?.focus()}
          colors={colors}
        />

        <Field
          label="Cliente"
          value={cliente}
          onChangeText={setCliente}
          placeholder="Nome do cliente"
          returnKeyType="next"
          onSubmitEditing={() => qtdRef.current?.focus()}
          inputRef={clienteRef}
          colors={colors}
          optional
        />

        <View style={styles.row}>
          <View style={styles.rowHalf}>
            <Field
              label="Valor (R$)"
              value={valorDisplay}
              onChangeText={handleValorChange}
              placeholder="0,00"
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => qtdRef.current?.focus()}
              colors={colors}
              prefix="R$"
            />
          </View>
          <View style={styles.rowHalf}>
            <Field
              label="Quantidade"
              value={quantidade}
              onChangeText={(t) => setQuantidade(t.replace(/\D/g, "") || "1")}
              placeholder="1"
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => obsRef.current?.focus()}
              inputRef={qtdRef}
              colors={colors}
            />
          </View>
        </View>

        {valor > 0 && (
          <View
            style={[
              styles.totalBanner,
              { backgroundColor: colors.accent, borderColor: colors.secondary },
            ]}
          >
            <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
              Total
            </Text>
            <Text style={[styles.totalValor, { color: colors.primary }]}>
              {total.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </Text>
          </View>
        )}

        <Field
          label="Observações"
          value={observacoes}
          onChangeText={setObservacoes}
          placeholder="Anotações adicionais..."
          multiline
          returnKeyType="done"
          inputRef={obsRef}
          colors={colors}
          optional
        />

        <Pressable
          onPress={handleExcluir}
          style={({ pressed }) => [
            styles.deleteBtn,
            {
              backgroundColor: colors.card,
              borderColor: colors.destructive,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Feather name="trash-2" size={16} color={colors.destructive} />
          <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>
            Excluir venda
          </Text>
        </Pressable>
      </ScrollView>
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
  navBtn: { padding: 4 },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scrollContent: { padding: 20, gap: 16 },
  dataBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  dataBannerText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textTransform: "capitalize",
  },
  fieldContainer: { gap: 6 },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  optionalTag: { fontSize: 11, fontFamily: "Inter_400Regular" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputPrefix: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    paddingVertical: 14,
  },
  inputMultiline: {
    height: 90,
    textAlignVertical: "top",
    paddingTop: 14,
  },
  row: { flexDirection: "row", gap: 12 },
  rowHalf: { flex: 1 },
  totalBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: -4,
  },
  totalLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  totalValor: { fontSize: 20, fontFamily: "Inter_700Bold" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
  },
  deleteBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center" },
  notFoundText: { fontSize: 16, fontFamily: "Inter_400Regular" },
});
