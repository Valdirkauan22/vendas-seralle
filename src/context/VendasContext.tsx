import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { ConfigMes, DiaVenda, TotaisDia, TotaisMes, VendaItem } from "@/types";
import { useProfile } from "./ProfileContext";
import { useAuth } from "./AuthContext";
import { collection, doc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calcularTotaisDia, calcularTotaisMes, reconciliarDiasVenda, reconciliarConfigsMes } from "@/utils/commercialCalculations";

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
  adicionarItem: (
    data: string,
    item: Omit<VendaItem, "id" | "hora">
  ) => Promise<void>;
  editarItem: (
    data: string,
    itemId: string,
    itemUpdates: Partial<Omit<VendaItem, "id">>
  ) => Promise<void>;
  restaurarItem: (data: string, item: VendaItem) => Promise<void>;
  removerItem: (data: string, itemId: string) => Promise<void>;
  salvarMargemDia: (data: string, margem: number) => Promise<void>;
  salvarAtendimentosDia: (data: string, atendimentos: number) => Promise<void>;
  salvarAnotacoesDia: (data: string, anotacoes: string) => Promise<void>;
  alternarFolgaDia: (data: string) => Promise<void>;
  removerDia: (data: string) => Promise<void>;
  salvarConfigMes: (mesId: string, config: ConfigMes) => Promise<void>;
  getConfigMes: (mesId: string) => ConfigMes;
  getTotalMes: (mesId: string) => TotaisMes;
  getDia: (data: string) => DiaVenda | null;
  getDiaTotais: (data: string) => TotaisDia;
  sincronizarAgora: () => Promise<boolean>;
  restaurarPorCodigo: (codigo: string) => Promise<{ success: boolean; message: string; totalDias: number }>;
  exportarBackup: () => string;
  importarBackup: (jsonContent: string) => Promise<{ success: boolean; message: string; totalDias: number }>;
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
  const { user } = useAuth();
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
  const diasRef = useRef<Record<string, DiaVenda>>({});
  const configsRef = useRef<Record<string, ConfigMes>>({});
  const profileId = user?.uid || perfilAtivo?.id || "default";
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep refs updated in sync with state
  useEffect(() => {
    diasRef.current = dias;
  }, [dias]);

  useEffect(() => {
    configsRef.current = configs;
  }, [configs]);

  // Load sales and configs for current user/profile
  useEffect(() => {
    if (!profileId) return;
    const { diasKey, configsKey } = getStorageKeys(profileId);
    
    // 1. First load from local storage
    try {
      let storedDias = localStorage.getItem(diasKey);
      let storedConfigs = localStorage.getItem(configsKey);

      // Migração de resgate: se o usuário acabou de logar com seu UID e ainda não tem dados nessa chave,
      // mas tinha dados na chave offline/default, herda esses dados para nunca perder o que já anotou!
      if (!storedDias && profileId !== "default") {
        const fallbackDias = localStorage.getItem(getStorageKeys("offline_user").diasKey) ||
                             localStorage.getItem(getStorageKeys("default").diasKey);
        if (fallbackDias) {
          storedDias = fallbackDias;
          localStorage.setItem(diasKey, fallbackDias);
        }
      }

      const initialDias = storedDias ? JSON.parse(storedDias) : {};
      const initialConfigs = storedConfigs ? JSON.parse(storedConfigs) : {};

      setDias(initialDias);
      diasRef.current = initialDias;
      setConfigs(initialConfigs);
      configsRef.current = initialConfigs;
    } catch (e) {
      console.warn("Erro ao ler dados locais", e);
      setDias({});
      diasRef.current = {};
      setConfigs({});
      configsRef.current = {};
    }

    // 2. If user is logged in to Firebase, load their isolated documents from Firestore
    if (user?.uid) {
      const loadFromFirestore = async () => {
        try {
          // Load vendas
          const vendasCol = collection(db, "users", user.uid, "vendas");
          const vendasSnap = await getDocs(vendasCol);
          const firestoreDias: Record<string, DiaVenda> = {};
          vendasSnap.forEach((d) => {
            const data = d.data();
            firestoreDias[d.id] = {
              itens: data.itens || [],
              margem: Number(data.margem) || 0,
              folga: Boolean(data.folga),
              atendimentosTotais: Number(data.atendimentosTotais) || 0,
              anotacoes: data.anotacoes || "",
              updatedAt: data.updatedAt || "",
              deletedAt: data.deletedAt || null,
            };
          });

          // Load configs
          const configCol = collection(db, "users", user.uid, "configMes");
          const configSnap = await getDocs(configCol);
          const firestoreConfigs: Record<string, ConfigMes> = {};
          configSnap.forEach((c) => {
            firestoreConfigs[c.id] = c.data() as ConfigMes;
          });

          const localKeysToPush: string[] = [];

          if (Object.keys(firestoreDias).length > 0) {
            setDias((prev) => {
              // Fusão determinística por carimbo de data/hora (LWW - Last Write Wins por registro)
              const merged: Record<string, DiaVenda> = { ...prev };
              
              Object.entries(firestoreDias).forEach(([dataKey, fDia]) => {
                const existingLocal = merged[dataKey];
                if (!existingLocal) {
                  // Se foi marcado como deletado no Firestore, não restaura
                  if (!fDia.deletedAt) {
                    merged[dataKey] = fDia;
                  }
                } else {
                  const localTime = existingLocal.updatedAt ? new Date(existingLocal.updatedAt).getTime() : 0;
                  const remoteTime = fDia.updatedAt ? new Date(fDia.updatedAt).getTime() : 0;

                  if (remoteTime > localTime) {
                    // Remoto é mais recente
                    if (fDia.deletedAt) {
                      delete merged[dataKey];
                    } else {
                      merged[dataKey] = fDia;
                    }
                  } else if (localTime > remoteTime) {
                    // Local é mais recente: agenda para subir ao Firestore
                    localKeysToPush.push(dataKey);
                  } else {
                    // Timestamps iguais: prioriza remoto consistente
                    merged[dataKey] = fDia;
                  }
                }
              });

              diasRef.current = merged;
              localStorage.setItem(diasKey, JSON.stringify(merged));
              return merged;
            });
          }

          // Se existiam vendas locais mais recentes ou não sincronizadas, sobe para o Firestore
          for (const dKey of localKeysToPush) {
            const dVal = diasRef.current[dKey];
            if (dVal) {
              try {
                const diaDoc = doc(db, "users", user.uid, "vendas", dKey);
                await setDoc(diaDoc, {
                  data: dKey,
                  itens: dVal.itens || [],
                  margem: dVal.margem || 0,
                  folga: Boolean(dVal.folga),
                  atendimentosTotais: dVal.atendimentosTotais || 0,
                  anotacoes: dVal.anotacoes || "",
                  updatedAt: dVal.updatedAt || new Date().toISOString(),
                });
              } catch (uErr) {
                console.warn("Aviso ao sincronizar venda local mais recente:", uErr);
              }
            }
          }

          // Se existiam vendas locais que não estavam na nuvem, sobe para o Firestore agora
          for (const [dKey, dVal] of Object.entries(diasRef.current)) {
            if (!firestoreDias[dKey]) {
              try {
                const nowIso = new Date().toISOString();
                const diaDoc = doc(db, "users", user.uid, "vendas", dKey);
                await setDoc(diaDoc, {
                  data: dKey,
                  itens: dVal.itens || [],
                  margem: dVal.margem || 0,
                  folga: Boolean(dVal.folga),
                  atendimentosTotais: dVal.atendimentosTotais || 0,
                  anotacoes: dVal.anotacoes || "",
                  updatedAt: dVal.updatedAt || nowIso,
                }, { merge: true });
              } catch (uErr) {
                console.warn("Aviso ao sincronizar venda local para Firestore:", uErr);
              }
            }
          }

          if (Object.keys(firestoreConfigs).length > 0) {
            setConfigs((prev) => {
              const { reconciliados } = reconciliarConfigsMes(prev, firestoreConfigs);
              localStorage.setItem(configsKey, JSON.stringify(reconciliados));
              return reconciliados;
            });
          }
        } catch (err) {
          console.warn("Erro ao carregar dados do Firestore:", err);
        }
      };

      loadFromFirestore();
    }
  }, [profileId, user?.uid]);

  // Persist dias locally and to Firestore
  const persistDias = useCallback(
    async (newDias: Record<string, DiaVenda>, updatedData?: string) => {
      const nowIso = new Date().toISOString();
      const updatedDias = { ...newDias };
      if (updatedData && updatedDias[updatedData]) {
        updatedDias[updatedData] = {
          ...updatedDias[updatedData],
          updatedAt: nowIso,
          deletedAt: null,
        };
      }

      diasRef.current = updatedDias;
      const { diasKey } = getStorageKeys(profileId);
      localStorage.setItem(diasKey, JSON.stringify(updatedDias));

      // Save to Firebase Firestore if logged in
      if (user?.uid && updatedData) {
        try {
          const diaDoc = doc(db, "users", user.uid, "vendas", updatedData);
          const diaContent = updatedDias[updatedData];
          if (diaContent) {
            await setDoc(diaDoc, {
              data: updatedData,
              itens: diaContent.itens,
              margem: diaContent.margem,
              folga: Boolean(diaContent.folga),
              atendimentosTotais: diaContent.atendimentosTotais || 0,
              anotacoes: diaContent.anotacoes || "",
              updatedAt: nowIso,
              deletedAt: null,
            });
          } else {
            // Tombstone no Firestore para impedir que máquinas antigas ressuscitem a venda excluída
            await setDoc(diaDoc, {
              data: updatedData,
              itens: [],
              margem: 0,
              folga: false,
              deletedAt: nowIso,
              updatedAt: nowIso,
            });
          }
        } catch (err) {
          console.warn("Erro ao persistir venda no Firestore:", err);
        }
      }

      triggerAutoSync();
    },
    [profileId, user?.uid]
  );

  // Persist configs locally and to Firestore
  const persistConfigs = useCallback(
    async (newConfigs: Record<string, ConfigMes>, updatedMesId?: string) => {
      const nowIso = new Date().toISOString();
      const updatedConfigs = { ...newConfigs };
      if (updatedMesId && updatedConfigs[updatedMesId]) {
        updatedConfigs[updatedMesId] = {
          ...updatedConfigs[updatedMesId],
          updatedAt: nowIso,
        };
      }

      setConfigs(updatedConfigs);
      const { configsKey } = getStorageKeys(profileId);
      localStorage.setItem(configsKey, JSON.stringify(updatedConfigs));

      // Save to Firebase Firestore if logged in
      if (user?.uid && updatedMesId) {
        try {
          const cfgDoc = doc(db, "users", user.uid, "configMes", updatedMesId);
          await setDoc(cfgDoc, updatedConfigs[updatedMesId]);
        } catch (err) {
          console.warn("Erro ao persistir cota no Firestore:", err);
        }
      }

      triggerAutoSync();
    },
    [profileId, user?.uid]
  );

  const sincronizarAgora = useCallback(async (): Promise<boolean> => {
    if (!syncCode) return false;
    setIsSyncing(true);
    try {
      // 1. PULL & RECONCILIAÇÃO PRIMEIRO:
      // Busca dados mais recentes da nuvem ANTES de enviar qualquer dado local.
      // Isso elimina o risco de um celular com dados desatualizados sobrescrever alterações mais novas feitas por outro aparelho.
      const cloud = await puxarDadosCloud(syncCode);
      let configsReconciliadas: Record<string, ConfigMes> = { ...(configsRef.current || configs) };

      if (cloud) {
        let cloudDiasForCurrent: Record<string, DiaVenda> = {};
        if (cloud.perfisData?.[profileId]?.dias) {
          cloudDiasForCurrent = cloud.perfisData[profileId].dias;
        } else if (Array.isArray(cloud.dias)) {
          cloud.dias.forEach((d: any) => {
            if (d.profileId === profileId) {
              try {
                let parsedItens = [];
                let parsedFolga = false;
                let parsedAtend = 0;
                let parsedAnot = "";
                let parsedUpdatedAt: string | undefined = undefined;
                let parsedDeletedAt: string | null = null;
                if (typeof d.itensJson === "string") {
                  const obj = JSON.parse(d.itensJson);
                  if (Array.isArray(obj)) {
                    parsedItens = obj;
                  } else if (obj && typeof obj === "object") {
                    parsedItens = obj.itens || [];
                    parsedFolga = Boolean(obj.folga);
                    parsedAtend = obj.atendimentosTotais || 0;
                    parsedAnot = obj.anotacoes || "";
                    parsedUpdatedAt = obj.updatedAt;
                    parsedDeletedAt = obj.deletedAt || null;
                  }
                } else if (Array.isArray(d.itensJson)) {
                  parsedItens = d.itensJson;
                }

                cloudDiasForCurrent[d.data] = {
                  itens: parsedItens,
                  margem: parseFloat(d.margem) || 0,
                  folga: parsedFolga,
                  atendimentosTotais: parsedAtend,
                  anotacoes: parsedAnot,
                  updatedAt: parsedUpdatedAt || d.updatedAt,
                  deletedAt: parsedDeletedAt,
                };
              } catch {}
            }
          });
        }

        // Reconciliação robusta LWW (Last-Write-Wins) com preservação de registros mais novos
        const { reconciliados } = reconciliarDiasVenda(diasRef.current, cloudDiasForCurrent);
        setDias(reconciliados);
        diasRef.current = reconciliados;
        const { diasKey } = getStorageKeys(profileId);
        localStorage.setItem(diasKey, JSON.stringify(reconciliados));

        let cloudConfigsForCurrent: Record<string, ConfigMes> = {};
        if (cloud.perfisData?.[profileId]?.configs) {
          cloudConfigsForCurrent = cloud.perfisData[profileId].configs;
        } else if (Array.isArray(cloud.configs)) {
          cloud.configs.forEach((c: any) => {
            if (c.profileId === profileId) {
              try {
                cloudConfigsForCurrent[c.mesId] =
                  typeof c.configJson === "string" ? JSON.parse(c.configJson) : c.configJson;
              } catch {}
            }
          });
        }

        const { reconciliados: mergedConfigs } = reconciliarConfigsMes(configsRef.current || configs, cloudConfigsForCurrent);
        configsReconciliadas = mergedConfigs;
        setConfigs(mergedConfigs);
        configsRef.current = mergedConfigs;
        const { configsKey } = getStorageKeys(profileId);
        localStorage.setItem(configsKey, JSON.stringify(mergedConfigs));

        // Reconcilia também dados de outros perfis se vierem no pacote da nuvem
        if (Array.isArray(cloud.profiles)) {
          cloud.profiles.forEach((cp: any) => {
            if (cp.profileId && cp.profileId !== profileId) {
              const otherDaysFromCloud: Record<string, DiaVenda> = {};
              if (Array.isArray(cloud.dias)) {
                cloud.dias.forEach((d: any) => {
                  if (d.profileId === cp.profileId) {
                    try {
                      let parsedItens = [];
                      let parsedFolga = false;
                      let parsedAtend = 0;
                      let parsedAnot = "";
                      let parsedUpdatedAt: string | undefined = undefined;
                      let parsedDeletedAt: string | null = null;
                      if (typeof d.itensJson === "string") {
                        const obj = JSON.parse(d.itensJson);
                        if (Array.isArray(obj)) {
                          parsedItens = obj;
                        } else if (obj && typeof obj === "object") {
                          parsedItens = obj.itens || [];
                          parsedFolga = Boolean(obj.folga);
                          parsedAtend = obj.atendimentosTotais || 0;
                          parsedAnot = obj.anotacoes || "";
                          parsedUpdatedAt = obj.updatedAt;
                          parsedDeletedAt = obj.deletedAt || null;
                        }
                      } else if (Array.isArray(d.itensJson)) {
                        parsedItens = d.itensJson;
                      }
                      otherDaysFromCloud[d.data] = {
                        itens: parsedItens,
                        margem: parseFloat(d.margem) || 0,
                        folga: parsedFolga,
                        atendimentosTotais: parsedAtend,
                        anotacoes: parsedAnot,
                        updatedAt: parsedUpdatedAt || d.updatedAt,
                        deletedAt: parsedDeletedAt,
                      };
                    } catch {}
                  }
                });
              }

              const otherKeys = getStorageKeys(cp.profileId);
              const otherLocalStored = localStorage.getItem(otherKeys.diasKey);
              let otherLocalDays: Record<string, DiaVenda> = {};
              if (otherLocalStored) {
                try {
                  otherLocalDays = JSON.parse(otherLocalStored);
                } catch {}
              }
              const { reconciliados: otherReconciled } = reconciliarDiasVenda(otherLocalDays, otherDaysFromCloud);
              localStorage.setItem(otherKeys.diasKey, JSON.stringify(otherReconciled));
            }
          });
        }
      }

      // 2. MONTAGEM DO PAYLOAD CONVERGIDO E RECONCILIADO:
      // Agora que tudo foi reconciliado (nuvem + local), construímos o pacote para salvar.
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

      // Inclui todos os perfis armazenados
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
                  atendimentosTotais: dia.atendimentosTotais || 0,
                  anotacoes: dia.anotacoes || "",
                  updatedAt: dia.updatedAt || new Date().toISOString(),
                  deletedAt: dia.deletedAt || null,
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

      // Garante que o estado atual em memória (reconciliado) também esteja presente no payload
      Object.entries(diasRef.current).forEach(([data, dia]) => {
        const jaExisteIndex = allDiasPayload.findIndex((d) => d.profileId === profileId && d.data === data);
        const diaItem = {
          profileId,
          data,
          itensJson: JSON.stringify({
            itens: dia.itens || [],
            folga: Boolean(dia.folga),
            atendimentosTotais: dia.atendimentosTotais || 0,
            anotacoes: dia.anotacoes || "",
            updatedAt: dia.updatedAt || new Date().toISOString(),
            deletedAt: dia.deletedAt || null,
          }),
          margem: String(dia.margem ?? "0"),
        };
        if (jaExisteIndex >= 0) {
          allDiasPayload[jaExisteIndex] = diaItem;
        } else {
          allDiasPayload.push(diaItem);
        }
      });

      // Garante que o estado atual reconciliado de configs também esteja presente no payload
      Object.entries(configsReconciliadas).forEach(([mesId, cfg]) => {
        const jaExisteIndex = allConfigsPayload.findIndex((c) => c.profileId === profileId && c.mesId === mesId);
        const cfgItem = {
          profileId,
          mesId,
          configJson: JSON.stringify(cfg),
        };
        if (jaExisteIndex >= 0) {
          allConfigsPayload[jaExisteIndex] = cfgItem;
        } else {
          allConfigsPayload.push(cfgItem);
        }
      });

      // 3. SE LOGADO, GRAVA DADOS RECONCILIADOS NO FIRESTORE DO USUÁRIO
      if (user?.uid) {
        try {
          for (const [dataKey, diaVal] of Object.entries(diasRef.current)) {
            const diaDoc = doc(db, "users", user.uid, "vendas", dataKey);
            await setDoc(
              diaDoc,
              {
                data: dataKey,
                itens: diaVal.itens || [],
                margem: diaVal.margem || 0,
                folga: Boolean(diaVal.folga),
                atendimentosTotais: diaVal.atendimentosTotais || 0,
                anotacoes: diaVal.anotacoes || "",
                updatedAt: diaVal.updatedAt || new Date().toISOString(),
                deletedAt: diaVal.deletedAt || null,
              },
              { merge: true }
            );
          }

          for (const [mesKey, cfgVal] of Object.entries(configsReconciliadas)) {
            const cfgDoc = doc(db, "users", user.uid, "configMes", mesKey);
            await setDoc(cfgDoc, cfgVal, { merge: true });
          }

          await setDoc(
            doc(db, "users", user.uid),
            { syncCode, lastSync: new Date().toISOString() },
            { merge: true }
          );
        } catch (cloudErr) {
          console.warn("Aviso ao salvar vendas no Firestore do usuário:", cloudErr);
        }
      }

      // 4. PUSH DOS DADOS RECONCILIADOS PARA A NUVEM PERSISTENTE
      await enviarDadosCloud(syncCode, {
        profiles: allProfilesPayload,
        dias: allDiasPayload,
        configs: allConfigsPayload,
        perfisData: {
          [profileId]: {
            profileId,
            nome: perfilAtivo?.nome || "Vendedora",
            dias: diasRef.current,
            configs: configsReconciliadas,
          },
        },
      });

      const now = new Date();
      setLastSync(now);

      // Notificação de tranquilidade para a vendedora
      window.dispatchEvent(
        new CustomEvent("seralle-notification", {
          detail: {
            title: "Vendas Sincronizadas na Nuvem!",
            body: `Seus lançamentos estão gravados com total segurança. Código de Restauração: ${syncCode}`,
            type: "geral",
          },
        })
      );

      return true;
    } catch (err) {
      console.warn("Erro durante sincronização:", err);
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [
    syncCode,
    perfis,
    profileId,
    configs,
    perfilAtivo?.nome,
    setIsSyncing,
    setLastSync,
    enviarDadosCloud,
    puxarDadosCloud,
    user?.uid,
  ]);

  const restaurarPorCodigo = useCallback(
    async (codigo: string): Promise<{ success: boolean; message: string; totalDias: number }> => {
      const formatted = (codigo || "").trim().toUpperCase();
      if (!formatted) {
        return {
          success: false,
          message: "Informe um código de sincronização válido.",
          totalDias: 0,
        };
      }

      setIsSyncing(true);
      try {
        const cloudData = await puxarDadosCloud(formatted);
        if (!cloudData) {
          return {
            success: false,
            message: `Nenhum dado encontrado para o código "${formatted}". Verifique se digitou corretamente.`,
            totalDias: 0,
          };
        }

        let diasToMerge: Record<string, DiaVenda> = {};
        let configsToMerge: Record<string, ConfigMes> = {};

        if (cloudData.perfisData?.[profileId]?.dias) {
          diasToMerge = cloudData.perfisData[profileId].dias;
          configsToMerge = cloudData.perfisData[profileId].configs || {};
        } else if (Array.isArray(cloudData.dias)) {
          // Extrai dias da vendedora correta ou se só houver uma
          const targetProfileId =
            cloudData.profiles?.find((p: any) => p.profileId === profileId)?.profileId ||
            (cloudData.profiles?.length === 1 ? cloudData.profiles[0].profileId : profileId);

          cloudData.dias.forEach((d: any) => {
            if (d.profileId === targetProfileId || !d.profileId) {
              try {
                let parsedItens = [];
                let parsedFolga = false;
                let parsedAtend = 0;
                let parsedAnot = "";
                let parsedUpdatedAt: string | undefined = undefined;
                let parsedDeletedAt: string | null = null;
                if (typeof d.itensJson === "string") {
                  const obj = JSON.parse(d.itensJson);
                  if (Array.isArray(obj)) {
                    parsedItens = obj;
                  } else if (obj && typeof obj === "object") {
                    parsedItens = obj.itens || [];
                    parsedFolga = Boolean(obj.folga);
                    parsedAtend = obj.atendimentosTotais || 0;
                    parsedAnot = obj.anotacoes || "";
                    parsedUpdatedAt = obj.updatedAt;
                    parsedDeletedAt = obj.deletedAt || null;
                  }
                } else if (Array.isArray(d.itensJson)) {
                  parsedItens = d.itensJson;
                }

                diasToMerge[d.data] = {
                  itens: parsedItens,
                  margem: parseFloat(d.margem) || 0,
                  folga: parsedFolga,
                  atendimentosTotais: parsedAtend,
                  anotacoes: parsedAnot,
                  updatedAt: parsedUpdatedAt || d.updatedAt,
                  deletedAt: parsedDeletedAt,
                };
              } catch {}
            }
          });
        }

        if (cloudData.perfisData?.[profileId]?.configs) {
          configsToMerge = cloudData.perfisData[profileId].configs;
        } else if (Array.isArray(cloudData.configs)) {
          cloudData.configs.forEach((c: any) => {
            try {
              configsToMerge[c.mesId] =
                typeof c.configJson === "string" ? JSON.parse(c.configJson) : c.configJson;
            } catch {}
          });
        }

        const totalDias = Object.keys(diasToMerge).length;
        if (totalDias === 0 && Object.keys(configsToMerge).length === 0) {
          return {
            success: false,
            message: `O código "${formatted}" existe na nuvem, mas ainda não possui vendas cadastradas.`,
            totalDias: 0,
          };
        }

        // Fusão com garantia LWW por registro
        const { reconciliados } = reconciliarDiasVenda(diasRef.current, diasToMerge);
        const { reconciliados: mergedConfigs } = reconciliarConfigsMes(configs, configsToMerge);

        setDias(reconciliados);
        diasRef.current = reconciliados;
        setConfigs(mergedConfigs);

        // Salva nas chaves do perfil atual
        const { diasKey, configsKey } = getStorageKeys(profileId);
        localStorage.setItem(diasKey, JSON.stringify(reconciliados));
        localStorage.setItem(configsKey, JSON.stringify(mergedConfigs));

        // Se logado no Firebase, grava no banco de dados do usuário
        if (user?.uid) {
          try {
            for (const [dataKey, val] of Object.entries(reconciliados)) {
              const diaVal = val as DiaVenda;
              const diaDoc = doc(db, "users", user.uid, "vendas", dataKey);
              await setDoc(
                diaDoc,
                {
                  data: dataKey,
                  itens: diaVal.itens || [],
                  margem: diaVal.margem || 0,
                  folga: Boolean(diaVal.folga),
                  atendimentosTotais: diaVal.atendimentosTotais || 0,
                  anotacoes: diaVal.anotacoes || "",
                  updatedAt: diaVal.updatedAt || new Date().toISOString(),
                  deletedAt: diaVal.deletedAt || null,
                },
                { merge: true }
              );
            }

            for (const [mesKey, cfgVal] of Object.entries(mergedConfigs)) {
              const cfgDoc = doc(db, "users", user.uid, "configMes", mesKey);
              await setDoc(cfgDoc, cfgVal, { merge: true });
            }
          } catch (uErr) {
            console.warn("Aviso ao persistir dados restaurados no Firestore:", uErr);
          }
        }

        setLastSync(new Date());
        return {
          success: true,
          message: `Restauração realizada com sucesso! ${totalDias} dias de lançamentos recuperados.`,
          totalDias,
        };
      } catch (err: any) {
        console.error("Erro ao restaurar por código:", err);
        return {
          success: false,
          message: `Falha ao restaurar dados: ${err.message || "Erro desconhecido"}`,
          totalDias: 0,
        };
      } finally {
        setIsSyncing(false);
      }
    },
    [puxarDadosCloud, configs, profileId, user?.uid, setIsSyncing, setLastSync]
  );

  const triggerAutoSync = useCallback(() => {
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      sincronizarAgora();
    }, 2500);
  }, [sincronizarAgora]);

  const adicionarItem = useCallback(
    async (data: string, item: Omit<VendaItem, "id" | "hora">) => {
      const novoItem: VendaItem = {
        id: "v_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7),
        valor: Number(item.valor) || 0,
        pares: Number(item.pares) || 1,
        produtosAgregados: Number(item.produtosAgregados) || 0,
        descricao: item.descricao || "",
        categoria: item.categoria || "Geral",
        hora: new Date().toISOString(),
      };

      const currentDias = diasRef.current;
      const diaAtual = currentDias[data] || { itens: [], margem: 0, folga: false };
      const novosItens = [...(diaAtual.itens || []), novoItem];

      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          itens: novosItens,
        },
      };

      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const editarItem = useCallback(
    async (
      data: string,
      itemId: string,
      itemUpdates: Partial<Omit<VendaItem, "id">>
    ) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data];
      if (!diaAtual || !diaAtual.itens) return;

      const novosItens = diaAtual.itens.map((it) => {
        if (it.id !== itemId) return it;
        return {
          ...it,
          valor: itemUpdates.valor !== undefined ? Number(itemUpdates.valor) : it.valor,
          pares: itemUpdates.pares !== undefined ? Number(itemUpdates.pares) : it.pares,
          produtosAgregados: itemUpdates.produtosAgregados !== undefined ? Number(itemUpdates.produtosAgregados) : it.produtosAgregados,
          descricao: itemUpdates.descricao !== undefined ? itemUpdates.descricao : it.descricao,
          categoria: itemUpdates.categoria !== undefined ? itemUpdates.categoria : it.categoria,
        };
      });

      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          itens: novosItens,
        },
      };

      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const restaurarItem = useCallback(
    async (data: string, item: VendaItem) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data] || { itens: [], margem: 0, folga: false };
      const novosItens = [...(diaAtual.itens || []), item];

      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          itens: novosItens,
        },
      };

      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const removerItem = useCallback(
    async (data: string, itemId: string) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data];
      if (!diaAtual) return;

      const novosItens = (diaAtual.itens || []).filter((i) => i.id !== itemId);
      const newDias = { ...currentDias };
      if (novosItens.length === 0 && diaAtual.margem === 0 && !diaAtual.folga && !diaAtual.anotacoes && !diaAtual.atendimentosTotais) {
        delete newDias[data];
      } else {
        newDias[data] = {
          ...diaAtual,
          itens: novosItens,
        };
      }
      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const salvarMargemDia = useCallback(
    async (data: string, margem: number) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data] || { itens: [], margem: 0, folga: false };
      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          margem,
        },
      };
      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const salvarAtendimentosDia = useCallback(
    async (data: string, atendimentos: number) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data] || { itens: [], margem: 0, folga: false };
      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          atendimentosTotais: Math.max(0, atendimentos),
        },
      };
      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const salvarAnotacoesDia = useCallback(
    async (data: string, anotacoes: string) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data] || { itens: [], margem: 0, folga: false };
      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          anotacoes,
        },
      };
      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const alternarFolgaDia = useCallback(
    async (data: string) => {
      const currentDias = diasRef.current;
      const diaAtual = currentDias[data] || { itens: [], margem: 0, folga: false };
      const newFolga = !diaAtual.folga;
      const newDias = {
        ...currentDias,
        [data]: {
          ...diaAtual,
          folga: newFolga,
        },
      };
      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const removerDia = useCallback(
    async (data: string) => {
      const currentDias = diasRef.current;
      const newDias = { ...currentDias };
      delete newDias[data];
      setDias(newDias);
      await persistDias(newDias, data);
    },
    [persistDias]
  );

  const salvarConfigMes = useCallback(
    async (mesId: string, config: ConfigMes) => {
      const newConfigs = {
        ...configs,
        [mesId]: config,
      };
      await persistConfigs(newConfigs, mesId);
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
      const res = calcularTotaisDia(dia);
      return {
        valor: res.valor,
        pares: res.pares,
        qtd: res.qtdVendas,
        produtosAgregados: res.produtosAgregados,
        atendimentosTotais: dia?.atendimentosTotais || res.qtdVendas,
        pa: res.pa,
        taxaConversao: res.taxaConversao,
      };
    },
    [dias]
  );

  const getTotalMes = useCallback(
    (mesId: string): TotaisMes => {
      return calcularTotaisMes(dias, mesId);
    },
    [dias]
  );

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
        let totalAgregados = 0;
        let totalAtendimentos = 0;
        let totalMargemPonderada = 0;
        let somaPesosValor = 0;
        let diasComVenda = 0;
        let qtdVendas = 0;

        Object.entries(pDias).forEach(([data, dia]) => {
          if (data.startsWith(mesId)) {
            const diaValor = (dia.itens || []).reduce((sum, i) => sum + i.valor, 0);
            const diaPares = (dia.itens || []).reduce((sum, i) => sum + i.pares, 0);
            const diaAgregados = (dia.itens || []).reduce(
              (sum, i) => sum + (i.produtosAgregados || 0),
              0
            );

            if (dia.itens?.length > 0 || diaValor > 0) {
              totalValor += diaValor;
              totalPares += diaPares;
              totalAgregados += diaAgregados;
              diasComVenda++;
              qtdVendas += (dia.itens || []).length;
              totalAtendimentos += dia.atendimentosTotais || (dia.itens || []).length;

              if (dia.margem > 0 && diaValor > 0) {
                totalMargemPonderada += dia.margem * diaValor;
                somaPesosValor += diaValor;
              }
            }
          }
        });

        const margemMedia =
          somaPesosValor > 0 ? totalMargemPonderada / somaPesosValor : 0;
        const totalPecas = totalPares + totalAgregados;
        const paMedio = qtdVendas > 0 ? totalPecas / qtdVendas : 0;
        const taxaConversao =
          totalAtendimentos > 0
            ? Math.min(100, (qtdVendas / totalAtendimentos) * 100)
            : 100;

        return {
          perfilId: p.id,
          nome: p.nome,
          totais: {
            valor: totalValor,
            pares: totalPares,
            margem: margemMedia,
            dias: diasComVenda,
            qtdVendas,
            produtosAgregados: totalAgregados,
            atendimentosTotais: totalAtendimentos,
            paMedio,
            taxaConversao,
          },
          diasMap: pDias,
        };
      });
    },
    [perfis, profileId, dias]
  );

  // ─── Exportar Backup Completo ────────────────────────────────────────────────
  const exportarBackup = useCallback((): string => {
    const backupData = {
      app: "vendas-seralle",
      versao: "1.1.0",
      dataCriacao: new Date().toISOString(),
      profileId,
      perfilNome: perfilAtivo?.nome || "Vendedora",
      perfis,
      dias: diasRef.current,
      configs,
    };
    return JSON.stringify(backupData, null, 2);
  }, [profileId, perfilAtivo, perfis, configs]);

  // ─── Importar & Restaurar Backup ──────────────────────────────────────────────
  const importarBackup = useCallback(
    async (jsonContent: string): Promise<{ success: boolean; message: string; totalDias: number }> => {
      try {
        const parsed = JSON.parse(jsonContent);

        // Validação básica do arquivo de backup
        if (!parsed || typeof parsed !== "object" || (!parsed.dias && !parsed.configs)) {
          return {
            success: false,
            message: "Arquivo de backup inválido ou corrompido.",
            totalDias: 0,
          };
        }

        const backupDias: Record<string, DiaVenda> = parsed.dias || {};
        const backupConfigs: Record<string, ConfigMes> = parsed.configs || {};

        // Mesclar de forma segura com o estado atual
        const mergedDias: Record<string, DiaVenda> = { ...diasRef.current };
        Object.entries(backupDias).forEach(([dataKey, bDia]) => {
          const existing = mergedDias[dataKey];
          if (!existing) {
            mergedDias[dataKey] = bDia;
          } else {
            // Unir itens mantendo integridade
            const itemMap = new Map<string, VendaItem>();
            (bDia.itens || []).forEach((it) => it.id && itemMap.set(it.id, it));
            (existing.itens || []).forEach((it) => it.id && itemMap.set(it.id, it));

            mergedDias[dataKey] = {
              ...existing,
              itens: Array.from(itemMap.values()),
              margem: existing.margem > 0 ? existing.margem : bDia.margem,
              folga: existing.folga || bDia.folga,
              atendimentosTotais: Math.max(existing.atendimentosTotais || 0, bDia.atendimentosTotais || 0),
              anotacoes: existing.anotacoes || bDia.anotacoes || "",
            };
          }
        });

        const mergedConfigs: Record<string, ConfigMes> = {
          ...backupConfigs,
          ...configs,
        };

        // Salvar localmente
        const { diasKey, configsKey } = getStorageKeys(profileId);
        localStorage.setItem(diasKey, JSON.stringify(mergedDias));
        localStorage.setItem(configsKey, JSON.stringify(mergedConfigs));

        setDias(mergedDias);
        diasRef.current = mergedDias;
        setConfigs(mergedConfigs);

        // Se logado no Firebase, sobe os dados restaurados para a nuvem
        if (user?.uid) {
          try {
            for (const [dataKey, diaVal] of Object.entries(mergedDias)) {
              const diaDoc = doc(db, "users", user.uid, "vendas", dataKey);
              await setDoc(
                diaDoc,
                {
                  data: dataKey,
                  itens: diaVal.itens,
                  margem: diaVal.margem,
                  folga: Boolean(diaVal.folga),
                  atendimentosTotais: diaVal.atendimentosTotais || 0,
                  anotacoes: diaVal.anotacoes || "",
                  updatedAt: new Date().toISOString(),
                },
                { merge: true }
              );
            }

            for (const [mesKey, cfgVal] of Object.entries(mergedConfigs)) {
              const cfgDoc = doc(db, "users", user.uid, "configMes", mesKey);
              await setDoc(cfgDoc, cfgVal, { merge: true });
            }
          } catch (cloudErr) {
            console.warn("Aviso ao enviar backup restaurado para nuvem:", cloudErr);
          }
        }

        const totalDiasImportados = Object.keys(mergedDias).length;
        return {
          success: true,
          message: `Backup restaurado com sucesso! ${totalDiasImportados} dias de lançamentos carregados.`,
          totalDias: totalDiasImportados,
        };
      } catch (err: any) {
        console.error("Erro na restauração do backup:", err);
        return {
          success: false,
          message: `Erro ao processar arquivo: ${err.message || "Formato JSON inválido."}`,
          totalDias: 0,
        };
      }
    },
    [profileId, user?.uid, configs]
  );

  return (
    <VendasContext.Provider
      value={{
        dias,
        configs,
        adicionarItem,
        editarItem,
        restaurarItem,
        removerItem,
        salvarMargemDia,
        salvarAtendimentosDia,
        salvarAnotacoesDia,
        alternarFolgaDia,
        removerDia,
        salvarConfigMes,
        getConfigMes,
        getTotalMes,
        getDia,
        getDiaTotais,
        sincronizarAgora,
        restaurarPorCodigo,
        exportarBackup,
        importarBackup,
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
