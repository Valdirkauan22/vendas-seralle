import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Perfil, useProfile } from "@/context/ProfileContext";
import { useColors } from "@/hooks/useColors";

function iniciais(nome: string): string {
  return nome
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

const AVATAR_COLORS = ["#1A6BB5", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#3B82F6"];

function avatarCor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function PerfisScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { perfis, perfilAtivo, criarPerfil, selecionarPerfil, renomearPerfil, excluirPerfil } = useProfile();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [novoNome, setNovoNome] = useState("");
  const [criando, setCriando] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState("");

  const handleCriar = async () => {
    const nome = novoNome.trim();
    if (!nome) return;
    setCriando(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      const novo = await criarPerfil(nome);
      await selecionarPerfil(novo.id);
      setNovoNome("");
      router.back();
    } finally {
      setCriando(false);
    }
  };

  const handleSelecionar = async (perfil: Perfil) => {
    if (perfil.id === perfilAtivo?.id) { router.back(); return; }
    Haptics.selectionAsync();
    await selecionarPerfil(perfil.id);
    router.back();
  };

  const handleIniciarEdicao = (perfil: Perfil) => {
    setEditandoId(perfil.id);
    setEditNome(perfil.nome);
  };

  const handleSalvarEdicao = async () => {
    if (!editandoId || !editNome.trim()) return;
    Haptics.selectionAsync();
    await renomearPerfil(editandoId, editNome);
    setEditandoId(null);
  };

  const handleExcluir = (perfil: Perfil) => {
    if (perfis.length <= 1) {
      Alert.alert("Não é possível excluir", "O app precisa ter ao menos uma vendedora.");
      return;
    }
    Alert.alert(
      "Excluir perfil",
      `Deseja excluir "${perfil.nome}"? Todos os dados desse perfil serão apagados permanentemente.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            await excluirPerfil(perfil.id);
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Navbar */}
        <View
          style={[
            styles.navBar,
            { paddingTop: topPad + 8, backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
          >
            <Feather name="x" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Vendedoras</Text>
          <View style={styles.navBtn} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: bottomPad + 32 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Lista de perfis */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>PERFIS SALVOS</Text>

          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {perfis.map((perfil, index) => {
              const ativo = perfil.id === perfilAtivo?.id;
              const editando = editandoId === perfil.id;
              const cor = avatarCor(perfil.id);
              const isLast = index === perfis.length - 1;

              return (
                <View key={perfil.id}>
                  <View style={styles.perfilRow}>
                    {/* Avatar */}
                    <View style={[styles.avatar, { backgroundColor: cor + "22", borderColor: cor + "44" }]}>
                      <Text style={[styles.avatarText, { color: cor }]}>{iniciais(perfil.nome)}</Text>
                    </View>

                    {/* Nome / input de edição */}
                    <View style={styles.perfilInfo}>
                      {editando ? (
                        <TextInput
                          style={[styles.editInput, { color: colors.foreground, borderColor: colors.primary, backgroundColor: colors.muted }]}
                          value={editNome}
                          onChangeText={setEditNome}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={handleSalvarEdicao}
                          selectTextOnFocus
                        />
                      ) : (
                        <>
                          <Text style={[styles.perfilNome, { color: colors.foreground }]}>{perfil.nome}</Text>
                          {ativo && (
                            <View style={[styles.ativoBadge, { backgroundColor: colors.primary + "18" }]}>
                              <Text style={[styles.ativoText, { color: colors.primary }]}>Ativo</Text>
                            </View>
                          )}
                        </>
                      )}
                    </View>

                    {/* Ações */}
                    {editando ? (
                      <Pressable
                        onPress={handleSalvarEdicao}
                        style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                      >
                        <Feather name="check" size={18} color={colors.primary} />
                      </Pressable>
                    ) : (
                      <View style={styles.actions}>
                        <Pressable
                          onPress={() => handleIniciarEdicao(perfil)}
                          style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                        >
                          <Feather name="edit-2" size={16} color={colors.mutedForeground} />
                        </Pressable>
                        {!ativo && (
                          <Pressable
                            onPress={() => handleExcluir(perfil)}
                            style={({ pressed }) => [styles.iconBtn, { opacity: pressed ? 0.6 : 1 }]}
                          >
                            <Feather name="trash-2" size={16} color={colors.destructive} />
                          </Pressable>
                        )}
                        {!ativo && (
                          <Pressable
                            onPress={() => handleSelecionar(perfil)}
                            style={({ pressed }) => [
                              styles.selectBtn,
                              { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 },
                            ]}
                          >
                            <Text style={styles.selectBtnText}>Selecionar</Text>
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                  {!isLast && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
                </View>
              );
            })}
          </View>

          {/* Criar novo perfil */}
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground, marginTop: 8 }]}>NOVA VENDEDORA</Text>
          <View style={[styles.novoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.novoRow]}>
              <TextInput
                style={[styles.novoInput, { color: colors.foreground, backgroundColor: colors.muted, borderColor: colors.border }]}
                value={novoNome}
                onChangeText={setNovoNome}
                placeholder="Nome da vendedora"
                placeholderTextColor={colors.mutedForeground}
                returnKeyType="done"
                onSubmitEditing={handleCriar}
                maxLength={40}
              />
              <Pressable
                onPress={handleCriar}
                disabled={!novoNome.trim() || criando}
                style={({ pressed }) => [
                  styles.criarBtn,
                  {
                    backgroundColor: novoNome.trim() ? colors.primary : colors.muted,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Feather name="plus" size={20} color={novoNome.trim() ? "#fff" : colors.mutedForeground} />
              </Pressable>
            </View>
            <Text style={[styles.novoHint, { color: colors.mutedForeground }]}>
              Cada vendedora tem suas próprias vendas e metas independentes.
            </Text>
          </View>
        </ScrollView>
      </View>
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
  navBtn: { padding: 4, width: 40 },
  navTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scroll: { padding: 16, gap: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, marginBottom: 4 },
  listCard: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  perfilRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  perfilInfo: { flex: 1, gap: 3 },
  perfilNome: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  ativoBadge: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  ativoText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  editInput: {
    borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, fontSize: 15, fontFamily: "Inter_400Regular",
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 4 },
  iconBtn: { padding: 6 },
  selectBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  selectBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff" },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  novoCard: { borderRadius: 16, borderWidth: 1, padding: 14, gap: 10 },
  novoRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  novoInput: {
    flex: 1, borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 15, fontFamily: "Inter_400Regular",
  },
  criarBtn: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  novoHint: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
});
