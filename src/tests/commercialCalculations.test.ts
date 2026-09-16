import { describe, it, expect } from "vitest";
import {
  calcularTotaisDia,
  calcularTotaisMes,
  calcularStatusCotas,
  reconciliarDiasVenda,
  reconciliarConfigsMes,
} from "../utils/commercialCalculations";
import { DiaVenda, ConfigMes } from "../types";

describe("Cálculos Comerciais Serallê - Dia e Indicadores Operacionais", () => {
  it("deve retornar zeros quando o dia for nulo ou sem itens", () => {
    const res = calcularTotaisDia(null);
    expect(res.valor).toBe(0);
    expect(res.pares).toBe(0);
    expect(res.pa).toBe(0);
    expect(res.taxaConversao).toBe(0);
    expect(res.ticketMedio).toBe(0);
  });

  it("deve calcular corretamente valor, pares, produtos agregados e PA", () => {
    const diaMock: DiaVenda = {
      itens: [
        {
          id: "1",
          valor: 250,
          pares: 1,
          produtosAgregados: 1, // meia/spray
          descricao: "Tênis",
          hora: "10:00",
        },
        {
          id: "2",
          valor: 150,
          pares: 1,
          produtosAgregados: 0,
          descricao: "Sandália",
          hora: "11:30",
        },
      ],
      margem: 45.5,
      atendimentosTotais: 4, // 4 pessoas atendidas, 2 compras
    };

    const res = calcularTotaisDia(diaMock);

    expect(res.valor).toBe(400);
    expect(res.pares).toBe(2);
    expect(res.produtosAgregados).toBe(1);
    expect(res.totalPecas).toBe(3); // 2 pares + 1 agregado
    // PA com atendimentos informados: 3 peças / 4 atendimentos = 0.75
    expect(res.pa).toBe(0.75);
    // Taxa de conversão: 2 vendas / 4 atendimentos = 50%
    expect(res.taxaConversao).toBe(50);
    // Ticket médio: R$ 400 / 2 vendas = R$ 200
    expect(res.ticketMedio).toBe(200);
    // Preço médio por peça: R$ 400 / 3 peças = R$ 133.33
    expect(res.precoMedioPeca).toBe(133.33);
  });
});

describe("Cálculos Mensais e Ponderação de Margem", () => {
  it("deve calcular margem média ponderada corretamente pelo faturamento", () => {
    const dias: Record<string, DiaVenda> = {
      "2026-09-01": {
        itens: [{ id: "1", valor: 1000, pares: 5, descricao: "Venda 1", hora: "10:00" }],
        margem: 50, // R$ 1000 a 50%
      },
      "2026-09-02": {
        itens: [{ id: "2", valor: 3000, pares: 15, descricao: "Venda 2", hora: "14:00" }],
        margem: 40, // R$ 3000 a 40%
      },
    };

    const totais = calcularTotaisMes(dias, "2026-09");

    expect(totais.valor).toBe(4000);
    expect(totais.pares).toBe(20);
    expect(totais.dias).toBe(2);
    // Margem ponderada: (1000*50 + 3000*40) / 4000 = (50000 + 120000) / 4000 = 42.5%
    expect(totais.margem).toBe(42.5);
  });
});

describe("Atingimento de Metas e Comissão Serallê", () => {
  const configMesBase: ConfigMes = {
    cotaC: { valor: 20000, pares: 100, margem: 40, premio: 100 },
    cotaB: { valor: 30000, pares: 150, margem: 42, premio: 250 },
    cotaA: { valor: 40000, pares: 200, margem: 45, premio: 500 },
    cotaAlta: { valor: 50000, pares: 250, margem: 48, premio: 1000 },
    comissaoPadraoPct: 2.5,
  };

  it("deve identificar quando nenhuma cota foi atingida", () => {
    const totais = {
      valor: 15000,
      pares: 80,
      margem: 40,
      dias: 10,
      qtdVendas: 70,
      produtosAgregados: 10,
      atendimentosTotais: 100,
      paMedio: 1.2,
      taxaConversao: 70,
    };

    const status = calcularStatusCotas(totais, configMesBase);
    expect(status.cotaBatida).toBe("nenhuma");
    expect(status.premioTotal).toBe(0);
    // Comissão base: 2.5% de 15.000 = 375
    expect(status.valorComissaoEstimada).toBe(375);
  });

  it("deve reconhecer Cota A batida e somar a bonificação", () => {
    const totais = {
      valor: 42000,
      pares: 210,
      margem: 46,
      dias: 24,
      qtdVendas: 180,
      produtosAgregados: 30,
      atendimentosTotais: 200,
      paMedio: 1.33,
      taxaConversao: 90,
    };

    const status = calcularStatusCotas(totais, configMesBase);
    expect(status.cotaBatida).toBe("cotaA");
    expect(status.premioTotal).toBe(500);
    // Comissão: (42.000 * 2.5%) + 500 = 1050 + 500 = 1550
    expect(status.valorComissaoEstimada).toBe(1550);
  });

  it("deve aplicar faixas escalonadas de comissão quando ativadas", () => {
    const configComFaixas: ConfigMes = {
      ...configMesBase,
      ativarFaixasComissao: true,
      faixasComissao: [
        { minAtingimentoPct: 0, comissaoPct: 2.0 },
        { minAtingimentoPct: 80, comissaoPct: 2.5 },
        { minAtingimentoPct: 100, comissaoPct: 3.5 },
      ],
    };

    const totais = {
      valor: 40000, // 100% da Cota A
      pares: 200, // 100% da Cota A
      margem: 45,
      dias: 24,
      qtdVendas: 180,
      produtosAgregados: 20,
      atendimentosTotais: 200,
      paMedio: 1.2,
      taxaConversao: 90,
    };

    const status = calcularStatusCotas(totais, configComFaixas);
    expect(status.percentualComissaoEfetivo).toBe(3.5);
    // (40.000 * 3.5%) + 500 (prêmio cota A) = 1400 + 500 = 1900
    expect(status.valorComissaoEstimada).toBe(1900);
  });
});

describe("Reconciliação e Controle de Conflitos (LWW & Exclusões)", () => {
  it("deve priorizar a versão mais recente e respeitar exclusões (tombstones)", () => {
    const locais: Record<string, DiaVenda> = {
      "2026-09-10": {
        itens: [{ id: "item1", valor: 100, pares: 1, descricao: "Local Antigo", hora: "10:00" }],
        margem: 40,
        updatedAt: "2026-09-10T12:00:00.000Z",
      },
      "2026-09-11": {
        itens: [{ id: "item2", valor: 200, pares: 2, descricao: "Local Mais Novo", hora: "14:00" }],
        margem: 45,
        updatedAt: "2026-09-11T18:00:00.000Z",
      },
      "2026-09-12": {
        itens: [{ id: "item3", valor: 300, pares: 1, descricao: "Excluído na nuvem", hora: "09:00" }],
        margem: 42,
        updatedAt: "2026-09-12T08:00:00.000Z",
      },
    };

    const remotos: Record<string, DiaVenda> = {
      "2026-09-10": {
        itens: [{ id: "item1_mod", valor: 150, pares: 1, descricao: "Remoto Mais Novo", hora: "11:00" }],
        margem: 42,
        updatedAt: "2026-09-10T14:00:00.000Z", // Mais novo que o local
      },
      "2026-09-11": {
        itens: [{ id: "item2_old", valor: 180, pares: 1, descricao: "Remoto Mais Antigo", hora: "13:00" }],
        margem: 40,
        updatedAt: "2026-09-11T10:00:00.000Z", // Mais antigo que o local
      },
      "2026-09-12": {
        itens: [],
        margem: 0,
        deletedAt: "2026-09-12T10:00:00.000Z", // Excluído na nuvem após o local
        updatedAt: "2026-09-12T10:00:00.000Z",
      },
    };

    const { reconciliados, chavesParaEnviarRemoto } = reconciliarDiasVenda(locais, remotos);

    // 2026-09-10: remoto mais novo venceu
    expect(reconciliados["2026-09-10"].itens[0].descricao).toBe("Remoto Mais Novo");
    expect(reconciliados["2026-09-10"].itens[0].valor).toBe(150);

    // 2026-09-11: local mais novo foi mantido e agendado para subir
    expect(reconciliados["2026-09-11"].itens[0].descricao).toBe("Local Mais Novo");
    expect(chavesParaEnviarRemoto).toContain("2026-09-11");

    // 2026-09-12: tombstone remoto mais novo removeu a venda local
    expect(reconciliados["2026-09-12"]).toBeUndefined();
  });

  it("deve reconciliar ConfigMes e metas com garantia LWW por timestamp", () => {
    const configLocalBase: ConfigMes = {
      cotaC: { valor: 20000, pares: 100, margem: 40 },
      cotaB: { valor: 30000, pares: 150, margem: 42 },
      cotaA: { valor: 40000, pares: 200, margem: 45 },
      cotaAlta: { valor: 50000, pares: 250, margem: 48 },
    };

    const locais: Record<string, ConfigMes> = {
      "2026-09": {
        ...configLocalBase,
        cotaA: { valor: 40000, pares: 200, margem: 45 },
        updatedAt: "2026-09-01T10:00:00.000Z",
      },
      "2026-10": {
        ...configLocalBase,
        cotaA: { valor: 45000, pares: 220, margem: 45 },
        updatedAt: "2026-10-01T15:00:00.000Z", // Local mais novo
      },
    };

    const remotos: Record<string, ConfigMes> = {
      "2026-09": {
        ...configLocalBase,
        cotaA: { valor: 42000, pares: 210, margem: 45 },
        updatedAt: "2026-09-01T12:00:00.000Z", // Remoto mais novo
      },
      "2026-10": {
        ...configLocalBase,
        cotaA: { valor: 41000, pares: 200, margem: 45 },
        updatedAt: "2026-10-01T08:00:00.000Z", // Remoto mais antigo
      },
    };

    const { reconciliados, chavesParaEnviarRemoto } = reconciliarConfigsMes(locais, remotos);

    // 2026-09: Remoto mais novo venceu
    expect(reconciliados["2026-09"].cotaA.valor).toBe(42000);

    // 2026-10: Local mais novo prevaleceu e foi listado para envio
    expect(reconciliados["2026-10"].cotaA.valor).toBe(45000);
    expect(chavesParaEnviarRemoto).toContain("2026-10");
  });
});
