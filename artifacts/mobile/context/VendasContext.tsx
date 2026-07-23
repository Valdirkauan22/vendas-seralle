import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { useProfile } from "./ProfileContext";
import { pushToCloud, pullFromCloud } from "@/utils/sync";

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
  /** Unix ms timestamp of last local write — used for conflict resolution */
  _updatedAt?: number;
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

export type SyncStatus = "idle" | "syncing" | "ok" | "error";

interface VendasContextType {
  dias: DiasMap;
  configs: ConfigMap;
  loading: boolean;
  syncStatus: SyncStatus;
  lastSync: Date | null;
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
  sincronizarAgora: () => Promise<void>;
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

/**
 * Merges cloud dias into a local DiasMap using last-write-wins semantics.
 * Local wins if its _updatedAt >= cloud's updatedAt. Cloud wins otherwise.
 */
function mergeDias(
  local: DiasMap,
  cloudEntries: Array<{ data: string; itensJson: string; margem: string; updatedAt?: string | null }>,
): DiasMap {
  const merged: DiasMap = { ...local };
  for (const entry of cloudEntries) {
    try {
      const cloudDia: DiaVenda = {
        itens: JSON.parse(entry.itensJson),
        margem: parseFloat(entry.margem),
      };
      const cloudTs = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
      const localTs = local[entry.data]?._updatedAt ?? 0;

      if (!local[entry.data] || cloudTs > localTs) {
        // Cloud is newer or local has no entry — use cloud version (preserve local _updatedAt if cloud wins to avoid re-overwriting)
        merged[entry.data] = { ...cloudDia, _updatedAt: localTs || cloudTs };
      }
      // else: local is newer, keep local (already in merged)
    } catch (e) {
      console.warn("[sync] Falha ao processar dia da nuvem:", entry.data, e);
    }
  }
  return merged;
}

/**
 * Merges cloud configs into a local ConfigMap using last-write-wins semantics.
 * Uses a separate timestamps map stored in AsyncStorage for configs.
 */
function mergeConfigs(
  local: ConfigMap,
  localTs: Record<string, number>,
  cloudEntries: Array<{ mesId: string; configJson: string; updatedAt?: string | null }>,
): { configs: ConfigMap; timestamps: Record<string, number> } {
  const merged: ConfigMap = { ...local };
  const timestamps: Record<string, number> = { ...localTs };

  for (const entry of cloudEntries) {
    try {
      const cloudConfig = JSON.parse(entry.configJson) as ConfigMes;
      const cloudTs = entry.updatedAt ? new Date(entry.updatedAt).getTime() : 0;
      const localEntryTs = localTs[entry.mesId] ?? 0;

      if (!local[entry.mesId] || cloudTs > localEntryTs) {
        merged[entry.mesId] = cloudConfig;
        timestamps[entry.mesId] = localEntryTs || cloudTs;
      }
    } catch (e) {
      console.warn("[sync] Falha ao processar config da nuvem:", entry.mesId, e);
    }
  }
  return { configs: merged, timestamps };
}

const KEY_CONFIG_TS = (profileId: string) => `@diario_vendas:configs_ts_v1:${profileId}`;

export function VendasProvider({ children }: { children: React.ReactNode }) {
  const { perfilAtivo, perfis, syncCode } = useProfile();
  const profileId = perfilAtivo?.id ?? "default";

  const [dias, setDias] = useState<DiasMap>({});
  const [configs, setConfigs] = useState<ConfigMap>({});
  const [loading, setLoading] = useState(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Debounce timers for auto-sync and retry
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable refs to latest state — used in callbacks to avoid stale closures
  const diasRef = useRef<DiasMap>({});
  const configsRef = useRef<ConfigMap>({});
  const configTsRef = useRef<Record<string, number>>({});

  diasRef.current = dias;
  configsRef.current = configs;

  // Cleanup timers on unmount
  useEffect(() => () => {
    if (syncTimer.current) clearTimeout(syncTimer.current);
    if (retryTimer.current) clearTimeout(retryTimer.current);
  }, []);

  // Reload data whenever the active profile changes — with cancellation guard
  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setDias({});
    setConfigs({});
    setLastSync(null);
    setSyncStatus("idle");

    (async () => {
      try {
        const [rawDias, rawConfigs, rawConfigTs] = await Promise.all([
          AsyncStorage.multiGet([
            storageKeyDias(profileId),
            ...(profileId === "default" ? ["@diario_vendas:dias_v3"] : []),
          ]),
          AsyncStorage.multiGet([
            storageKeyConfigs(profileId),
            ...(profileId === "default" ? ["@diario_vendas:configs_v2"] : []),
          ]),
          AsyncStorage.getItem(KEY_CONFIG_TS(profileId)),
        ]);

        if (cancelled) return;

        const diasVal = rawDias[0][1] ?? (profileId === "default" ? rawDias[1]?.[1] : null);
        const configsVal = rawConfigs[0][1] ?? (profileId === "default" ? rawConfigs[1]?.[1] : null);

        let parsedDias: DiasMap = {};
        let parsedConfigs: ConfigMap = {};
        let parsedConfigTs: Record<string, number> = {};

        if (diasVal) {
          try { parsedDias = JSON.parse(diasVal); }
          catch (e) { console.warn("[storage] Falha ao ler dias:", e); }
        }
        if (configsVal) {
          try { parsedConfigs = JSON.parse(configsVal); }
          catch (e) { console.warn("[storage] Falha ao ler configs:", e); }
        }
        if (rawConfigTs) {
          try { parsedConfigTs = JSON.parse(rawConfigTs); }
          catch { /* first run */ }
        }

        if (!cancelled) {
          setDias(parsedDias);
          setConfigs(parsedConfigs);
          configTsRef.current = parsedConfigTs;
        }
      } catch (e) {
        console.warn("[storage] Erro ao carregar dados do perfil:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [profileId]);

  // Pull from cloud when profile + syncCode are ready, with cancellation guard
  useEffect(() => {
    if (!syncCode || loading) return;
    let cancelled = false;

    (async () => {
      setSyncStatus("syncing");
      try {
        const cloud = await pullFromCloud(syncCode);
        if (cancelled) return;

        if (!cloud) {
          setSyncStatus("error");
          return;
        }

        const myDias = cloud.dias.filter((x) => x.profileId === profileId);
        const myConfigs = cloud.configs.filter((x) => x.profileId === profileId);

        setDias((prev) => {
          if (cancelled) return prev;
          const merged = mergeDias(prev, myDias);
          AsyncStorage.setItem(storageKeyDias(profileId), JSON.stringify(merged)).catch(
            (e) => console.warn("[storage] Falha ao salvar dias mesclados:", e)
          );
          return merged;
        });

        setConfigs((prev) => {
          if (cancelled) return prev;
          const { configs: merged, timestamps } = mergeConfigs(prev, configTsRef.current, myConfigs);
          configTsRef.current = timestamps;
          AsyncStorage.setItem(storageKeyConfigs(profileId), JSON.stringify(merged)).catch(
            (e) => console.warn("[storage] Falha ao salvar configs mescladas:", e)
          );
          AsyncStorage.setItem(KEY_CONFIG_TS(profileId), JSON.stringify(timestamps)).catch(() => {});
          return merged;
        });

        if (!cancelled) {
          setSyncStatus("ok");
          setLastSync(new Date());
        }
      } catch (e) {
        if (!cancelled) {
          console.warn("[sync] Erro ao sincronizar com a nuvem:", e);
          setSyncStatus("error");
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncCode, profileId]);

  const buildPayload = useCallback(() => {
    return {
      profiles: perfis.map((p) => ({ profileId: p.id, nome: p.nome })),
      dias: Object.entries(diasRef.current).map(([data, dia]) => ({
        profileId,
        data,
        itensJson: JSON.stringify(dia.itens),
        margem: String(dia.margem),
      })),
      configs: Object.entries(configsRef.current).map(([mesId, config]) => ({
        profileId,
        mesId,
        configJson: JSON.stringify(config),
      })),
    };
  }, [profileId, perfis]);

  const schedulSync = useCallback(() => {
    if (!syncCode) return;
    // Cancel any pending retry since we're pushing fresh data now
    if (retryTimer.current) clearTimeout(retryTimer.current);

    setSyncStatus("syncing");
    pushToCloud(syncCode, buildPayload()).then((result) => {
      if (result.ok) {
        setSyncStatus("ok");
        setLastSync(new Date());
      } else {
        setSyncStatus("error");
        console.warn("[sync] Push falhou, agendando retry em 15s:", result.error);
        // Retry once after 15 seconds if the immediate push fails (e.g. offline)
        retryTimer.current = setTimeout(async () => {
          const retry = await pushToCloud(syncCode, buildPayload());
          if (retry.ok) {
            setSyncStatus("ok");
            setLastSync(new Date());
          } else {
            console.warn("[sync] Retry também falhou:", retry.error);
          }
        }, 15_000);
      }
    });
  }, [syncCode, buildPayload]);

  const sincronizarAgora = useCallback(async () => {
    if (!syncCode) return;
    setSyncStatus("syncing");

    try {
      // Pull first so we don't overwrite data from other devices
      const cloud = await pullFromCloud(syncCode);
      if (cloud) {
        const myDias = cloud.dias.filter((x) => x.profileId === profileId);
        const myConfigs = cloud.configs.filter((x) => x.profileId === profileId);

        setDias((prev) => {
          const merged = mergeDias(prev, myDias);
          diasRef.current = merged;
          AsyncStorage.setItem(storageKeyDias(profileId), JSON.stringify(merged)).catch(
            (e) => console.warn("[storage] Falha ao salvar dias:", e)
          );
          return merged;
        });

        setConfigs((prev) => {
          const { configs: merged, timestamps } = mergeConfigs(prev, configTsRef.current, myConfigs);
          configsRef.current = merged;
          configTsRef.current = timestamps;
          AsyncStorage.setItem(storageKeyConfigs(profileId), JSON.stringify(merged)).catch(() => {});
          AsyncStorage.setItem(KEY_CONFIG_TS(profileId), JSON.stringify(timestamps)).catch(() => {});
          return merged;
        });
      }

      // Then push our (now merged) data
      const result = await pushToCloud(syncCode, buildPayload());
      setSyncStatus(result.ok ? "ok" : "error");
      if (result.ok) setLastSync(new Date());
      else console.warn("[sync] sincronizarAgora push falhou:", result.error);
    } catch (e) {
      console.warn("[sync] Erro em sincronizarAgora:", e);
      setSyncStatus("error");
    }
  }, [syncCode, profileId, buildPayload]);

  /**
   * Persist a new dias map to storage.
   * changedKey: the date key that was just written — gets stamped with current time
   *             so local changes beat older cloud versions on next merge.
   */
  const persistirDias = useCallback(async (novo: DiasMap, changedKey?: string) => {
    const now = Date.now();
    let stamped = novo;
    if (changedKey && novo[changedKey]) {
      stamped = { ...novo, [changedKey]: { ...novo[changedKey], _updatedAt: now } };
    }
    await AsyncStorage.setItem(storageKeyDias(profileId), JSON.stringify(stamped));
    setDias(stamped);
    schedulSync();
  }, [profileId, schedulSync]);

  const adicionarItem = useCallback(
    async (data: string, item: Omit<VendaItem, "id" | "hora">) => {
      const diaAtual = dias[data] ?? { itens: [], margem: 0 };
      const novoItem: VendaItem = { ...item, id: gerarId(), hora: new Date().toISOString() };
      await persistirDias(
        { ...dias, [data]: { ...diaAtual, itens: [...diaAtual.itens, novoItem] } },
        data,
      );
    },
    [dias, persistirDias]
  );

  const removerItem = useCallback(
    async (data: string, itemId: string) => {
      const diaAtual = dias[data];
      if (!diaAtual) return;
      await persistirDias(
        { ...dias, [data]: { ...diaAtual, itens: diaAtual.itens.filter((i) => i.id !== itemId) } },
        data,
      );
    },
    [dias, persistirDias]
  );

  const salvarMargemDia = useCallback(
    async (data: string, margem: number) => {
      const diaAtual = dias[data] ?? { itens: [], margem: 0 };
      await persistirDias({ ...dias, [data]: { ...diaAtual, margem } }, data);
    },
    [dias, persistirDias]
  );

  const removerDia = useCallback(
    async (data: string) => {
      const novo = { ...dias };
      delete novo[data];
      // No changedKey since the key is removed — no timestamp needed
      await AsyncStorage.setItem(storageKeyDias(profileId), JSON.stringify(novo));
      setDias(novo);
      schedulSync();
    },
    [dias, profileId, schedulSync]
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
      const now = Date.now();
      const novoTs = { ...configTsRef.current, [mesId]: now };
      configTsRef.current = novoTs;
      await Promise.all([
        AsyncStorage.setItem(storageKeyConfigs(profileId), JSON.stringify(novo)),
        AsyncStorage.setItem(KEY_CONFIG_TS(profileId), JSON.stringify(novoTs)),
      ]);
      setConfigs(novo);
      schedulSync();
    },
    [configs, profileId, schedulSync]
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
    <VendasContext.Provider value={{
      dias, configs, loading, syncStatus, lastSync,
      adicionarItem, removerItem, salvarMargemDia, removerDia,
      getDia, getDiaTotais, getConfigMes, salvarConfigMes, getDiasMes, getTotalMes,
      sincronizarAgora,
    }}>
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
