import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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

const DIAS_PT = ["domingo","segunda-feira","terça-feira","quarta-feira","quinta-feira","sexta-feira","sábado"];
const MESES_PT = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];

function formatData(data: string): string {
  const [y, m, d] = data.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${DIAS_PT[dt.getDay()]}, ${d} de ${MESES_PT[m - 1]} de ${y}`;
}

function formatValorDisplay(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseValor(display: string): number {
  const clean = display.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

interface FieldProps {
  label: string;
  sublabel?: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  suffix?: string;
  prefix?: string;
  returnKeyType?: "next" | "done";
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  colors: ReturnType<typeof useColors>;
  large?: boolean;
}

function Field({
  label,
  sublabel,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  suffix,
  prefix,
  returnKeyType = "next",
  onSubmitEditing,
  inputRef,
  colors,
  large,
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>
        {label}
        {sublabel ? (
          <Text style={styles.fieldSublabel}> {sublabel}</Text>
        ) : null}
      </Text>
      <View
        style={[
          styles.inputWrap,
          {
            backgroundColor: colors.card,
            borderColor: focused ? colors.primary : colors.border,
            borderWidth: focused ? 1.5 : 1,
          },
        ]}
      >
        {prefix ? (
          <Text style={[styles.prefix, { color: colors.mutedForeground }]}>{prefix}</Text>
        ) : null}
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            large && styles.inputLarge,
            { color: colors.foreground },
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
          blurOnSubmit={!!onSubmitEditing}
          selectTextOnFocus
        />
        {suffix ? (
          <Text style={[styles.suffix, { color: colors.mutedForeground }]}>{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function DiaScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getDia, salvarDia, removerDia } = useVendas();

  const existente = data ? getDia(data) : null;

  const [valorDisplay, setValorDisplay] = useState(
    existente ? formatValorDisplay(existente.valor) : ""
  );
  const [pares, setPares] = useState(existente ? String(existente.pares) : "");
  const [margem, setMargem] = useState(existente ? String(existente.margem) : "");
  const [saving, setSaving] = useState(false);

  const paresRef = useRef<TextInput>(null);
  const margemRef = useRef<TextInput>(null);

  const valor = parseValor(valorDisplay);
  const paresNum = parseInt(pares) || 0;
  const margemNum = parseFloat(margem.replace(",", ".")) || 0;

  const canSave = valor > 0 || paresNum > 0;

  const handleValorChange = useCallback((text: string) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) { setValorDisplay(""); return; }
    const num = parseInt(digits, 10) / 100;
    setValorDisplay(
      num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  }, []);

  const handleSalvar = useCallback(async () => {
    if (!data || !canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    try {
      await salvarDia(data, {
        valor,
        pares: paresNum,
        margem: margemNum,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  }, [data, valor, paresNum, margemNum, canSave, salvarDia]);

  const handleExcluir = useCallback(() => {
    if (!data || !existente) return;
    Alert.alert(
      "Excluir lançamento",
      "Tem certeza? Este lançamento será removido.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await removerDia(data);
            router.back();
          },
        },
      ]
    );
  }, [data, existente, removerDia]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

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
          <Feather name="x" size={22} color={colors.foreground} />
        </Pressable>
        <View style={styles.navTitleWrap}>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>
            Lançamento
          </Text>
        </View>
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
          <Text style={[styles.saveBtnText, { color: canSave ? "#fff" : colors.mutedForeground }]}>
            {saving ? "Salvando..." : "Salvar"}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Data */}
        <View
          style={[
            styles.dataBanner,
            { backgroundColor: colors.accent, borderColor: colors.border },
          ]}
        >
          <Feather name="calendar" size={15} color={colors.primary} />
          <Text style={[styles.dataLabel, { color: colors.foreground }]}>
            {data ? formatData(data) : "—"}
          </Text>
        </View>

        {/* Venda Diária */}
        <Field
          label="VENDA DIÁRIA"
          value={valorDisplay}
          onChangeText={handleValorChange}
          placeholder="0,00"
          keyboardType="numeric"
          prefix="R$"
          returnKeyType="next"
          onSubmitEditing={() => paresRef.current?.focus()}
          colors={colors}
          large
        />

        {/* Pares */}
        <Field
          label="PARES"
          sublabel="vendidos"
          value={pares}
          onChangeText={(t) => setPares(t.replace(/\D/g, ""))}
          placeholder="0"
          keyboardType="numeric"
          returnKeyType="next"
          onSubmitEditing={() => margemRef.current?.focus()}
          inputRef={paresRef}
          colors={colors}
        />

        {/* Margem */}
        <Field
          label="MARGEM"
          value={margem}
          onChangeText={setMargem}
          placeholder="0"
          keyboardType="numeric"
          suffix="%"
          returnKeyType="done"
          onSubmitEditing={handleSalvar}
          inputRef={margemRef}
          colors={colors}
        />

        {/* Ticket médio */}
        {valor > 0 && paresNum > 0 && (
          <View
            style={[
              styles.ticketCard,
              { backgroundColor: colors.accent, borderColor: colors.secondary },
            ]}
          >
            <Text style={[styles.ticketLabel, { color: colors.mutedForeground }]}>
              Ticket médio por par
            </Text>
            <Text style={[styles.ticketValor, { color: colors.primary }]}>
              {(valor / paresNum).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </Text>
          </View>
        )}

        {/* Excluir */}
        {existente && (
          <Pressable
            onPress={handleExcluir}
            style={({ pressed }) => [
              styles.deleteBtn,
              {
                borderColor: colors.destructive,
                backgroundColor: colors.card,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Feather name="trash-2" size={15} color={colors.destructive} />
            <Text style={[styles.deleteBtnText, { color: colors.destructive }]}>
              Excluir lançamento
            </Text>
          </Pressable>
        )}
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
  navTitleWrap: { alignItems: "center" },
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 18 },
  dataBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  dataLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    textTransform: "capitalize",
    flex: 1,
  },
  fieldWrap: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
  fieldSublabel: { fontFamily: "Inter_400Regular", letterSpacing: 0 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  prefix: { fontSize: 18, fontFamily: "Inter_500Medium", marginRight: 6 },
  suffix: { fontSize: 18, fontFamily: "Inter_500Medium", marginLeft: 4 },
  input: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_500Medium",
    paddingVertical: 16,
  },
  inputLarge: { fontSize: 28, fontFamily: "Inter_700Bold" },
  ticketCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  ticketLabel: { fontSize: 13, fontFamily: "Inter_500Medium" },
  ticketValor: { fontSize: 18, fontFamily: "Inter_700Bold" },
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
});
