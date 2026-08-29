import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ConfigMes, DiaVenda, TotaisDia, TotaisMes, VendaItem } from "@/types";
import { useProfile } from "./ProfileContext";

export const CONFIG_MES_PADRAO: ConfigMes = {
  cotaA: { valor: 55000, pares: 410, margem: 0, premio: 150 },
  cotaB: { valor: 65000, pares: 450, margem: 0, premio: 300 },
  cotaC: { valor: 75000, pares: 490, margem: 0, premio: 500 },
  cotaAlta: { valor: 90000, pares: 550, margem: 0, premio: 800 },
  comissaoPadraoPct: 2.5,
};

interface VendasContextValue {
  dias: Record<string, DiaVenda>;
  configs: Record<string, ConfigMes>;
  adicionarItem: (data: string, item: Omit<VendaItem, "id" | "hora">) => Promise<void>;
  removerItem: (data: string, itemId: string) => Promise<void>;
  salvarMargemDia: (data: string, margem: number) => Promise<void>;
  alternarFolgaDia: (data: string) => Promise<void>;
  removerDia: (data: string) => Promise<void>;
  salvarConfigMes: (mesId: string, config: ConfigMes) => Promise<void>;
  getConfigMes: (mesId: string) => ConfigMes;
  getTotalMes: (mesId: string) => TotaisMes;
  getDia: (data: string) => DiaVenda | null;
  getDiaTotais: (data: string) => TotaisDia;
  sincronizarAgora: () => Promise<boolean>;
  getDadosTodasVendedoras: (mesId: string) => Array<{
    perfilId: string;
    nome: string;
    totais: TotaisMes;
    diasMap: Record<string, DiaVenda>;
  }>;
}

const VendasContext = createContext<VendasContextValue | null>(null);

function getStorageKeys(profileId: string) {
  return {
    diasKey: `@diario_vendas:dias_v1_${profileId}`,
    configsKey: `@diario_vendas:configs_v1_${profileId}`,
  };
}

export function VendasProvider({ children }: { children: React.ReactNode }) {
  const {
    perfilAtivo,
    perfis,
    syncCode,
    setIsSyncing,
    setLastSync,
    puxarDadosCloud,
    enviarDadosCloud,
  } = useProfile();

  const [dias, setDias] = useState<Record<string, DiaVenda>>({});
  const [configs, setConfigs] = useState<Record<string, ConfigMes>>({});
  const profileId = perfilAtivo?.id ?? "default";
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load sales and configs for the current profile
  useEffect(() => {
    if (!profileId) return;
    const { diasKey, configsKey } = getStorageKeys(profileId);
    try {
      const storedDias = localStorage.getItem(diasKey);
      const storedConfigs = localStorage.getItem(configsKey);

      setDias(storedDias ? JSON.parse(storedDias) : {});
      setConfigs(storedConfigs ? JSON.parse(storedConfigs) : {});
    } catch (e) {
      console.warn("Error reading local sales data", e);
      setDias({});
      setConfigs({});
    }
  }, [profileId]);

  // Persist dias and trigger cloud sync debounced
  const persistDias = useCallback(
    (newDias: Record<string, DiaVenda>) => {
      setDias(newDias);
      const { diasKey } = getStorageKeys(profileId);
      localStorage.setItem(diasKey, JSON.stringify(newDias));
      triggerAutoSync();
    },
    [profileId]
  );

  // Persist configs and trigger cloud sync debounced
  const persistConfigs = useCallback(
    (newConfigs: Record<string, ConfigMes>) => {
      setConfigs(newConfigs);
      const { configsKey } = getStorageKeys(profileId);
      localStorage.setItem(configsKey, JSON.stringify(newConfigs));
      triggerAutoSync();
    },
    [profileId]
  );

  const sincronizarAgora = useCallback(async (): Promise<boolean> => {
    if (!syncCode) return false;
    setIsSyncing(true);
    try {
      // 1. Gather all local data across all profiles
      const allProfilesPayload = perfis.map((p) => ({
        profileId: p.id,
        nome: p.nome,
      }));

      const allDiasPayload: Array<{
        profileId: string;
        data: string;
        itensJson: string;
        margem: string;
      }> = [];

      const allConfigsPayload: Array<{
        profileId: string;
        mesId: string;
        configJson: string;
      }> = [];

      for (const p of perfis) {
        const { diasKey, configsKey } = getStorageKeys(p.id);
        const storedD = localStorage.getItem(diasKey);
        const storedC = localStorage.getItem(configsKey);

        if (storedD) {
          try {
            const parsed = JSON.parse(storedD);
            Object.entries(parsed).forEach(([data, dia]: [string, any]) => {
              allDiasPayload.push({
                profileId: p.id,
                data,
                itensJson: JSON.stringify({
                  itens: dia.itens || [],
                  folga: Boolean(dia.folga),
                }),
                margem: String(dia.margem ?? "0"),
              });
            });
          } catch {}
        }

        if (storedC) {
          try {
            const parsed = JSON.parse(storedC);
            Object.entries(parsed).forEach(([mesId, cfg]: [string, any]) => {
              allConfigsPayload.push({
                profileId: p.id,
                mesId,
                configJson: JSON.stringify(cfg),
              });
            });
          } catch {}
        }
      }

      // 2. Push local data to cloud
      await enviarDadosCloud(syncCode, {
        profiles: allProfilesPayload,
        dias: allDiasPayload,
        configs: allConfigsPayload,
      });

      // 3. Pull latest data from cloud to merge
      const cloud = await puxarDadosCloud(syncCode);
      if (cloud) {
        // Merge cloud dias for active profile
        const cloudDiasForCurrent: Record<string, DiaVenda> = {};
        if (Array.isArray(cloud.dias)) {
          cloud.dias.forEach((d: any) => {
            if (d.profileId === profileId) {
              try {
                let parsedItens = [];
                let parsedFolga = false;
                if (typeof d.itensJson === "string") {
                  const obj = JSON.parse(d.itensJson);
                  if (Array.isArray(obj)) {
                    parsedItens = obj;
                  } else if (obj && typeof obj === "object") {
                    parsedItens = obj.itens || [];
                    parsedFolga = Boolean(obj.folga);
                  }
                } else if (Array.isArray(d.itensJson)) {
                  parsedItens = d.itensJson;
                }

                cloudDiasForCurrent[d.data] = {
                  itens: parsedItens,
                  margem: parseFloat(d.margem) || 0,
                  folga: parsedFolga,
                };
              } catch {}
            }
          });
        }

        const mergedDias = { ...dias, ...cloudDiasForCurrent };
        setDias(mergedDias);
        const { diasKey } = getStorageKeys(profileId);
        localStorage.setItem(diasKey, JSON.stringify(mergedDias));

        // Merge cloud configs for active profile
        const cloudConfigsForCurrent: Record<string, ConfigMes> = {};
        if (Array.isArray(cloud.configs)) {
          cloud.configs.forEach((c: any) => {
            if (c.profileId === profileId) {
              try {
                cloudConfigsForCurrent[c.mesId] =
                  typeof c.configJson === "string" ? JSON.parse(c.configJson) : c.configJson;
              } catch {}
            }
          });
        }

        const mergedConfigs = { ...configs, ...cloudConfigsForCurrent };
        setConfigs(mergedConfigs);
        const { configsKey } = getStorageKeys(profileId);
        localStorage.setItem(configsKey, JSON.stringify(mergedConfigs));
      }

      const now = new Date();
      setLastSync(now);
      return true;
    } catch (err) {
      console.warn("Sync execution error", err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [
    syncCode,
    perfis,
    profileId,
    dias,
    configs,
    setIsSyncing,
    setLastSync,
    enviarDadosCloud,
    puxarDadosCloud,
  ]);

  const triggerAutoSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      sincronizarAgora();
    }, 2000);
  }, [sincronizarAgora]);

  const adicionarItem = useCallback(
    async (data: string, item: Omit<VendaItem, "id" | "hora">) => {
      const novoItem: VendaItem = {
        id: "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
        valor: item.valor,
        pares: item.pares,
        descricao: item.descricao,
        categoria: item.categoria || "Geral",
        hora: new Date().toISOString(),
      };

      const diaAtual = dias[data] || { itens: [], margem: 0, folga: false };
      const novosItens = [...diaAtual.itens, novoItem];

      const newDias = {
        ...dias,
        [data]: {
          ...diaAtual,
          itens: novosItens,
        },
      };
      persistDias(newDias);
    },
    [dias, persistDias]
  );

  const removerItem = useCallback(
    async (data: string, itemId: string) => {
      const diaAtual = dias[data];
      if (!diaAtual) return;

      const novosItens = diaAtual.itens.filter((i) => i.id !== itemId);
      const newDias = { ...dias };
      if (novosItens.length === 0 && diaAtual.margem === 0 && !diaAtual.folga) {
        delete newDias[data];
      } else {
        newDias[data] = {
          ...diaAtual,
          itens: novosItens,
        };
      }
      persistDias(newDias);
    },
    [dias, persistDias]
  );

  const salvarMargemDia = useCallback(
    async (data: string, margem: number) => {
      const diaAtual = dias[data] || { itens: [], margem: 0, folga: false };
      const newDias = {
        ...dias,
        [data]: {
          ...diaAtual,
          margem,
        },
      };
      persistDias(newDias);
    },
    [dias, persistDias]
  );

  const alternarFolgaDia = useCallback(
    async (data: string) => {
      const diaAtual = dias[data] || { itens: [], margem: 0, folga: false };
      const newFolga = !diaAtual.folga;
      const newDias = {
        ...dias,
        [data]: {
          ...diaAtual,
          folga: newFolga,
        },
      };
      persistDias(newDias);
    },
    [dias, persistDias]
  );

  const removerDia = useCallback(
    async (data: string) => {
      const newDias = { ...dias };
      delete newDias[data];
      persistDias(newDias);
    },
    [dias, persistDias]
  );

  const salvarConfigMes = useCallback(
    async (mesId: string, config: ConfigMes) => {
      const newConfigs = {
        ...configs,
        [mesId]: config,
      };
      persistConfigs(newConfigs);
    },
    [configs, persistConfigs]
  );

  const getConfigMes = useCallback(
    (mesId: string): ConfigMes => {
      return configs[mesId] ?? CONFIG_MES_PADRAO;
    },
    [configs]
  );

  const getDia = useCallback(
    (data: string): DiaVenda | null => {
      return dias[data] ?? null;
    },
    [dias]
  );

  const getDiaTotais = useCallback(
    (data: string): TotaisDia => {
      const dia = dias[data];
      if (!dia || !dia.itens.length) {
        return { valor: 0, pares: 0, qtd: 0 };
      }
      const valor = dia.itens.reduce((acc, item) => acc + item.valor, 0);
      const pares = dia.itens.reduce((acc, item) => acc + item.pares, 0);
      return { valor, pares, qtd: dia.itens.length };
    },
    [dias]
  );

  const getTotalMes = useCallback(
    (mesId: string): TotaisMes => {
      let totalValor = 0;
      let totalPares = 0;
      let totalMargemPonderada = 0;
      let somaPesosValor = 0;
      let diasComVenda = 0;
      let qtdVendas = 0;

      Object.entries(dias).forEach(([data, dia]) => {
        if (data.startsWith(mesId)) {
          const diaValor = dia.itens.reduce((sum, i) => sum + i.valor, 0);
          const diaPares = dia.itens.reduce((sum, i) => sum + i.pares, 0);

          if (dia.itens.length > 0 || diaValor > 0) {
            totalValor += diaValor;
            totalPares += diaPares;
            diasComVenda++;
            qtdVendas += dia.itens.length;

            if (dia.margem > 0 && diaValor > 0) {
              totalMargemPonderada += dia.margem * diaValor;
              somaPesosValor += diaValor;
            }
          }
        }
      });

      const margemMedia = somaPesosValor > 0 ? totalMargemPonderada / somaPesosValor : 0;

      return {
        valor: totalValor,
        pares: totalPares,
        margem: margemMedia,
        dias: diasComVenda,
        qtdVendas,
      };
    },
    [dias]
  );

  // Helper for Store view to aggregate all sellers
  const getDadosTodasVendedoras = useCallback(
    (mesId: string) => {
      return perfis.map((p) => {
        let pDias: Record<string, DiaVenda> = {};
        if (p.id === profileId) {
          pDias = dias;
        } else {
          const { diasKey } = getStorageKeys(p.id);
          try {
            const raw = localStorage.getItem(diasKey);
            pDias = raw ? JSON.parse(raw) : {};
          } catch {}
        }

        let totalValor = 0;
        let totalPares = 0;
        let totalMargemPonderada = 0;
        let somaPesosValor = 0;
        let diasComVenda = 0;
        let qtdVendas = 0;

        Object.entries(pDias).forEach(([data, dia]) => {
          if (data.startsWith(mesId)) {
            const diaValor = (dia.itens || []).reduce((sum, i) => sum + i.valor, 0);
            const diaPares = (dia.itens || []).reduce((sum, i) => sum + i.pares, 0);

            if (dia.itens?.length > 0 || diaValor > 0) {
              totalValor += diaValor;
              totalPares += diaPares;
              diasComVenda++;
              qtdVendas += (dia.itens || []).length;

              if (dia.margem > 0 && diaValor > 0) {
                totalMargemPonderada += dia.margem * diaValor;
                somaPesosValor += diaValor;
              }
            }
          }
        });

        const margemMedia = somaPesosValor > 0 ? totalMargemPonderada / somaPesosValor : 0;

        return {
          perfilId: p.id,
          nome: p.nome,
          totais: {
            valor: totalValor,
            pares: totalPares,
            margem: margemMedia,
            dias: diasComVenda,
            qtdVendas,
          },
          diasMap: pDias,
        };
      });
    },
    [perfis, profileId, dias]
  );

  return (
    <VendasContext.Provider
      value={{
        dias,
        configs,
        adicionarItem,
        removerItem,
        salvarMargemDia,
        alternarFolgaDia,
        removerDia,
        salvarConfigMes,
        getConfigMes,
        getTotalMes,
        getDia,
        getDiaTotais,
        sincronizarAgora,
        getDadosTodasVendedoras,
      }}
    >
      {children}
    </VendasContext.Provider>
  );
}

export function useVendas() {
  const ctx = useContext(VendasContext);
  if (!ctx) throw new Error("useVendas must be used within VendasProvider");
  return ctx;
}
