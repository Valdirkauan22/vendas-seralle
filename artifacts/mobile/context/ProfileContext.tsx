import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface Perfil {
  id: string;
  nome: string;
  criadoEm: string;
}

interface ProfileContextType {
  perfis: Perfil[];
  perfilAtivo: Perfil | null;
  loading: boolean;
  criarPerfil: (nome: string) => Promise<Perfil>;
  selecionarPerfil: (id: string) => Promise<void>;
  renomearPerfil: (id: string, nome: string) => Promise<void>;
  excluirPerfil: (id: string) => Promise<void>;
}

const STORAGE_PERFIS = "@diario_vendas:perfis_v1";
const STORAGE_ATIVO = "@diario_vendas:perfil_ativo_v1";

const DEFAULT_PERFIL_ID = "default";

const ProfileContext = createContext<ProfileContextType | null>(null);

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfilAtivoId, setPerfilAtivoId] = useState<string>(DEFAULT_PERFIL_ID);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rawPerfis, rawAtivo] = await Promise.all([
          AsyncStorage.getItem(STORAGE_PERFIS),
          AsyncStorage.getItem(STORAGE_ATIVO),
        ]);

        let lista: Perfil[] = rawPerfis ? JSON.parse(rawPerfis) : [];

        // migração: se não existir nenhum perfil, cria o padrão
        if (lista.length === 0) {
          lista = [{ id: DEFAULT_PERFIL_ID, nome: "Vendedora Principal", criadoEm: new Date().toISOString() }];
          await AsyncStorage.setItem(STORAGE_PERFIS, JSON.stringify(lista));
        }

        setPerfis(lista);
        const ativo = rawAtivo ?? DEFAULT_PERFIL_ID;
        const existe = lista.some((p) => p.id === ativo);
        setPerfilAtivoId(existe ? ativo : lista[0].id);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistir = useCallback(async (lista: Perfil[]) => {
    await AsyncStorage.setItem(STORAGE_PERFIS, JSON.stringify(lista));
    setPerfis(lista);
  }, []);

  const criarPerfil = useCallback(async (nome: string): Promise<Perfil> => {
    const novo: Perfil = { id: gerarId(), nome: nome.trim(), criadoEm: new Date().toISOString() };
    const nova = [...perfis, novo];
    await persistir(nova);
    return novo;
  }, [perfis, persistir]);

  const selecionarPerfil = useCallback(async (id: string) => {
    await AsyncStorage.setItem(STORAGE_ATIVO, id);
    setPerfilAtivoId(id);
  }, []);

  const renomearPerfil = useCallback(async (id: string, nome: string) => {
    const nova = perfis.map((p) => p.id === id ? { ...p, nome: nome.trim() } : p);
    await persistir(nova);
  }, [perfis, persistir]);

  const excluirPerfil = useCallback(async (id: string) => {
    if (perfis.length <= 1) return;
    const nova = perfis.filter((p) => p.id !== id);
    await persistir(nova);
    // limpa dados do perfil excluído
    await AsyncStorage.multiRemove([
      `@diario_vendas:dias_v3:${id}`,
      `@diario_vendas:configs_v2:${id}`,
    ]);
    if (perfilAtivoId === id) {
      await selecionarPerfil(nova[0].id);
    }
  }, [perfis, perfilAtivoId, persistir, selecionarPerfil]);

  const perfilAtivo = perfis.find((p) => p.id === perfilAtivoId) ?? null;

  return (
    <ProfileContext.Provider value={{ perfis, perfilAtivo, loading, criarPerfil, selecionarPerfil, renomearPerfil, excluirPerfil }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile deve ser usado dentro de ProfileProvider");
  return ctx;
}
