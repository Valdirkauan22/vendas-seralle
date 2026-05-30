import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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
  cotaA: { valor: number; pares: number };
  cotaB: { valor: number; pares: number };
  cotaC: { valor: number; pares: number };
  cotaAlta: { valor: number; pares: number };
}

export const CONFIG_MES_PADRAO: ConfigMes = {
  cotaA: { valor: 55000, pares: 410 },
  cotaB: { valor: 65000, pares: 450 },
  cotaC: { valor: 75000, pares: 490 },
  cotaAlta: { valor: 90000, pares: 550 },
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
  adicionarItem: (
    data: string,
    item: Omit<VendaItem, "id" | "hora">
  ) => Promise<void>;
  removerItem: (data: string, itemId: string) => Promise<void>;
  salvarMargemDia: (data: string, margem: number) => Promise<void>;
  removerDia: (data: string) => Promise<void>;
  getDia: (data: string) => DiaVenda | null;
  getDiaTotais: (data: string) => DiaTotais | null;
  getConfigMes: (mesId: string) => ConfigMes;
  salvarConfigMes: (mesId: string, config: ConfigMes) => Promise<void>;
  getDiasMes: (mesId: string) => Array<{ data: string; dia: DiaVenda }>;
  getTotalMes: (
    mesId: string
  ) => { valor: number; pares: number; margem: number; dias: number };
}

const STORAGE_DIAS = "@diario_vendas:dias_v3";
const STORAGE_CONFIGS = "@diario_vendas:configs_v2";

const VendasContext = createContext<VendasContextType | null>(null);

function gerarId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function VendasProvider({ children }: { children: React.ReactNode }) {
  const [dias, setDias] = useState<DiasMap>({});
  const [configs, setConfigs] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [rawDias, rawConfigs] = await Promise.all([
          AsyncStorage.getItem(STORAGE_DIAS),
          AsyncStorage.getItem(STORAGE_CONFIGS),
        ]);
        if (rawDias) setDias(JSON.parse(rawDias));
        if (rawConfigs) setConfigs(JSON.parse(rawConfigs));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persistirDias = useCallback(async (novo: DiasMap) => {
    await AsyncStorage.setItem(STORAGE_DIAS, JSON.stringify(novo));
    setDias(novo);
  }, []);

  const adicionarItem = useCallback(
    async (data: string, item: Omit<VendaItem, "id" | "hora">) => {
      const diaAtual = dias[data] ?? { itens: [], margem: 0 };
      const novoItem: VendaItem = {
        ...item,
        id: gerarId(),
        hora: new Date().toISOString(),
      };
      const novo: DiasMap = {
        ...dias,
        [data]: { ...diaAtual, itens: [...diaAtual.itens, novoItem] },
      };
      await persistirDias(novo);
    },
    [dias, persistirDias]
  );

  const removerItem = useCallback(
    async (data: string, itemId: string) => {
      const diaAtual = dias[data];
      if (!diaAtual) return;
      const novosItens = diaAtual.itens.filter((i) => i.id !== itemId);
      const novo: DiasMap = { ...dias, [data]: { ...diaAtual, itens: novosItens } };
      await persistirDias(novo);
    },
    [dias, persistirDias]
  );

  const salvarMargemDia = useCallback(
    async (data: string, margem: number) => {
      const diaAtual = dias[data] ?? { itens: [], margem: 0 };
      const novo: DiasMap = { ...dias, [data]: { ...diaAtual, margem } };
      await persistirDias(novo);
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

  const getDia = useCallback(
    (data: string): DiaVenda | null => dias[data] ?? null,
    [dias]
  );

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
      await AsyncStorage.setItem(STORAGE_CONFIGS, JSON.stringify(novo));
      setConfigs(novo);
    },
    [configs]
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
      let valor = 0,
        pares = 0,
        margem = 0,
        qtdMargem = 0,
        diasComVenda = 0;
      for (const { dia } of entr) {
        const v = dia.itens.reduce((s, i) => s + i.valor, 0);
        const p = dia.itens.reduce((s, i) => s + i.pares, 0);
        if (v > 0 || p > 0) diasComVenda++;
        valor += v;
        pares += p;
        if (dia.margem > 0) { margem += dia.margem; qtdMargem++; }
      }
      return {
        valor,
        pares,
        margem: qtdMargem > 0 ? margem / qtdMargem : 0,
        dias: diasComVenda,
      };
    },
    [getDiasMes]
  );

  return (
    <VendasContext.Provider
      value={{
        dias,
        configs,
        loading,
        adicionarItem,
        removerItem,
        salvarMargemDia,
        removerDia,
        getDia,
        getDiaTotais,
        getConfigMes,
        salvarConfigMes,
        getDiasMes,
        getTotalMes,
      }}
    >
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

const MESES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];
export function nomeMes(mes: number): string { return MESES_PT[mes - 1] ?? ""; }
export function diasNoMes(ano: number, mes: number): number { return new Date(ano, mes, 0).getDate(); }
export function primeiroDiaSemana(ano: number, mes: number): number { return new Date(ano, mes - 1, 1).getDay(); }
