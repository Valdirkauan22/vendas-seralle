import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SplashView } from "@/components/SplashView";
import { ProfileProvider } from "@/context/ProfileContext";
import { VendasProvider } from "@/context/VendasContext";
import { agendarNotificacao, getNotifConfig, initNotificationHandler } from "@/utils/notifications";
import { deveExibirOnboarding } from "./onboarding";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen
        name="dia/[data]"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="metas/[mesId]"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="notificacoes"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="historico-metas"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="perfis"
        options={{ presentation: "modal", headerShown: false }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  const [splashDone, setSplashDone] = useState(false);
  const onboardingChecked = useRef(false);
  const fontsReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (!fontsReady) return;
    SplashScreen.hideAsync();
    initNotificationHandler()
      .then(() => getNotifConfig())
      .then((cfg) => { if (cfg.enabled) agendarNotificacao(cfg); })
      .catch(() => { /* notificações não disponíveis nesta plataforma */ });
  }, [fontsReady]);

  // Redireciona para onboarding na primeira abertura, após splash
  useEffect(() => {
    if (!splashDone || onboardingChecked.current) return;
    onboardingChecked.current = true;
    deveExibirOnboarding().then((deve) => {
      if (deve) router.replace("/onboarding");
    });
  }, [splashDone]);

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ProfileProvider>
          <VendasProvider>
            <GestureHandlerRootView>
              <KeyboardProvider>
                {fontsReady && <RootLayoutNav />}
                {!splashDone && (
                  <SplashView onFinish={() => setSplashDone(true)} />
                )}
              </KeyboardProvider>
            </GestureHandlerRootView>
          </VendasProvider>
          </ProfileProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
