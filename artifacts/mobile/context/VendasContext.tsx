import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export interface DiaVenda {
  valor: number;
  pares: number;
  margem: number;
}

export interface ConfigMes {
  cotaA: { valor: number; pares: number };
  cotaB: { valor: number; pares: number };
  cotaC: { valor: number; pares: number };
}

export const CONFIG_MES_PADRAO: ConfigMes = {
  cotaA: { valor: 55000, pares: 410 },
  cotaB: { valor: 65000, pares: 450 },
  cotaC: { valor: 75000, pares: 490 },
};

type DiasMap = Record<string, DiaVenda>;
type ConfigMap = Record<string, ConfigMes>;

interface VendasContextType {
  dias: DiasMap;
  configs: ConfigMap;
  loading: boolean;
  salvarDia: (data: string, dia: DiaVenda) => Promise<void>;
  removerDia: (data: string) => Promise<void>;
  getDia: (data: string) => DiaVenda | null;
  getConfigMes: (mesId: string) => ConfigMes;
  salvarConfigMes: (mesId: string, config: ConfigMes) => Promise<void>;
  getDiasMes: (mesId: string) => Array<{ data: string; dia: DiaVenda }>;
  getTotalMes: (mesId: string) => { valor: number; pares: number; margem: number; dias: number };
}

const STORAGE_DIAS = "@diario_vendas:dias_v2";
const STORAGE_CONFIGS = "@diario_vendas:configs_v2";

const VendasContext = createContext<VendasContextType | null>(null);

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

  const salvarDia = useCallback(
    async (data: string, dia: DiaVenda) => {
      const novo = { ...dias, [data]: dia };
      await AsyncStorage.setItem(STORAGE_DIAS, JSON.stringify(novo));
      setDias(novo);
    },
    [dias]
  );

  const removerDia = useCallback(
    async (data: string) => {
      const novo = { ...dias };
      delete novo[data];
      await AsyncStorage.setItem(STORAGE_DIAS, JSON.stringify(novo));
      setDias(novo);
    },
    [dias]
  );

  const getDia = useCallback(
    (data: string): DiaVenda | null => dias[data] ?? null,
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
    (mesId: string): Array<{ data: string; dia: DiaVenda }> => {
      return Object.entries(dias)
        .filter(([data]) => data.startsWith(mesId))
        .map(([data, dia]) => ({ data, dia }))
        .sort((a, b) => a.data.localeCompare(b.data));
    },
    [dias]
  );

  const getTotalMes = useCallback(
    (mesId: string) => {
      const entr = getDiasMes(mesId);
      let valor = 0, pares = 0, margem = 0, qtd = 0;
      for (const { dia } of entr) {
        valor += dia.valor;
        pares += dia.pares;
        if (dia.margem > 0) { margem += dia.margem; qtd++; }
      }
      return { valor, pares, margem: qtd > 0 ? margem / qtd : 0, dias: entr.length };
    },
    [getDiasMes]
  );

  return (
    <VendasContext.Provider
      value={{
        dias,
        configs,
        loading,
        salvarDia,
        removerDia,
        getDia,
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

export function nomeMes(mes: number): string {
  return MESES_PT[mes - 1] ?? "";
}

export function diasNoMes(ano: number, mes: number): number {
  return new Date(ano, mes, 0).getDate();
}

export function primeiroDiaSemana(ano: number, mes: number): number {
  return new Date(ano, mes - 1, 1).getDay();
}
