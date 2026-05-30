import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CONFIG_MES_PADRAO, nomeMes, useVendas } from "@/context/VendasContext";
import { useColors } from "@/hooks/useColors";

function parseValor(display: string): number {
  const clean = display.replace(/\./g, "").replace(",", ".");
  return parseFloat(clean) || 0;
}

function formatValor(v: number): string {
  return v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface CotaInputGroupProps {
  label: string;
  cor: string;
  valor: string;
  pares: string;
  margem: string;
  onValorChange: (v: string) => void;
  onParesChange: (v: string) => void;
  onMargemChange: (v: string) => void;
  paresRef?: React.RefObject<TextInput | null>;
  margemRef?: React.RefObject<TextInput | null>;
  nextRef?: React.RefObject<TextInput | null>;
  colors: ReturnType<typeof useColors>;
}

function CotaInputGroup({
  label,
  cor,
  valor,
  pares,
  margem,
  onValorChange,
  onParesChange,
  onMargemChange,
  paresRef,
  margemRef,
  nextRef,
  colors,
}: CotaInputGroupProps) {
  const [focusValor, setFocusValor] = useState(false);
  const [focusPares, setFocusPares] = useState(false);
  const [focusMargem, setFocusMargem] = useState(false);

  const handleValorChange = (text: string) => {
    const digits = text.replace(/\D/g, "");
    if (!digits) { onValorChange(""); return; }
    const num = parseInt(digits, 10) / 100;
    onValorChange(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  return (
    <View style={[styles.cotaGroup, { borderColor: cor + "44", backgroundColor: cor + "08" }]}>
      <View style={styles.cotaGroupHeader}>
        <View style={[styles.cotaDot, { backgroundColor: cor }]} />
        <Text style={[styles.cotaGroupLabel, { color: colors.foreground }]}>{label}</Text>
      </View>
      <View style={styles.cotaRow}>
        <View style={styles.cotaField}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Valor (R$)</Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: focusValor ? cor : colors.border,
                borderWidth: focusValor ? 1.5 : 1,
              },
            ]}
          >
            <Text style={[styles.prefix, { color: colors.mutedForeground }]}>R$</Text>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              value={valor}
              onChangeText={handleValorChange}
              placeholder="0,00"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => paresRef?.current?.focus()}
              onFocus={() => setFocusValor(true)}
              onBlur={() => setFocusValor(false)}
              selectTextOnFocus
            />
          </View>
        </View>
        <View style={styles.cotaField}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Pares</Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: focusPares ? cor : colors.border,
                borderWidth: focusPares ? 1.5 : 1,
              },
            ]}
          >
            <TextInput
              ref={paresRef}
              style={[styles.input, { color: colors.foreground }]}
              value={pares}
              onChangeText={(t) => onParesChange(t.replace(/\D/g, ""))}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => margemRef?.current?.focus()}
              onFocus={() => setFocusPares(true)}
              onBlur={() => setFocusPares(false)}
              selectTextOnFocus
            />
          </View>
        </View>
        <View style={[styles.cotaField, styles.cotaFieldSmall]}>
          <Text style={[styles.inputLabel, { color: colors.mutedForeground }]}>Margem (%)</Text>
          <View
            style={[
              styles.inputWrap,
              {
                backgroundColor: colors.card,
                borderColor: focusMargem ? cor : colors.border,
                borderWidth: focusMargem ? 1.5 : 1,
              },
            ]}
          >
            <TextInput
              ref={margemRef}
              style={[styles.input, { color: colors.foreground }]}
              value={margem}
              onChangeText={(t) => {
                const clean = t.replace(/[^0-9]/g, "");
                onMargemChange(clean);
              }}
              placeholder="0"
              placeholderTextColor={colors.mutedForeground}
              keyboardType="numeric"
              returnKeyType="next"
              onSubmitEditing={() => nextRef?.current?.focus()}
              onFocus={() => setFocusMargem(true)}
              onBlur={() => setFocusMargem(false)}
              selectTextOnFocus
            />
            <Text style={[styles.prefix, { color: colors.mutedForeground }]}>%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function MetasScreen() {
  const { mesId } = useLocalSearchParams<{ mesId: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getConfigMes, salvarConfigMes } = useVendas();

  const config = mesId ? getConfigMes(mesId) : CONFIG_MES_PADRAO;

  const [aValor, setAValor] = useState(formatValor(config.cotaA.valor));
  const [aPares, setAPares] = useState(String(config.cotaA.pares));
  const [aMargem, setAMargem] = useState(String(config.cotaA.margem ?? 0));
  const [bValor, setBValor] = useState(formatValor(config.cotaB.valor));
  const [bPares, setBPares] = useState(String(config.cotaB.pares));
  const [bMargem, setBMargem] = useState(String(config.cotaB.margem ?? 0));
  const [cValor, setCValor] = useState(formatValor(config.cotaC.valor));
  const [cPares, setCPares] = useState(String(config.cotaC.pares));
  const [cMargem, setCMargem] = useState(String(config.cotaC.margem ?? 0));
  const [altaValor, setAltaValor] = useState(formatValor((config.cotaAlta ?? CONFIG_MES_PADRAO.cotaAlta).valor));
  const [altaPares, setAltaPares] = useState(String((config.cotaAlta ?? CONFIG_MES_PADRAO.cotaAlta).pares));
  const [altaMargem, setAltaMargem] = useState(String((config.cotaAlta ?? CONFIG_MES_PADRAO.cotaAlta).margem ?? 0));
  const [saving, setSaving] = useState(false);

  const aParesRef = useRef<TextInput>(null);
  const aMargemRef = useRef<TextInput>(null);
  const bValorRef = useRef<TextInput>(null);
  const bParesRef = useRef<TextInput>(null);
  const bMargemRef = useRef<TextInput>(null);
  const cValorRef = useRef<TextInput>(null);
  const cParesRef = useRef<TextInput>(null);
  const cMargemRef = useRef<TextInput>(null);
  const altaValorRef = useRef<TextInput>(null);
  const altaParesRef = useRef<TextInput>(null);
  const altaMargemRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const mesNum = mesId ? parseInt(mesId.split("-")[1]) : new Date().getMonth() + 1;
  const anoNum = mesId ? parseInt(mesId.split("-")[0]) : new Date().getFullYear();

  const handleSalvar = async () => {
    if (!mesId) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSaving(true);
    try {
      await salvarConfigMes(mesId, {
        cotaA: { valor: parseValor(aValor), pares: parseInt(aPares) || 0, margem: parseInt(aMargem) || 0 },
        cotaB: { valor: parseValor(bValor), pares: parseInt(bPares) || 0, margem: parseInt(bMargem) || 0 },
        cotaC: { valor: parseValor(cValor), pares: parseInt(cPares) || 0, margem: parseInt(cMargem) || 0 },
        cotaAlta: { valor: parseValor(altaValor), pares: parseInt(altaPares) || 0, margem: parseInt(altaMargem) || 0 },
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setAValor(formatValor(CONFIG_MES_PADRAO.cotaA.valor));
    setAPares(String(CONFIG_MES_PADRAO.cotaA.pares));
    setAMargem(String(CONFIG_MES_PADRAO.cotaA.margem));
    setBValor(formatValor(CONFIG_MES_PADRAO.cotaB.valor));
    setBPares(String(CONFIG_MES_PADRAO.cotaB.pares));
    setBMargem(String(CONFIG_MES_PADRAO.cotaB.margem));
    setCValor(formatValor(CONFIG_MES_PADRAO.cotaC.valor));
    setCPares(String(CONFIG_MES_PADRAO.cotaC.pares));
    setCMargem(String(CONFIG_MES_PADRAO.cotaC.margem));
    setAltaValor(formatValor(CONFIG_MES_PADRAO.cotaAlta.valor));
    setAltaPares(String(CONFIG_MES_PADRAO.cotaAlta.pares));
    setAltaMargem(String(CONFIG_MES_PADRAO.cotaAlta.margem));
  };

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
        <View>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Metas do Mês</Text>
          <Text style={[styles.navSub, { color: colors.mutedForeground }]}>
            {nomeMes(mesNum)} {anoNum}
          </Text>
        </View>
        <Pressable
          onPress={handleSalvar}
          disabled={saving}
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

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.desc, { color: colors.mutedForeground }]}>
          Defina o valor, os pares e a margem (%) para cada nível de meta mensal.
        </Text>

        <CotaInputGroup
          label="Cota A"
          cor="#10B981"
          valor={aValor}
          pares={aPares}
          margem={aMargem}
          onValorChange={setAValor}
          onParesChange={setAPares}
          onMargemChange={setAMargem}
          paresRef={aParesRef}
          margemRef={aMargemRef}
          nextRef={bValorRef}
          colors={colors}
        />
        <CotaInputGroup
          label="Cota B"
          cor="#3B82F6"
          valor={bValor}
          pares={bPares}
          margem={bMargem}
          onValorChange={setBValor}
          onParesChange={setBPares}
          onMargemChange={setBMargem}
          paresRef={bParesRef}
          margemRef={bMargemRef}
          nextRef={cValorRef}
          colors={colors}
        />
        <CotaInputGroup
          label="Cota C"
          cor="#8B5CF6"
          valor={cValor}
          pares={cPares}
          margem={cMargem}
          onValorChange={setCValor}
          onParesChange={setCPares}
          onMargemChange={setCMargem}
          paresRef={cParesRef}
          margemRef={cMargemRef}
          nextRef={altaValorRef}
          colors={colors}
        />
        <CotaInputGroup
          label="Cota Alta"
          cor="#F59E0B"
          valor={altaValor}
          pares={altaPares}
          margem={altaMargem}
          onValorChange={setAltaValor}
          onParesChange={setAltaPares}
          onMargemChange={setAltaMargem}
          paresRef={altaParesRef}
          margemRef={altaMargemRef}
          colors={colors}
        />

        <Pressable
          onPress={handleReset}
          style={({ pressed }) => [
            styles.resetBtn,
            { borderColor: colors.border, backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Feather name="refresh-ccw" size={14} color={colors.mutedForeground} />
          <Text style={[styles.resetText, { color: colors.mutedForeground }]}>
            Restaurar padrões (A: 55k/410p · B: 65k/450p · C: 75k/490p · Alta: 90k/550p)
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
  navTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  navSub: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center" },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  scroll: { padding: 20, gap: 16 },
  desc: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 20 },
  cotaGroup: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  cotaGroupHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cotaDot: { width: 10, height: 10, borderRadius: 5 },
  cotaGroupLabel: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cotaRow: { flexDirection: "row", gap: 12 },
  cotaField: { flex: 1, gap: 6 },
  cotaFieldSmall: { flex: 0.75 },
  inputLabel: { fontSize: 12, fontFamily: "Inter_500Medium" },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  prefix: { fontSize: 15, fontFamily: "Inter_500Medium", marginRight: 4 },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    paddingVertical: 13,
  },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
});
