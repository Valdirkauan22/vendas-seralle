import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { useProfile } from "./ProfileContext";

export interface VendaItem {
  id: string;
  valor: number;
  pares: number;
  descricao: string;
  hora: string;
}

export interface DiaVenda {
  itens: VendaItem[];
  margem: number;
}

export interface ConfigMes {
  cotaA: { valor: number; pares: number; margem: number };
  cotaB: { valor: number; pares: number; margem: number };
  cotaC: { valor: number; pares: number; margem: number };
  cotaAlta: { valor: number; pares: number; margem: number };
}

export const CONFIG_MES_PADRAO: ConfigMes = {
  cotaA: { valor: 55000, pares: 410, margem: 0 },
  cotaB: { valor: 65000, pares: 450, margem: 0 },
  cotaC: { valor: 75000, pares: 490, margem: 0 },
  cotaAlta: { valor: 90000, pares: 550, margem: 0 },
};

type DiasMap = Record<string, DiaVenda>;
type ConfigMap = Record<string, ConfigMes>;

interface DiaTotais {
  valor: number;
  pares: number;
  margem: number;
  qtd: number;
}

interface VendasContextType {
  dias: DiasMap;
  configs: ConfigMap;
  loading: boolean;
  adicionarItem: (data: string, item: Omit<VendaItem, "id" | "hora">) => Promise<void>;
  removerItem: (data: string, itemId: string) => Promise<void>;
  salvarMargemDia: (data: string, margem: number) => Promise<void>;
  removerDia: (data: string) => Promise<void>;
  getDia: (data: string) => DiaVenda | null;
  getDiaTotais: (data: string) => DiaTotais | null;
  getConfigMes: (mesId: string) => ConfigMes;
  salvarConfigMes: (mesId: string, config: ConfigMes) => Promise<void>;
  getDiasMes: (mesId: string) => Array<{ data: string; dia: DiaVenda }>;
  getTotalMes: (mesId: string) => { valor: number; pares: number; margem: number; dias: number };
}

const VendasContext = createContext<VendasContextType | null>(null);

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function storageKeyDias(profileId: string) {
  return `@diario_vendas:dias_v3:${profileId}`;
}
function storageKeyConfigs(profileId: string) {
  return `@diario_vendas:configs_v2:${profileId}`;
}

export function VendasProvider({ children }: { children: React.ReactNode }) {
  const { perfilAtivo } = useProfile();
  const profileId = perfilAtivo?.id ?? "default";

  const [dias, setDias] = useState<DiasMap>({});
  const [configs, setConfigs] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);

  // Recarrega dados sempre que o perfil ativo mudar
  useEffect(() => {
    setLoading(true);
    setDias({});
    setConfigs({});
    (async () => {
      try {
        // Migração: se for o perfil "default", tenta carregar dados das chaves antigas
        const [rawDias, rawConfigs] = await Promise.all([
          AsyncStorage.multiGet([
            storageKeyDias(profileId),
            ...(profileId === "default" ? ["@diario_vendas:dias_v3"] : []),
          ]),
          AsyncStorage.multiGet([
            storageKeyConfigs(profileId),
            ...(profileId === "default" ? ["@diario_vendas:configs_v2"] : []),
          ]),
        ]);

        const diasVal = rawDias[0][1] ?? (profileId === "default" ? rawDias[1]?.[1] : null);
        const configsVal = rawConfigs[0][1] ?? (profileId === "default" ? rawConfigs[1]?.[1] : null);

        if (diasVal) setDias(JSON.parse(diasVal));
        if (configsVal) setConfigs(JSON.parse(configsVal));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [profileId]);

  const persistirDias = useCallback(async (novo: DiasMap) => {
    await AsyncStorage.setItem(storageKeyDias(profileId), JSON.stringify(novo));
    setDias(novo);
  }, [profileId]);

  const adicionarItem = useCallback(
    async (data: string, item: Omit<VendaItem, "id" | "hora">) => {
      const diaAtual = dias[data] ?? { itens: [], margem: 0 };
      const novoItem: VendaItem = { ...item, id: gerarId(), hora: new Date().toISOString() };
      await persistirDias({ ...dias, [data]: { ...diaAtual, itens: [...diaAtual.itens, novoItem] } });
    },
    [dias, persistirDias]
  );

  const removerItem = useCallback(
    async (data: string, itemId: string) => {
      const diaAtual = dias[data];
      if (!diaAtual) return;
      await persistirDias({ ...dias, [data]: { ...diaAtual, itens: diaAtual.itens.filter((i) => i.id !== itemId) } });
    },
    [dias, persistirDias]
  );

  const salvarMargemDia = useCallback(
    async (data: string, margem: number) => {
      const diaAtual = dias[data] ?? { itens: [], margem: 0 };
      await persistirDias({ ...dias, [data]: { ...diaAtual, margem } });
    },
    [dias, persistirDias]
  );

  const removerDia = useCallback(
    async (data: string) => {
      const novo = { ...dias };
      delete novo[data];
      await persistirDias(novo);
    },
    [dias, persistirDias]
  );

  const getDia = useCallback((data: string): DiaVenda | null => dias[data] ?? null, [dias]);

  const getDiaTotais = useCallback(
    (data: string): DiaTotais | null => {
      const dia = dias[data];
      if (!dia || dia.itens.length === 0) return null;
      const valor = dia.itens.reduce((s, i) => s + i.valor, 0);
      const pares = dia.itens.reduce((s, i) => s + i.pares, 0);
      return { valor, pares, margem: dia.margem, qtd: dia.itens.length };
    },
    [dias]
  );

  const getConfigMes = useCallback(
    (mesId: string): ConfigMes => configs[mesId] ?? CONFIG_MES_PADRAO,
    [configs]
  );

  const salvarConfigMes = useCallback(
    async (mesId: string, config: ConfigMes) => {
      const novo = { ...configs, [mesId]: config };
      await AsyncStorage.setItem(storageKeyConfigs(profileId), JSON.stringify(novo));
      setConfigs(novo);
    },
    [configs, profileId]
  );

  const getDiasMes = useCallback(
    (mesId: string): Array<{ data: string; dia: DiaVenda }> =>
      Object.entries(dias)
        .filter(([data]) => data.startsWith(mesId))
        .map(([data, dia]) => ({ data, dia }))
        .sort((a, b) => a.data.localeCompare(b.data)),
    [dias]
  );

  const getTotalMes = useCallback(
    (mesId: string) => {
      const entr = getDiasMes(mesId);
      let valor = 0, pares = 0, margem = 0, qtdMargem = 0, diasComVenda = 0;
      for (const { dia } of entr) {
        const v = dia.itens.reduce((s, i) => s + i.valor, 0);
        const p = dia.itens.reduce((s, i) => s + i.pares, 0);
        if (v > 0 || p > 0) diasComVenda++;
        valor += v;
        pares += p;
        if (dia.margem > 0) { margem += dia.margem; qtdMargem++; }
      }
      return { valor, pares, margem: qtdMargem > 0 ? margem / qtdMargem : 0, dias: diasComVenda };
    },
    [getDiasMes]
  );

  return (
    <VendasContext.Provider value={{ dias, configs, loading, adicionarItem, removerItem, salvarMargemDia, removerDia, getDia, getDiaTotais, getConfigMes, salvarConfigMes, getDiasMes, getTotalMes }}>
      {children}
    </VendasContext.Provider>
  );
}

export function useVendas() {
  const ctx = useContext(VendasContext);
  if (!ctx) throw new Error("useVendas deve ser usado dentro de VendasProvider");
  return ctx;
}

export function getMesId(ano: number, mes: number): string {
  return `${ano}-${String(mes).padStart(2, "0")}`;
}

export function getHojeStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function getMesAtualId(): string {
  const now = new Date();
  return getMesId(now.getFullYear(), now.getMonth() + 1);
}

const MESES_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export function nomeMes(mes: number): string { return MESES_PT[mes - 1] ?? ""; }
export function diasNoMes(ano: number, mes: number): number { return new Date(ano, mes, 0).getDate(); }
export function primeiroDiaSemana(ano: number, mes: number): number { return new Date(ano, mes - 1, 1).getDay(); }
