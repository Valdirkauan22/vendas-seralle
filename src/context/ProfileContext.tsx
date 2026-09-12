import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Perfil } from "@/types";
import { gerarSyncCode } from "@/utils/formatters";
import { useAuth } from "./AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const STORAGE_KEY_PERFIS = "@diario_vendas:perfis_v1";
const STORAGE_KEY_ATIVO = "@diario_vendas:perfil_ativo_v1";
const STORAGE_KEY_SYNC = "@diario_vendas:sync_code_v1";

const PERFIL_PADRAO: Perfil = {
  id: "default",
  nome: "Vendedora",
  createdAt: new Date().toISOString(),
};

interface ProfileContextValue {
  perfis: Perfil[];
  perfilAtivo: Perfil | null;
  syncCode: string | null;
  isSyncing: boolean;
  lastSync: Date | null;
  criarPerfil: (nome: string) => Promise<Perfil>;
  selecionarPerfil: (id: string) => Promise<void>;
  renomearPerfil: (id: string, novoNome: string) => Promise<void>;
  excluirPerfil: (id: string) => Promise<void>;
  setSyncCode: (code: string) => Promise<void>;
  gerarNovoSyncCode: () => Promise<string>;
  setLastSync: (d: Date) => void;
  setIsSyncing: (v: boolean) => void;
  puxarDadosCloud: (code: string) => Promise<any>;
  enviarDadosCloud: (code: string, payload: any) => Promise<boolean>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user, userProfile } = useAuth();

  const [perfis, setPerfis] = useState<Perfil[]>([PERFIL_PADRAO]);
  const [perfilAtivo, setPerfilAtivo] = useState<Perfil | null>(PERFIL_PADRAO);
  const [syncCode, setSyncCodeState] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Sync profile state with authenticated user
  useEffect(() => {
    if (user && userProfile) {
      const authPerfil: Perfil = {
        id: user.uid,
        nome: userProfile.displayName || user.displayName || "Vendedora",
        email: user.email || undefined,
        loja: userProfile.loja,
        createdAt: userProfile.createdAt || new Date().toISOString(),
      };
      setPerfis([authPerfil]);
      setPerfilAtivo(authPerfil);
      setSyncCodeState(user.uid.slice(0, 8).toUpperCase());
      setLoaded(true);
      return;
    }

    try {
      const storedPerfis = localStorage.getItem(STORAGE_KEY_PERFIS);
      const storedAtivo = localStorage.getItem(STORAGE_KEY_ATIVO);
      let storedSync = localStorage.getItem(STORAGE_KEY_SYNC);

      let parsedPerfis = [PERFIL_PADRAO];
      if (storedPerfis) {
        try {
          const list = JSON.parse(storedPerfis);
          if (Array.isArray(list) && list.length > 0) {
            parsedPerfis = list;
          }
        } catch {}
      }

      let active = parsedPerfis[0];
      if (storedAtivo) {
        const found = parsedPerfis.find((p) => p.id === storedAtivo);
        if (found) active = found;
      }

      if (!storedSync) {
        storedSync = gerarSyncCode();
        localStorage.setItem(STORAGE_KEY_SYNC, storedSync);
      }

      setPerfis(parsedPerfis);
      setPerfilAtivo(active);
      setSyncCodeState(storedSync);
    } catch (e) {
      console.warn("Storage load error", e);
    } finally {
      setLoaded(true);
    }
  }, [user, userProfile]);

  const salvarPerfisLocal = (novosPerfis: Perfil[], novoAtivoId?: string) => {
    setPerfis(novosPerfis);
    localStorage.setItem(STORAGE_KEY_PERFIS, JSON.stringify(novosPerfis));

    const idAtivo = novoAtivoId ?? perfilAtivo?.id;
    const ativoObj = novosPerfis.find((p) => p.id === idAtivo) ?? novosPerfis[0];
    setPerfilAtivo(ativoObj);
    localStorage.setItem(STORAGE_KEY_ATIVO, ativoObj.id);
  };

  const criarPerfil = useCallback(
    async (nome: string): Promise<Perfil> => {
      const novo: Perfil = {
        id: "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        nome: nome.trim(),
        createdAt: new Date().toISOString(),
      };
      const atualizados = [...perfis, novo];
      salvarPerfisLocal(atualizados, novo.id);
      return novo;
    },
    [perfis]
  );

  const selecionarPerfil = useCallback(
    async (id: string) => {
      const p = perfis.find((x) => x.id === id);
      if (p) {
        setPerfilAtivo(p);
        localStorage.setItem(STORAGE_KEY_ATIVO, p.id);
      }
    },
    [perfis]
  );

  const renomearPerfil = useCallback(
    async (id: string, novoNome: string) => {
      const atualizados = perfis.map((p) => (p.id === id ? { ...p, nome: novoNome.trim() } : p));
      salvarPerfisLocal(atualizados);
    },
    [perfis]
  );

  const excluirPerfil = useCallback(
    async (id: string) => {
      if (perfis.length <= 1) return;
      const atualizados = perfis.filter((p) => p.id !== id);
      const novoAtivo = perfilAtivo?.id === id ? atualizados[0].id : perfilAtivo?.id;
      salvarPerfisLocal(atualizados, novoAtivo);
    },
    [perfis, perfilAtivo]
  );

  const setSyncCode = useCallback(async (code: string) => {
    const formatted = code.trim().toUpperCase();
    setSyncCodeState(formatted);
    localStorage.setItem(STORAGE_KEY_SYNC, formatted);
  }, []);

  const gerarNovoSyncCode = useCallback(async () => {
    const novo = gerarSyncCode();
    await setSyncCode(novo);
    return novo;
  }, [setSyncCode]);

  const puxarDadosCloud = useCallback(async (code: string) => {
    const formatted = (code || "").trim().toUpperCase();
    if (!formatted) return null;

    // 1. Prioridade: Firestore do usuário autenticado
    if (user?.uid) {
      try {
        const docRef = doc(db, "users", user.uid, "syncBackup", formatted);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          return {
            profiles: data.profiles || [],
            dias: data.dias || [],
            configs: data.configs || [],
            rawDias: data.rawDias || null,
            rawConfigs: data.rawConfigs || null,
          };
        }
      } catch (fsErr) {
        console.warn("Aviso ao buscar backup no Firestore:", fsErr);
      }
    }

    // Não existe fallback público: dados de vendas só podem ser lidos
    // dentro da área autenticada do próprio usuário.
    return null;
  }, [user?.uid]);

  const enviarDadosCloud = useCallback(async (code: string, payload: any): Promise<boolean> => {
    const formatted = (code || "").trim().toUpperCase();
    if (!formatted) return false;

    let saved = false;

    // 1. Grava no Firestore do usuário autenticado
    if (user?.uid) {
      try {
        const docRef = doc(db, "users", user.uid, "syncBackup", formatted);
        await setDoc(
          docRef,
          {
            syncCode: formatted,
            ...payload,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
        saved = true;
      } catch (fsErr) {
        console.warn("Aviso ao gravar backup no Firestore:", fsErr);
      }
    }

    // A cópia autenticada no Firestore é a única fonte de verdade.
    // Usuários offline continuam protegidos pelo backup local exportável.
    return saved;
  }, [user?.uid]);

  return (
    <ProfileContext.Provider
      value={{
        perfis,
        perfilAtivo,
        syncCode,
        isSyncing,
        lastSync,
        criarPerfil,
        selecionarPerfil,
        renomearPerfil,
        excluirPerfil,
        setSyncCode,
        gerarNovoSyncCode,
        setLastSync,
        setIsSyncing,
        puxarDadosCloud,
        enviarDadosCloud,
      }}
    >
      {loaded ? children : <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">Carregando Diário de Vendas...</div>}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}
