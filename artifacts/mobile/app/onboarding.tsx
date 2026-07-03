import { Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const ONBOARDING_KEY = "@diario_vendas:onboarding_done_v1";

export async function marcarOnboardingFeito() {
  await AsyncStorage.setItem(ONBOARDING_KEY, "1");
}

export async function deveExibirOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(ONBOARDING_KEY);
    return v === null;
  } catch {
    return false;
  }
}

interface Slide {
  id: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  titulo: string;
  descricao: string;
  detalhe?: string;
}

const SLIDES: Slide[] = [
  {
    id: "boas-vindas",
    icon: "shopping-bag",
    iconColor: "#1A6BB5",
    iconBg: "#1A6BB5",
    titulo: "Bem-vinda ao\nDiário de Vendas",
    descricao: "Acompanhe cada venda do dia, monitore o progresso nas cotas mensais e exporte relatórios completos.",
    detalhe: "Feito especialmente para as vendedoras da Serallê Calçados.",
  },
  {
    id: "lancamentos",
    icon: "plus-circle",
    iconColor: "#10B981",
    iconBg: "#10B981",
    titulo: "Lance suas vendas\nem segundos",
    descricao: "Toque em qualquer dia do calendário e adicione suas vendas com valor, pares e observação.",
    detalhe: "O resumo do dia aparece automaticamente na tela principal.",
  },
  {
    id: "metas",
    icon: "target",
    iconColor: "#8B5CF6",
    iconBg: "#8B5CF6",
    titulo: "Acompanhe\nsuas cotas",
    descricao: "Configure as cotas A, B, C e Alta de cada mês. A barra de progresso mostra em tempo real onde você está.",
    detalhe: "Acesse o ícone de alvo no canto superior direito para definir suas metas.",
  },
  {
    id: "relatorio",
    icon: "share-2",
    iconColor: "#F59E0B",
    iconBg: "#F59E0B",
    titulo: "Compartilhe\nrelatórios",
    descricao: "Exporte um resumo mensal completo com totais de valor, pares e evolução diária para enviar pelo WhatsApp.",
    detalhe: 'Toque em "Relatório" na tela principal para gerar e compartilhar.',
  },
  {
    id: "sync",
    icon: "cloud",
    iconColor: "#3B82F6",
    iconBg: "#3B82F6",
    titulo: "Seus dados\nna nuvem",
    descricao: "Tudo fica salvo automaticamente. Use o mesmo código de sincronização em outro celular para acessar seus dados.",
    detalhe: "Encontre o código em Vendedoras → Código do dispositivo.",
  },
];

function SlideIcon({ slide, colors }: { slide: Slide; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.iconWrap, { backgroundColor: slide.iconBg + "18" }]}>
      <View style={[styles.iconInner, { backgroundColor: slide.iconBg + "28" }]}>
        <Feather name={slide.icon as any} size={52} color={slide.iconColor} />
      </View>
    </View>
  );
}

export default function OnboardingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === "web" ? 60 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const isLast = currentIndex === SLIDES.length - 1;

  const avancar = async () => {
    if (isLast) {
      await marcarOnboardingFeito();
      router.replace("/(tabs)");
      return;
    }
    const next = currentIndex + 1;
    Haptics.selectionAsync();
    flatRef.current?.scrollToIndex({ index: next, animated: true });
    setCurrentIndex(next);
  };

  const pular = async () => {
    await marcarOnboardingFeito();
    router.replace("/(tabs)");
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  );

  const onMomentumScrollEnd = (e: any) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(idx);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Logo topo */}
      <View style={[styles.topBar, { paddingTop: topPad + 12 }]}>
        <Image
          source={require("../assets/images/logo.webp")}
          style={styles.logo}
          resizeMode="contain"
        />
        {!isLast && (
          <Pressable onPress={pular} style={({ pressed }) => [styles.pularBtn, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.pularText, { color: colors.mutedForeground }]}>Pular</Text>
          </Pressable>
        )}
      </View>

      {/* Slides */}
      <Animated.FlatList
        ref={flatRef}
        data={SLIDES}
        keyExtractor={(s) => s.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            <SlideIcon slide={item} colors={colors} />
            <Text style={[styles.titulo, { color: colors.foreground }]}>{item.titulo}</Text>
            <Text style={[styles.descricao, { color: colors.mutedForeground }]}>{item.descricao}</Text>
            {item.detalhe && (
              <View style={[styles.detalheBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <Feather name="info" size={13} color={colors.mutedForeground} />
                <Text style={[styles.detalheText, { color: colors.mutedForeground }]}>{item.detalhe}</Text>
              </View>
            )}
          </View>
        )}
      />

      {/* Indicadores de página */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const inputRange = [(i - 1) * SCREEN_WIDTH, i * SCREEN_WIDTH, (i + 1) * SCREEN_WIDTH];
          const width = scrollX.interpolate({ inputRange, outputRange: [8, 22, 8], extrapolate: "clamp" });
          const opacity = scrollX.interpolate({ inputRange, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" });
          return (
            <Animated.View
              key={i}
              style={[styles.dot, { width, opacity, backgroundColor: SLIDES[currentIndex]?.iconColor ?? colors.primary }]}
            />
          );
        })}
      </View>

      {/* Botão principal */}
      <View style={[styles.bottomArea, { paddingBottom: bottomPad + 16 }]}>
        <Pressable
          onPress={avancar}
          style={({ pressed }) => [
            styles.btnPrincipal,
            { backgroundColor: SLIDES[currentIndex]?.iconColor ?? colors.primary, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Text style={styles.btnPrincipalText}>
            {isLast ? "Começar agora" : "Continuar"}
          </Text>
          <Feather name={isLast ? "check" : "arrow-right"} size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  logo: { height: 32, width: 120 },
  pularBtn: { padding: 6 },
  pularText: { fontSize: 14, fontFamily: "Inter_500Medium" },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 20,
  },
  iconWrap: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  iconInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  titulo: {
    fontSize: 30,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
    lineHeight: 36,
  },
  descricao: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 24,
  },
  detalheBox: {
    flexDirection: "row",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "flex-start",
    marginTop: 4,
  },
  detalheText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    flex: 1,
    lineHeight: 18,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 4,
  },
  btnPrincipal: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 16,
    paddingVertical: 16,
  },
  btnPrincipalText: {
    fontSize: 17,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
});
