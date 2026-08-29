import React from "react";
import {
  Award,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Footprints,
  ArrowRight,
  Sparkles,
  Trophy,
  Coins,
  Gift,
} from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import { formatMoeda, mesAnoExtenso } from "@/utils/formatters";

interface HistoricoMetasViewProps {
  onSelectMonth: (mesId: string) => void;
}

export function HistoricoMetasView({ onSelectMonth }: HistoricoMetasViewProps) {
  const { dias, getTotalMes, getConfigMes } = useVendas();

  // Find all unique months from registered sales
  const monthsSet = new Set<string>();
  Object.keys(dias).forEach((dataStr) => {
    if (dataStr.length >= 7) {
      monthsSet.add(dataStr.substring(0, 7));
    }
  });

  // Always include current month
  const now = new Date();
  const currentMonthId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  monthsSet.add(currentMonthId);

  const sortedMonths = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));

  // Compute metrics for each month
  const monthsData = sortedMonths.map((mesId) => {
    const total = getTotalMes(mesId);
    const config = getConfigMes(mesId);

    const bateuA = total.valor >= config.cotaA.valor && config.cotaA.valor > 0;
    const bateuB = total.valor >= config.cotaB.valor && config.cotaB.valor > 0;
    const bateuC = total.valor >= config.cotaC.valor && config.cotaC.valor > 0;
    const bateuAlta = total.valor >= config.cotaAlta.valor && config.cotaAlta.valor > 0;

    let maiorCota: "Alta" | "C" | "B" | "A" | null = null;
    let premioCota = 0;
    if (bateuAlta) {
      maiorCota = "Alta";
      premioCota = config.cotaAlta.premio || 0;
    } else if (bateuC) {
      maiorCota = "C";
      premioCota = config.cotaC.premio || 0;
    } else if (bateuB) {
      maiorCota = "B";
      premioCota = config.cotaB.premio || 0;
    } else if (bateuA) {
      maiorCota = "A";
      premioCota = config.cotaA.premio || 0;
    }

    const comissaoPct = config.comissaoPadraoPct ?? 2.5;
    const valorComissao = (total.valor * comissaoPct) / 100;
    const ganhosTotais = valorComissao + premioCota;

    return {
      mesId,
      total,
      config,
      bateuA,
      bateuB,
      bateuC,
      bateuAlta,
      maiorCota,
      premioCota,
      valorComissao,
      ganhosTotais,
    };
  });

  // Aggregated totals
  const totalMesesComVendas = monthsData.filter((m) => m.total.valor > 0).length;
  const countCotaA = monthsData.filter((m) => m.bateuA).length;
  const countCotaB = monthsData.filter((m) => m.bateuB).length;
  const countCotaC = monthsData.filter((m) => m.bateuC).length;
  const countCotaAlta = monthsData.filter((m) => m.bateuAlta).length;
  const totalGanhosHistoricos = monthsData.reduce((acc, m) => acc + m.ganhosTotais, 0);

  // Best month ever
  const melhorMes = [...monthsData].sort((a, b) => b.total.valor - a.total.valor)[0];

  return (
    <div className="space-y-6">
      {/* ─── Aggregated Stats Overview ─────────────────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Resumo Histórico de Conquistas & Bônus
            </h3>
          </div>
          {totalGanhosHistoricos > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-extrabold">
              <Coins className="w-3.5 h-3.5" />
              Total Estimado Acumulado: {formatMoeda(totalGanhosHistoricos)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-5">
          <div className="bg-emerald-50/70 p-4 rounded-xl border border-emerald-200">
            <span className="text-xs font-bold text-emerald-800 uppercase">
              Cota A Batida
            </span>
            <p className="text-2xl font-extrabold text-emerald-900 mt-1">
              {countCotaA} <span className="text-xs font-semibold">vezes</span>
            </p>
          </div>

          <div className="bg-blue-50/70 p-4 rounded-xl border border-blue-200">
            <span className="text-xs font-bold text-blue-800 uppercase">
              Cota B Batida
            </span>
            <p className="text-2xl font-extrabold text-blue-900 mt-1">
              {countCotaB} <span className="text-xs font-semibold">vezes</span>
            </p>
          </div>

          <div className="bg-purple-50/70 p-4 rounded-xl border border-purple-200">
            <span className="text-xs font-bold text-purple-800 uppercase">
              Cota C Batida
            </span>
            <p className="text-2xl font-extrabold text-purple-900 mt-1">
              {countCotaC} <span className="text-xs font-semibold">vezes</span>
            </p>
          </div>

          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200">
            <span className="text-xs font-bold text-amber-800 uppercase">
              Cota Alta Batida
            </span>
            <p className="text-2xl font-extrabold text-amber-900 mt-1">
              {countCotaAlta} <span className="text-xs font-semibold">vezes</span>
            </p>
          </div>
        </div>

        {melhorMes && melhorMes.total.valor > 0 && (
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent border border-amber-300/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900 uppercase">
                  Recorde Histórico: {mesAnoExtenso(melhorMes.mesId)}
                </p>
                <p className="text-xs font-semibold text-slate-700">
                  {formatMoeda(melhorMes.total.valor)} e {melhorMes.total.pares} pares vendidos
                </p>
              </div>
            </div>
            <button
              onClick={() => onSelectMonth(melhorMes.mesId)}
              className="text-xs font-bold text-amber-900 hover:underline flex items-center gap-1"
            >
              <span>Ver mês</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ─── Months List ───────────────────────────────────────────────── */}
      <div className="space-y-4">
        {monthsData.map((item) => {
          const { mesId, total, config, maiorCota, ganhosTotais, premioCota } = item;
          const ticketMedio = total.pares > 0 ? total.valor / total.pares : 0;

          return (
            <div
              key={mesId}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 capitalize">
                      {mesAnoExtenso(mesId)}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      {total.dias} {total.dias === 1 ? "dia trabalhado" : "dias trabalhados"} ·{" "}
                      {total.qtdVendas} atendimentos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {maiorCota ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <Award className="w-3.5 h-3.5" />
                      Cota {maiorCota} Conquistada {premioCota > 0 && `(+${formatMoeda(premioCota)})`}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">
                      Cota não atingida
                    </span>
                  )}

                  <button
                    onClick={() => onSelectMonth(mesId)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition-colors"
                  >
                    <span>Abrir Painel</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Month Numbers Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Total Vendido
                  </span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">
                    {formatMoeda(total.valor)}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Pares Vendidos
                  </span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">
                    {total.pares} pares
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase">
                    Ganhos (Comissão + Bônus)
                  </span>
                  <p className="text-base font-extrabold text-emerald-950 mt-0.5">
                    {formatMoeda(ganhosTotais)}
                  </p>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">
                    Margem Média
                  </span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">
                    {total.margem > 0 ? `${total.margem.toFixed(1)}%` : "—"}
                  </p>
                </div>
              </div>

              {/* Cotas checklist */}
              <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-xs">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold ${
                    item.bateuA
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cota A ({formatMoeda(config.cotaA.valor)})
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold ${
                    item.bateuB
                      ? "bg-blue-50 text-blue-800 border-blue-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cota B ({formatMoeda(config.cotaB.valor)})
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold ${
                    item.bateuC
                      ? "bg-purple-50 text-purple-800 border-purple-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cota C ({formatMoeda(config.cotaC.valor)})
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border font-semibold ${
                    item.bateuAlta
                      ? "bg-amber-50 text-amber-800 border-amber-200"
                      : "bg-slate-50 text-slate-400 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Cota Alta ({formatMoeda(config.cotaAlta.valor)})
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
