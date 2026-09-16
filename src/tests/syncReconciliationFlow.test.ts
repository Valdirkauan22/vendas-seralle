import { describe, it, expect } from "vitest";
import {
  reconciliarDiasVenda,
  reconciliarConfigsMes,
} from "../utils/commercialCalculations";
import { DiaVenda, ConfigMes } from "../types";

/**
 * Função utilitária que replica fielmente o algoritmo exato de montagem
 * e reconciliação executado dentro de sincronizarAgora() no VendasContext.
 */
function simularSincronizarAgora({
  profileId,
  syncCode,
  localDias,
  localConfigs,
  cloudPayload,
}: {
  profileId: string;
  syncCode: string;
  localDias: Record<string, DiaVenda>;
  localConfigs: Record<string, ConfigMes>;
  cloudPayload: any;
}) {
  // 1. Pull & Reconciliação
  let cloudDiasForCurrent: Record<string, DiaVenda> = {};
  if (cloudPayload?.perfisData?.[profileId]?.dias) {
    cloudDiasForCurrent = cloudPayload.perfisData[profileId].dias;
  } else if (Array.isArray(cloudPayload?.dias)) {
    cloudPayload.dias.forEach((d: any) => {
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

  // Reconciliação LWW de Vendas
  const { reconciliados: diasReconciliados } = reconciliarDiasVenda(localDias, cloudDiasForCurrent);

  let cloudConfigsForCurrent: Record<string, ConfigMes> = {};
  if (cloudPayload?.perfisData?.[profileId]?.configs) {
    cloudConfigsForCurrent = cloudPayload.perfisData[profileId].configs;
  } else if (Array.isArray(cloudPayload?.configs)) {
    cloudPayload.configs.forEach((c: any) => {
      if (c.profileId === profileId) {
        try {
          cloudConfigsForCurrent[c.mesId] =
            typeof c.configJson === "string" ? JSON.parse(c.configJson) : c.configJson;
        } catch {}
      }
    });
  }

  // Reconciliação LWW de Configurações
  const { reconciliados: configsReconciliadas } = reconciliarConfigsMes(localConfigs, cloudConfigsForCurrent);

  // 2. Montagem do payload de upload convergido
  const allProfilesPayload = [{ profileId, nome: "Vendedora Teste" }];
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

  // Adiciona dias reconciliados
  Object.entries(diasReconciliados).forEach(([data, dia]) => {
    allDiasPayload.push({
      profileId,
      data,
      itensJson: JSON.stringify({
        itens: dia.itens || [],
        folga: Boolean(dia.folga),
        atendimentosTotais: dia.atendimentosTotais || 0,
        anotacoes: dia.anotacoes || "",
        updatedAt: dia.updatedAt,
        deletedAt: dia.deletedAt || null,
      }),
      margem: String(dia.margem ?? "0"),
    });
  });

  // Adiciona configs reconciliadas
  Object.entries(configsReconciliadas).forEach(([mesId, cfg]) => {
    allConfigsPayload.push({
      profileId,
      mesId,
      configJson: JSON.stringify(cfg),
    });
  });

  // Simulação das gravações no Firestore do usuário
  const firestoreWrites = {
    vendas: { ...diasReconciliados },
    configMes: { ...configsReconciliadas },
  };

  // Payload final enviado para a nuvem persistente
  const finalCloudUploadPayload = {
    profiles: allProfilesPayload,
    dias: allDiasPayload,
    configs: allConfigsPayload,
    perfisData: {
      [profileId]: {
        profileId,
        nome: "Vendedora Teste",
        dias: diasReconciliados,
        configs: configsReconciliadas,
      },
    },
  };

  return {
    diasReconciliados,
    configsReconciliadas,
    firestoreWrites,
    finalCloudUploadPayload,
  };
}

describe("Fluxo Completo de Sincronização e Prevenção de Sobrescrita (Pull-First & LWW)", () => {
  const configPadrao: ConfigMes = {
    cotaC: { valor: 20000, pares: 100, margem: 40 },
    cotaB: { valor: 30000, pares: 150, margem: 42 },
    cotaA: { valor: 40000, pares: 200, margem: 45 },
    cotaAlta: { valor: 50000, pares: 250, margem: 48 },
  };

  it("garante que celular desatualizado NÃO sobrescreve configurações mensais mais novas da nuvem", () => {
    const profileId = "vendedora-01";
    const syncCode = "SERALLE-SYNC-777";

    // Aparelho A (atualizou a meta de Setembro na nuvem às 12:00)
    const cloudPayload = {
      profiles: [{ profileId, nome: "Vendedora Teste" }],
      perfisData: {
        [profileId]: {
          profileId,
          nome: "Vendedora Teste",
          dias: {},
          configs: {
            "2026-09": {
              ...configPadrao,
              cotaA: { valor: 55000, pares: 250, margem: 46 }, // Meta aumentada na nuvem
              updatedAt: "2026-09-13T12:00:00.000Z",
            },
          },
        },
      },
    };

    // Aparelho B (estava offline com configuração antiga de 08:00)
    const localConfigsAparelhoB: Record<string, ConfigMes> = {
      "2026-09": {
        ...configPadrao,
        cotaA: { valor: 40000, pares: 200, margem: 45 }, // Meta antiga local
        updatedAt: "2026-09-13T08:00:00.000Z",
      },
    };

    // Aparelho B executa a sincronização
    const resultado = simularSincronizarAgora({
      profileId,
      syncCode,
      localDias: {},
      localConfigs: localConfigsAparelhoB,
      cloudPayload,
    });

    // 1. O estado reconciliado preserva a meta mais recente da nuvem
    expect(resultado.configsReconciliadas["2026-09"].cotaA.valor).toBe(55000);

    // 2. O Firestore do usuário recebe estritamente a versão reconciliada mais nova
    expect(resultado.firestoreWrites.configMes["2026-09"].cotaA.valor).toBe(55000);

    // 3. O upload para a nuvem em perfisData NÃO volta para a versão desatualizada
    expect(resultado.finalCloudUploadPayload.perfisData[profileId].configs["2026-09"].cotaA.valor).toBe(55000);

    // 4. O array universal allConfigsPayload também possui a versão mais nova
    const cotaPayload = resultado.finalCloudUploadPayload.configs.find(
      (c) => c.profileId === profileId && c.mesId === "2026-09"
    );
    expect(cotaPayload).toBeDefined();
    const parsedConfig = JSON.parse(cotaPayload!.configJson);
    expect(parsedConfig.cotaA.valor).toBe(55000);
  });

  it("garante que celular desatualizado NÃO sobrescreve vendas mais novas gravadas por outro aparelho", () => {
    const profileId = "vendedora-01";
    const syncCode = "SERALLE-SYNC-777";

    // Aparelho A gravou 4 pares na nuvem às 14:30
    const cloudPayload = {
      perfisData: {
        [profileId]: {
          profileId,
          nome: "Vendedora Teste",
          dias: {
            "2026-09-13": {
              itens: [
                { id: "v1", valor: 300, pares: 2, hora: "14:00", descricao: "Bota" },
                { id: "v2", valor: 400, pares: 2, hora: "14:30", descricao: "Tênis" },
              ],
              margem: 48,
              folga: false,
              atendimentosTotais: 3,
              anotacoes: "Venda da tarde pelo Aparelho A",
              updatedAt: "2026-09-13T14:30:00.000Z",
            },
          },
          configs: {},
        },
      },
    };

    // Aparelho B tem no cache local uma versão antiga da manhã (apenas 1 par às 10:00)
    const localDiasAparelhoB: Record<string, DiaVenda> = {
      "2026-09-13": {
        itens: [{ id: "v0", valor: 150, pares: 1, hora: "10:00", descricao: "Sandália" }],
        margem: 42,
        folga: false,
        atendimentosTotais: 1,
        anotacoes: "Venda da manhã no Aparelho B",
        updatedAt: "2026-09-13T10:00:00.000Z",
      },
    };

    const resultado = simularSincronizarAgora({
      profileId,
      syncCode,
      localDias: localDiasAparelhoB,
      localConfigs: {},
      cloudPayload,
    });

    // 1. A venda mais recente do Aparelho A vence e é preservada
    const diaReconciliado = resultado.diasReconciliados["2026-09-13"];
    expect(diaReconciliado).toBeDefined();
    expect(diaReconciliado.itens).toHaveLength(2);
    expect(diaReconciliado.margem).toBe(48);
    expect(diaReconciliado.anotacoes).toBe("Venda da tarde pelo Aparelho A");

    // 2. Gravada corretamente no Firestore e no upload
    expect(resultado.firestoreWrites.vendas["2026-09-13"].itens).toHaveLength(2);
    expect(resultado.finalCloudUploadPayload.perfisData[profileId].dias["2026-09-13"].itens).toHaveLength(2);
  });

  it("preserva vendas novas criadas localmente offline no Aparelho B que ainda não existiam na nuvem", () => {
    const profileId = "vendedora-01";
    const syncCode = "SERALLE-SYNC-777";

    const cloudPayload = {
      perfisData: {
        [profileId]: {
          profileId,
          nome: "Vendedora Teste",
          dias: {
            "2026-09-12": {
              itens: [{ id: "v-antigo", valor: 200, pares: 1, hora: "11:00", descricao: "Sandália" }],
              margem: 45,
              updatedAt: "2026-09-12T11:00:00.000Z",
            },
          },
          configs: {},
        },
      },
    };

    // Aparelho B lançou vendas no dia seguinte (2026-09-13) offline
    const localDiasAparelhoB: Record<string, DiaVenda> = {
      "2026-09-13": {
        itens: [{ id: "v-novo", valor: 500, pares: 3, hora: "16:00", descricao: "Tênis" }],
        margem: 46,
        updatedAt: "2026-09-13T16:00:00.000Z",
      },
    };

    const resultado = simularSincronizarAgora({
      profileId,
      syncCode,
      localDias: localDiasAparelhoB,
      localConfigs: {},
      cloudPayload,
    });

    // Ambas as vendas coexistem de forma convergente
    expect(resultado.diasReconciliados["2026-09-12"]).toBeDefined();
    expect(resultado.diasReconciliados["2026-09-13"]).toBeDefined();
    expect(resultado.diasReconciliados["2026-09-13"].itens[0].valor).toBe(500);
  });

  it("respeita exclusões lógicas (tombstone deletedAt) e não ressuscita vendas deletadas", () => {
    const profileId = "vendedora-01";
    const syncCode = "SERALLE-SYNC-777";

    // O dia 2026-09-10 foi deletado no Aparelho A às 17:00
    const cloudPayload = {
      perfisData: {
        [profileId]: {
          profileId,
          nome: "Vendedora Teste",
          dias: {
            "2026-09-10": {
              itens: [],
              margem: 0,
              deletedAt: "2026-09-10T17:00:00.000Z",
              updatedAt: "2026-09-10T17:00:00.000Z",
            },
          },
          configs: {},
        },
      },
    };

    // O Aparelho B ainda tinha o dia gravado antes da exclusão (às 12:00)
    const localDiasAparelhoB: Record<string, DiaVenda> = {
      "2026-09-10": {
        itens: [{ id: "v-del", valor: 250, pares: 1, hora: "12:00", descricao: "Sapato" }],
        margem: 45,
        updatedAt: "2026-09-10T12:00:00.000Z",
      },
    };

    const resultado = simularSincronizarAgora({
      profileId,
      syncCode,
      localDias: localDiasAparelhoB,
      localConfigs: {},
      cloudPayload,
    });

    // A venda excluída foi eliminada no estado reconciliado e NÃO ressurge
    expect(resultado.diasReconciliados["2026-09-10"]).toBeUndefined();
  });
});
