import { DiaVenda, ConfigMes, TotaisMes, TotaisDia, Cota, FaixaComissao } from "@/types";

/**
 * Motor oficial de cálculos comerciais da Serallê Calçados
 */

export interface ResultadoCalculoDia {
  valor: number;
  pares: number;
  qtdVendas: number;
  produtosAgregados: number;
  totalPecas: number;
  pa: number; // Peças por Atendimento (ou por venda se atendimentos não informados)
  taxaConversao: number; // % de conversão de atendimentos em vendas
  ticketMedio: number; // R$ por venda
  precoMedioPeca: number; // R$ por peça
  margem: number;
}

export interface StatusCotaMes {
  cotaBatida: "nenhuma" | "cotaC" | "cotaB" | "cotaA" | "cotaAlta";
  atingimentoValorPct: number;
  atingimentoParesPct: number;
  premioTotal: number;
  percentualComissaoEfetivo: number;
  valorComissaoEstimada: number;
}

/**
 * Calcula os totais e indicadores operacionais de um dia de trabalho.
 */
export function calcularTotaisDia(dia: DiaVenda | null | undefined): ResultadoCalculoDia {
  if (!dia || !dia.itens || dia.itens.length === 0) {
    return {
      valor: 0,
      pares: 0,
      qtdVendas: 0,
      produtosAgregados: 0,
      totalPecas: 0,
      pa: 0,
      taxaConversao: 0,
      ticketMedio: 0,
      precoMedioPeca: 0,
      margem: dia?.margem || 0,
    };
  }

  const valor = dia.itens.reduce((acc, item) => acc + (Number(item.valor) || 0), 0);
  const pares = dia.itens.reduce((acc, item) => acc + (Number(item.pares) || 0), 0);
  const produtosAgregados = dia.itens.reduce(
    (acc, item) => acc + (Number(item.produtosAgregados) || 0),
    0
  );
  const qtdVendas = dia.itens.length;
  const totalPecas = pares + produtosAgregados;

  // Atendimentos totais informados pela vendedora ou quantidade de vendas realizadas
  const atendimentos = dia.atendimentosTotais && dia.atendimentosTotais > 0 ? dia.atendimentosTotais : qtdVendas;

  // PA comercial: total de peças dividido pelo número de atendimentos/vendas
  const divisorPA = dia.atendimentosTotais && dia.atendimentosTotais > 0 ? dia.atendimentosTotais : qtdVendas;
  const pa = divisorPA > 0 ? totalPecas / divisorPA : 0;

  // Taxa de conversão (% de clientes atendidos que compraram)
  const taxaConversao = atendimentos > 0 ? Math.min(100, (qtdVendas / atendimentos) * 100) : 100;

  const ticketMedio = qtdVendas > 0 ? valor / qtdVendas : 0;
  const precoMedioPeca = totalPecas > 0 ? valor / totalPecas : 0;

  return {
    valor: Math.round(valor * 100) / 100,
    pares,
    qtdVendas,
    produtosAgregados,
    totalPecas,
    pa: Math.round(pa * 100) / 100,
    taxaConversao: Math.round(taxaConversao * 10) / 10,
    ticketMedio: Math.round(ticketMedio * 100) / 100,
    precoMedioPeca: Math.round(precoMedioPeca * 100) / 100,
    margem: dia.margem || 0,
  };
}

/**
 * Calcula os totais acumulados de um mês para a vendedora.
 */
export function calcularTotaisMes(dias: Record<string, DiaVenda>, mesId: string): TotaisMes {
  let totalValor = 0;
  let totalPares = 0;
  let totalAgregados = 0;
  let totalAtendimentos = 0;
  let totalMargemPonderada = 0;
  let somaPesosValor = 0;
  let diasComVenda = 0;
  let qtdVendas = 0;

  Object.entries(dias).forEach(([data, dia]) => {
    if (data.startsWith(mesId) && !dia.deletedAt) {
      const diaValor = (dia.itens || []).reduce((sum, i) => sum + (Number(i.valor) || 0), 0);
      const diaPares = (dia.itens || []).reduce((sum, i) => sum + (Number(i.pares) || 0), 0);
      const diaAgregados = (dia.itens || []).reduce(
        (sum, i) => sum + (Number(i.produtosAgregados) || 0),
        0
      );

      if ((dia.itens && dia.itens.length > 0) || diaValor > 0) {
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

  const margemMedia = somaPesosValor > 0 ? totalMargemPonderada / somaPesosValor : 0;
  const totalPecas = totalPares + totalAgregados;
  const divisorPAMedio = totalAtendimentos > 0 ? totalAtendimentos : qtdVendas;
  const paMedio = divisorPAMedio > 0 ? totalPecas / divisorPAMedio : 0;
  const taxaConversao =
    totalAtendimentos > 0 ? Math.min(100, (qtdVendas / totalAtendimentos) * 100) : 100;

  return {
    valor: Math.round(totalValor * 100) / 100,
    pares: totalPares,
    margem: Math.round(margemMedia * 10) / 10,
    dias: diasComVenda,
    qtdVendas,
    produtosAgregados: totalAgregados,
    atendimentosTotais: totalAtendimentos,
    paMedio: Math.round(paMedio * 100) / 100,
    taxaConversao: Math.round(taxaConversao * 10) / 10,
  };
}

/**
 * Determina o status de atingimento de metas (Cotas C, B, A ou Alta), prêmio e comissões.
 */
export function calcularStatusCotas(
  totais: TotaisMes,
  config: ConfigMes
): StatusCotaMes {
  const { valor, pares } = totais;

  const atgA_val = config.cotaA?.valor > 0 ? (valor / config.cotaA.valor) * 100 : 0;
  const atgA_par = config.cotaA?.pares > 0 ? (pares / config.cotaA.pares) * 100 : 0;

  let cotaBatida: StatusCotaMes["cotaBatida"] = "nenhuma";
  let premioTotal = 0;

  // Verificação de cotas da maior para a menor
  if (config.cotaAlta?.valor > 0 && valor >= config.cotaAlta.valor && pares >= (config.cotaAlta.pares || 0)) {
    cotaBatida = "cotaAlta";
    premioTotal = config.cotaAlta.premio || 0;
  } else if (config.cotaA?.valor > 0 && valor >= config.cotaA.valor && pares >= (config.cotaA.pares || 0)) {
    cotaBatida = "cotaA";
    premioTotal = config.cotaA.premio || 0;
  } else if (config.cotaB?.valor > 0 && valor >= config.cotaB.valor && pares >= (config.cotaB.pares || 0)) {
    cotaBatida = "cotaB";
    premioTotal = config.cotaB.premio || 0;
  } else if (config.cotaC?.valor > 0 && valor >= config.cotaC.valor && pares >= (config.cotaC.pares || 0)) {
    cotaBatida = "cotaC";
    premioTotal = config.cotaC.premio || 0;
  }

  // Percentual de comissão
  let percentualComissao = config.comissaoPadraoPct || 2.5;

  if (config.ativarFaixasComissao && Array.isArray(config.faixasComissao) && config.faixasComissao.length > 0) {
    const atingimentoReferencia = Math.min(atgA_val, atgA_par);
    // Ordena faixas por minAtingimentoPct descendente
    const faixasOrdenadas = [...config.faixasComissao].sort(
      (a, b) => b.minAtingimentoPct - a.minAtingimentoPct
    );
    const faixaAplicavel = faixasOrdenadas.find((f) => atingimentoReferencia >= f.minAtingimentoPct);
    if (faixaAplicavel) {
      percentualComissao = faixaAplicavel.comissaoPct;
    }
  }

  const valorComissaoEstimada = Math.round((valor * (percentualComissao / 100) + premioTotal) * 100) / 100;

  return {
    cotaBatida,
    atingimentoValorPct: Math.round(atgA_val * 10) / 10,
    atingimentoParesPct: Math.round(atgA_par * 10) / 10,
    premioTotal,
    percentualComissaoEfetivo: percentualComissao,
    valorComissaoEstimada,
  };
}

/**
 * Reconcilia dados locais e remotos com garantia LWW (Last-Write-Wins) por registro
 * e respeito a exclusões (tombstones).
 */
export function reconciliarDiasVenda(
  locais: Record<string, DiaVenda>,
  remotos: Record<string, DiaVenda>
): {
  reconciliados: Record<string, DiaVenda>;
  chavesParaEnviarRemoto: string[];
} {
  const reconciliados: Record<string, DiaVenda> = { ...locais };
  const chavesParaEnviarRemoto: string[] = [];

  Object.entries(remotos).forEach(([dataKey, rDia]) => {
    const lDia = reconciliados[dataKey];

    if (!lDia) {
      if (!rDia.deletedAt) {
        reconciliados[dataKey] = rDia;
      }
    } else {
      const localParsed = lDia.updatedAt ? new Date(lDia.updatedAt).getTime() : 0;
      const remoteParsed = rDia.updatedAt ? new Date(rDia.updatedAt).getTime() : 0;
      const localTime = Number.isFinite(localParsed) ? localParsed : 0;
      const remoteTime = Number.isFinite(remoteParsed) ? remoteParsed : 0;

      if (remoteTime > localTime) {
        if (rDia.deletedAt) {
          delete reconciliados[dataKey];
        } else {
          reconciliados[dataKey] = rDia;
        }
      } else if (localTime > remoteTime) {
        chavesParaEnviarRemoto.push(dataKey);
      } else {
        // Em empate, preserva o snapshot local. Ele pode conter uma alteração
        // recém-salva ainda não propagada; preferir o remoto aqui causava rollback.
        chavesParaEnviarRemoto.push(dataKey);
      }
    }
  });

  return { reconciliados, chavesParaEnviarRemoto };
}

/**
 * Reconcilia configurações de meses locais e remotos com garantia LWW (Last-Write-Wins)
 * e respeito a atualizações com timestamps.
 */
export function reconciliarConfigsMes(
  locais: Record<string, ConfigMes>,
  remotos: Record<string, ConfigMes>
): {
  reconciliados: Record<string, ConfigMes>;
  chavesParaEnviarRemoto: string[];
} {
  const reconciliados: Record<string, ConfigMes> = { ...locais };
  const chavesParaEnviarRemoto: string[] = [];

  Object.entries(remotos).forEach(([mesKey, rConfig]) => {
    const lConfig = reconciliados[mesKey];

    if (!lConfig) {
      if (!rConfig.deletedAt) {
        reconciliados[mesKey] = rConfig;
      }
    } else {
      const localParsed = lConfig.updatedAt ? new Date(lConfig.updatedAt).getTime() : 0;
      const remoteParsed = rConfig.updatedAt ? new Date(rConfig.updatedAt).getTime() : 0;
      const localTime = Number.isFinite(localParsed) ? localParsed : 0;
      const remoteTime = Number.isFinite(remoteParsed) ? remoteParsed : 0;

      if (remoteTime > localTime) {
        if (rConfig.deletedAt) {
          delete reconciliados[mesKey];
        } else {
          reconciliados[mesKey] = rConfig;
        }
      } else if (localTime > remoteTime) {
        chavesParaEnviarRemoto.push(mesKey);
      } else {
        chavesParaEnviarRemoto.push(mesKey);
      }
    }
  });

  return { reconciliados, chavesParaEnviarRemoto };
}
