import React from "react";
import {
  Store,
  Users,
  Trophy,
  TrendingUp,
  Footprints,
  Percent,
  Receipt,
  Award,
  Calendar,
  Sparkles,
} from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import { useProfile } from "@/context/ProfileContext";
import { formatMoeda, mesAnoExtenso } from "@/utils/formatters";

interface VisaoLojaViewProps {
  mesId: string;
}

export function VisaoLojaView({ mesId }: VisaoLojaViewProps) {
  const { getDadosTodasVendedoras, getConfigMes } = useVendas();
  const { selecionarPerfil } = useProfile();

  const config = getConfigMes(mesId);
  const sellersData = getDadosTodasVendedoras(mesId);

  // Store Totals
  const totalLojaValor = sellersData.reduce((acc, s) => acc + s.totais.valor, 0);
  const totalLojaPares = sellersData.reduce((acc, s) => acc + s.totais.pares, 0);
  const totalLojaAtendimentos = sellersData.reduce((acc, s) => acc + s.totais.qtdVendas, 0);
  const totalLojaTicketPar = totalLojaPares > 0 ? totalLojaValor / totalLojaPares : 0;

  // Weighted Average Store Margin
  let somaPesos = 0;
  let somaMargemPonderada = 0;
  sellersData.forEach((s) => {
    if (s.totais.valor > 0 && s.totais.margem > 0) {
      somaMargemPonderada += s.totais.margem * s.totais.valor;
      somaPesos += s.totais.valor;
    }
  });
  const margemLojaMedia = somaPesos > 0 ? somaMargemPonderada / somaPesos : 0;

  // Ranked sellers
  const rankingVendedoras = [...sellersData].sort((a, b) => b.totais.valor - a.totais.valor);

  return (
    <div className="space-y-6">
      {/* ─── Header Loja Consolidated ──────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                <Store className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
                  Visão Consolidada da Loja
                </span>
                <h3 className="text-xl sm:text-2xl font-black">
                  Desempenho Geral Serallê Calçados
                </h3>
              </div>
            </div>
            <p className="text-xs text-blue-200/80 mt-1.5 font-medium">
              Consolidação de {sellersData.length} perfis de vendedoras em {mesAnoExtenso(mesId)}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/15 text-right">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
              Total Faturado pela Equipe
            </span>
            <p className="text-2xl font-black text-amber-300">
              {formatMoeda(totalLojaValor)}
            </p>
          </div>
        </div>

        {/* Background decorative circles */}
        <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* ─── Store Consolidated Metric Cards ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Total em Pares
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Footprints className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalLojaPares}{" "}
              <span className="text-sm font-semibold text-slate-400">pares</span>
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Vendido por toda a equipe
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Atendimentos
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalLojaAtendimentos}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Lançamentos de vendas na loja
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ticket Médio Loja
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatMoeda(totalLojaTicketPar)}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-1">/ par</span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Média geral de valor por par
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Margem Média Loja
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {margemLojaMedia > 0 ? `${margemLojaMedia.toFixed(1)}%` : "—"}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Média ponderada da loja
          </div>
        </div>
      </div>

      {/* ─── Tabela / Ranking da Equipe ────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Quadro de Vendedoras & Metas Atingidas
            </h3>
          </div>
          <span className="text-xs font-medium text-slate-400">
            {sellersData.length} vendedoras cadastradas
          </span>
        </div>

        <div className="divide-y divide-slate-100 overflow-hidden">
          {rankingVendedoras.map((seller, idx) => {
            const atingiuA = seller.totais.valor >= config.cotaA.valor && config.cotaA.valor > 0;
            const atingiuB = seller.totais.valor >= config.cotaB.valor && config.cotaB.valor > 0;
            const atingiuC = seller.totais.valor >= config.cotaC.valor && config.cotaC.valor > 0;
            const atingiuAlta = seller.totais.valor >= config.cotaAlta.valor && config.cotaAlta.valor > 0;

            let cotaBadge = null;
            if (atingiuAlta) {
              cotaBadge = <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300">Cota Alta ★</span>;
            } else if (atingiuC) {
              cotaBadge = <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-900 border border-purple-300">Cota C</span>;
            } else if (atingiuB) {
              cotaBadge = <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-900 border border-blue-300">Cota B</span>;
            } else if (atingiuA) {
              cotaBadge = <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-900 border border-emerald-300">Cota A</span>;
            }

            const pctShareLoja = totalLojaValor > 0 ? (seller.totais.valor / totalLojaValor) * 100 : 0;

            return (
              <div
                key={seller.perfilId}
                className="py-4 flex flex-wrap items-center justify-between gap-4 hover:bg-slate-50/80 px-3 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shadow-2xs ${
                      idx === 0
                        ? "bg-amber-500 text-white"
                        : idx === 1
                        ? "bg-slate-300 text-slate-800"
                        : idx === 2
                        ? "bg-amber-700/80 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    #{idx + 1}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base font-extrabold text-slate-900">
                        {seller.nome}
                      </h4>
                      {cotaBadge}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      {seller.totais.dias} dias trabalhados · {seller.totais.pares} pares vendidos ·{" "}
                      {seller.totais.qtdVendas} lançamentos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <span className="text-[11px] font-bold text-slate-400 uppercase">
                      Faturamento
                    </span>
                    <p className="text-base font-extrabold text-slate-900">
                      {formatMoeda(seller.totais.valor)}
                    </p>
                    <span className="text-[11px] font-bold text-blue-700">
                      {pctShareLoja.toFixed(1)}% do total da loja
                    </span>
                  </div>

                  <button
                    onClick={() => selecionarPerfil(seller.perfilId)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                  >
                    Abrir Diário
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
