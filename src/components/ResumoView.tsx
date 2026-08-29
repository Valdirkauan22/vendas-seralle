import React, { useEffect, useState } from "react";
import {
  TrendingUp,
  Award,
  Calendar as CalendarIcon,
  PlusCircle,
  Footprints,
  Percent,
  Receipt,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Clock,
  Sparkles,
  DollarSign,
  Gift,
  Coffee,
  Coins,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useVendas } from "@/context/VendasContext";
import {
  formatMoeda,
  getDataHoje,
  formatDataCurta,
} from "@/utils/formatters";

interface ResumoViewProps {
  mesId: string;
  onOpenDia: (dataStr: string) => void;
  onOpenMetas: () => void;
}

const COTAS_INFO = [
  { key: "cotaA" as const, label: "Cota A", cor: "#10B981", bgCor: "bg-emerald-500", lightBg: "bg-emerald-50", borderCor: "border-emerald-300", textCor: "text-emerald-700" },
  { key: "cotaB" as const, label: "Cota B", cor: "#3B82F6", bgCor: "bg-blue-500", lightBg: "bg-blue-50", borderCor: "border-blue-300", textCor: "text-blue-700" },
  { key: "cotaC" as const, label: "Cota C", cor: "#8B5CF6", bgCor: "bg-purple-500", lightBg: "bg-purple-50", borderCor: "border-purple-300", textCor: "text-purple-700" },
  { key: "cotaAlta" as const, label: "Cota Alta", cor: "#F59E0B", bgCor: "bg-amber-500", lightBg: "bg-amber-50", borderCor: "border-amber-300", textCor: "text-amber-700" },
];

export function ResumoView({ mesId, onOpenDia, onOpenMetas }: ResumoViewProps) {
  const { getTotalMes, getConfigMes, getDiaTotais, getDia, dias } = useVendas();

  const totalMes = getTotalMes(mesId);
  const configMes = getConfigMes(mesId);
  const dataHoje = getDataHoje();
  const hojeTotais = getDiaTotais(dataHoje);
  const hojeInfo = getDia(dataHoje);

  const isCurrentSelectedMonth = dataHoje.startsWith(mesId);

  // Ticket Médio
  const ticketMedioPar = totalMes.pares > 0 ? totalMes.valor / totalMes.pares : 0;
  const ticketMedioVenda = totalMes.qtdVendas > 0 ? totalMes.valor / totalMes.qtdVendas : 0;

  // Calculate target achievements
  const cotasStatus = COTAS_INFO.map((c) => {
    const target = configMes[c.key];
    const atingiuValor = totalMes.valor >= target.valor && target.valor > 0;
    const atingiuPares = totalMes.pares >= target.pares && target.pares > 0;
    const pctValor = target.valor > 0 ? (totalMes.valor / target.valor) * 100 : 0;
    const pctPares = target.pares > 0 ? (totalMes.pares / target.pares) * 100 : 0;
    const faltaValor = Math.max(0, target.valor - totalMes.valor);
    const faltaPares = Math.max(0, target.pares - totalMes.pares);
    const premio = target.premio || 0;

    return {
      ...c,
      target,
      premio,
      atingiuValor,
      atingiuPares,
      atingiuAmbos: atingiuValor && atingiuPares,
      pctValor,
      pctPares,
      faltaValor,
      faltaPares,
    };
  });

  // Highest cota achieved
  const cotasAtingidas = cotasStatus.filter((c) => c.atingiuValor);
  const maiorCotaAtingida = cotasAtingidas.length > 0 ? cotasAtingidas[cotasAtingidas.length - 1] : null;
  const proximaCota = cotasStatus.find((c) => !c.atingiuValor) || null;

  // Commission & Bonus calculations
  const comissaoPct = configMes.comissaoPadraoPct ?? 2.5;
  const valorComissaoBase = (totalMes.valor * comissaoPct) / 100;
  const valorPremioCota = maiorCotaAtingida?.premio ?? 0;
  const totalGanhosEstimados = valorComissaoBase + valorPremioCota;

  // Trigger celebration confetti once when hitting high tier goals
  useEffect(() => {
    if (maiorCotaAtingida && totalMes.valor > 0) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ["#1A6BB5", "#10B981", "#F59E0B", "#8B5CF6"],
        });
      } catch {}
    }
  }, [maiorCotaAtingida?.key]);

  // Days in selected month & folgas calculation
  const [ano, mes] = mesId.split("-").map(Number);
  const totalDiasNoMes = new Date(ano, mes, 0).getDate();
  const diaAtualNum = isCurrentSelectedMonth
    ? parseInt(dataHoje.split("-")[2], 10)
    : totalDiasNoMes;

  // Calculate folgas in remaining days
  let folgasFuturas = 0;
  let totalFolgasMes = 0;
  for (let d = 1; d <= totalDiasNoMes; d++) {
    const dStr = `${mesId}-${String(d).padStart(2, "0")}`;
    if (dias[dStr]?.folga) {
      totalFolgasMes++;
      if (d >= diaAtualNum) {
        folgasFuturas++;
      }
    }
  }

  const diasRestantesBrutos = Math.max(0, totalDiasNoMes - diaAtualNum);
  const diasRestantesTrabalho = Math.max(1, diasRestantesBrutos - folgasFuturas);

  // Projections
  const mediaDiariaAtual = totalMes.dias > 0 ? totalMes.valor / totalMes.dias : 0;
  const diasTrabalhadosAteAgora = Math.max(1, diaAtualNum - (totalFolgasMes - folgasFuturas));
  const projecaoFechamento =
    diasTrabalhadosAteAgora > 0
      ? (totalMes.valor / diasTrabalhadosAteAgora) * (totalDiasNoMes - totalFolgasMes)
      : totalMes.valor;

  // Maximum value for the progress bar baseline
  const maxBarValue = Math.max(
    configMes.cotaAlta.valor * 1.08,
    totalMes.valor * 1.05,
    100000
  );
  const progressoPctGeral = Math.min((totalMes.valor / maxBarValue) * 100, 100);

  // Recent days with sales
  const diasComLancamentos = Object.entries(dias)
    .filter(([d, val]) => d.startsWith(mesId) && val.itens.length > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ─── Metric Cards Grid ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total do Mês */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vendas no Mês
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {formatMoeda(totalMes.valor)}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>{totalMes.dias} dias trabalhados</span>
            <span>·</span>
            <span>{totalMes.qtdVendas} atendimentos</span>
          </div>
        </div>

        {/* Total de Pares */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Pares Vendidos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Footprints className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalMes.pares}{" "}
              <span className="text-sm font-semibold text-slate-400">pares</span>
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Média {(totalMes.dias > 0 ? totalMes.pares / totalMes.dias : 0).toFixed(1)} pares/dia</span>
          </div>
        </div>

        {/* Ganhos Estimados (Comissão + Prêmio) */}
        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
              Estimativa de Ganhos
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-950 tracking-tight">
              {formatMoeda(totalGanhosEstimados)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-emerald-900/80 font-medium">
            <span>{comissaoPct}% comissão: {formatMoeda(valorComissaoBase)}</span>
            {valorPremioCota > 0 && (
              <span className="font-bold text-emerald-800">+{formatMoeda(valorPremioCota)} bônus</span>
            )}
          </div>
        </div>

        {/* Margem Média & Ticket */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Margem & Ticket
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {totalMes.margem > 0 ? `${totalMes.margem.toFixed(1)}%` : "—"}
            </span>
            <span className="text-xs font-semibold text-slate-400 ml-2">
              TM {formatMoeda(ticketMedioPar)}/par
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <span>Ponderada pelas vendas</span>
          </div>
        </div>
      </div>

      {/* ─── Cotas & Barra de Progresso das Metas ───────────────────────── */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                Progresso das Metas Mensais & Premiações
              </h3>
              {maiorCotaAtingida ? (
                <span
                  style={{
                    backgroundColor: `${maiorCotaAtingida.cor}18`,
                    color: maiorCotaAtingida.cor,
                    borderColor: `${maiorCotaAtingida.cor}40`,
                  }}
                  className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                >
                  <Award className="w-3.5 h-3.5" />
                  {maiorCotaAtingida.label} Conquistada! (+{formatMoeda(maiorCotaAtingida.premio)})
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-500 px-2 py-0.5 rounded-md bg-slate-100">
                  Em busca da Cota A
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Acompanhe a sua evolução em tempo real nas 4 cotas do mês com bonificação garantida
            </p>
          </div>

          <button
            onClick={onOpenMetas}
            className="text-xs font-bold text-blue-700 hover:text-blue-800 hover:underline flex items-center gap-1"
          >
            <span>Configurar Metas & Comissões</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Visual Progress Track & Milestones */}
        <div className="mt-6 mb-6">
          {/* Active Progress Percentage Header */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
            <span>Faturado: <strong className="text-slate-900 font-extrabold">{formatMoeda(totalMes.valor)}</strong></span>
            <span>Meta Máxima (Cota Alta): <strong className="text-slate-900 font-extrabold">{formatMoeda(configMes.cotaAlta.valor)}</strong></span>
          </div>

          <div className="relative h-6 bg-slate-100 rounded-full p-1 shadow-inner border border-slate-200/80">
            {/* Active filled bar */}
            <div
              style={{ width: `${progressoPctGeral}%` }}
              className="h-full rounded-full bg-gradient-to-r from-blue-600 via-emerald-500 to-amber-500 transition-all duration-700 ease-out shadow-xs"
            />

            {/* In-bar Milestone Pins */}
            {cotasStatus.map((cota) => {
              const posPercent = Math.max(3, Math.min((cota.target.valor / maxBarValue) * 100, 97));
              return (
                <div
                  key={`pin-${cota.key}`}
                  style={{ left: `${posPercent}%` }}
                  title={`${cota.label}: ${formatMoeda(cota.target.valor)} (${cota.target.pares} pares)`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 pointer-events-auto group cursor-pointer"
                >
                  <div
                    style={{
                      backgroundColor: cota.atingiuValor ? cota.cor : "#94A3B8",
                    }}
                    className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs transition-transform group-hover:scale-125"
                  />
                </div>
              );
            })}
          </div>

          {/* Cota Milestone Labels with non-overlapping responsive layout */}
          <div className="relative w-full h-7 mt-2">
            {cotasStatus.map((cota) => {
              const posPercent = Math.max(4, Math.min((cota.target.valor / maxBarValue) * 100, 96));
              const valorK = (cota.target.valor / 1000).toFixed(0);
              return (
                <div
                  key={cota.key}
                  style={{ left: `${posPercent}%` }}
                  title={`${cota.label}: ${formatMoeda(cota.target.valor)}`}
                  className="absolute top-0 -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                >
                  <span
                    style={{
                      color: cota.atingiuValor ? cota.cor : "#64748B",
                      backgroundColor: cota.atingiuValor ? `${cota.cor}15` : "#F1F5F9",
                      borderColor: cota.atingiuValor ? `${cota.cor}40` : "#E2E8F0",
                    }}
                    className="text-[10px] sm:text-[11px] font-bold px-1.5 py-0.5 rounded-md border whitespace-nowrap shadow-2xs transition-all group-hover:scale-105"
                  >
                    <span className="hidden sm:inline">{cota.label}: </span>
                    <span className="sm:hidden">{cota.label.replace("Cota ", "")}: </span>
                    R${valorK}k
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cotas Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {cotasStatus.map((cota) => (
            <div
              key={cota.key}
              style={{
                borderColor: cota.atingiuValor ? `${cota.cor}60` : undefined,
              }}
              className={`p-4 rounded-xl border transition-all ${
                cota.atingiuValor
                  ? `${cota.lightBg} border-2 shadow-2xs`
                  : "bg-slate-50/70 border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    style={{ backgroundColor: cota.cor }}
                    className="w-3 h-3 rounded-full"
                  />
                  <span className="text-sm font-bold text-slate-900">
                    {cota.label}
                  </span>
                </div>

                {cota.atingiuValor ? (
                  <span
                    style={{ color: cota.cor }}
                    className="inline-flex items-center gap-1 text-xs font-extrabold"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Atingida
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400">
                    {cota.pctValor.toFixed(0)}%
                  </span>
                )}
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Meta:</span>
                  <span className="font-bold text-slate-800">
                    {formatMoeda(cota.target.valor)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 font-medium">Pares:</span>
                  <span className="font-bold text-slate-800">
                    {cota.target.pares} pares
                  </span>
                </div>
                {cota.premio > 0 && (
                  <div className="flex justify-between text-xs text-amber-800 font-semibold bg-amber-50/80 px-2 py-0.5 rounded-md">
                    <span className="flex items-center gap-1">
                      <Gift className="w-3 h-3 text-amber-600" />
                      Prêmio:
                    </span>
                    <span className="font-bold">{formatMoeda(cota.premio)}</span>
                  </div>
                )}

                {/* Remaining status */}
                {!cota.atingiuValor && (
                  <div className="pt-2 mt-2 border-t border-slate-200/60 text-xs font-semibold text-slate-600 flex items-center justify-between">
                    <span>Falta:</span>
                    <span className="text-blue-700 font-bold">
                      {formatMoeda(cota.faltaValor)}
                    </span>
                  </div>
                )}
                {cota.atingiuValor && (
                  <div className="pt-2 mt-2 border-t border-emerald-200/60 text-xs font-bold text-emerald-700 flex items-center justify-between">
                    <span>Superada por:</span>
                    <span>+{formatMoeda(totalMes.valor - cota.target.valor)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Next Goal Milestone Incentive Banner */}
        {proximaCota && (
          <div className="mt-5 p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                  Próximo Objetivo: {proximaCota.label} {proximaCota.premio > 0 && `(Bônus +${formatMoeda(proximaCota.premio)})`}
                </p>
                <p className="text-sm font-semibold text-slate-700">
                  Faltam apenas{" "}
                  <strong className="text-blue-700">
                    {formatMoeda(proximaCota.faltaValor)}
                  </strong>{" "}
                  ({proximaCota.faltaPares > 0 ? `${proximaCota.faltaPares} pares` : "meta de pares já atingida!"})
                </p>
              </div>
            </div>

            {diasRestantesTrabalho > 0 && (
              <div className="bg-white/80 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-semibold text-slate-700">
                Necessário:{" "}
                <strong className="text-blue-800">
                  {formatMoeda(proximaCota.faltaValor / diasRestantesTrabalho)}/dia
                </strong>{" "}
                nos {diasRestantesTrabalho} dias de trabalho restantes
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Two-Column: Vendas de Hoje & Projeções ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Vendas de Hoje */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Lançamento de Hoje
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {hojeInfo?.folga && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                    <Coffee className="w-3 h-3" />
                    Dia de Folga
                  </span>
                )}
                <span className="text-xs font-bold text-slate-400">
                  {formatDataCurta(dataHoje)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 my-5">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Hoje (R$)
                </span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  {formatMoeda(hojeTotais.valor)}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Pares
                </span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  {hojeTotais.pares}
                </p>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Vendas
                </span>
                <p className="text-lg sm:text-xl font-extrabold text-slate-900 mt-1">
                  {hojeTotais.qtd}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <button
              onClick={() => onOpenDia(dataHoje)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{hojeTotais.qtd > 0 ? "Ver / Adicionar Venda de Hoje" : "+ Lançar Primeira Venda de Hoje"}</span>
            </button>
          </div>
        </div>

        {/* Card Projeções e Ritmo Diário */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Ritmo Calibrado & Projeção
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {diasRestantesTrabalho} dias úteis de trabalho restantes
              </span>
            </div>

            <div className="space-y-3 my-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                <span className="text-slate-600 font-semibold">
                  Média diária atual de vendas:
                </span>
                <span className="font-extrabold text-slate-900 text-sm">
                  {formatMoeda(mediaDiariaAtual)} / dia trabalhado
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
                <span className="text-purple-900 font-semibold">
                  Projeção estimada de fechamento:
                </span>
                <span className="font-extrabold text-purple-900 text-sm">
                  {formatMoeda(projecaoFechamento)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-500">
            Dica: Marque seus dias de folga no calendário para que o ritmo de vendas necessário seja calculado com máxima precisão.
          </div>
        </div>
      </div>

      {/* ─── Últimos Lançamentos do Mês ────────────────────────────────── */}
      {diasComLancamentos.length > 0 && (
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-slate-900">
              Últimos Dias com Lançamentos
            </h3>
            <span className="text-xs font-medium text-slate-400">
              Clique para ver detalhes
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {diasComLancamentos.map(([dataStr, diaData]) => {
              const valorDia = diaData.itens.reduce((acc, i) => acc + i.valor, 0);
              const paresDia = diaData.itens.reduce((acc, i) => acc + i.pares, 0);

              return (
                <button
                  key={dataStr}
                  onClick={() => onOpenDia(dataStr)}
                  className="w-full py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex flex-col items-center justify-center font-bold text-xs border border-slate-200/80">
                      <span>{dataStr.split("-")[2]}</span>
                      <span className="text-[9px] uppercase text-slate-400 font-medium">
                        Dia
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {formatMoeda(valorDia)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {paresDia} {paresDia === 1 ? "par" : "pares"} · {diaData.itens.length}{" "}
                        {diaData.itens.length === 1 ? "venda" : "vendas"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {diaData.margem > 0 && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {diaData.margem.toFixed(1)}% margem
                      </span>
                    )}
                    <span className="text-xs font-bold text-blue-700">Ver →</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
