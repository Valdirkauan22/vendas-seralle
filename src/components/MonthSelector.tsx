import React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import {
  mesAnoExtenso,
  getMesAnterior,
  getProximoMes,
  getMesAtualId,
} from "@/utils/formatters";

interface MonthSelectorProps {
  currentMonthId: string;
  onMonthChange: (mesId: string) => void;
}

export function MonthSelector({ currentMonthId, onMonthChange }: MonthSelectorProps) {
  const mesAtual = getMesAtualId();
  const isCurrentMonth = currentMonthId === mesAtual;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-6">
      {/* Month Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onMonthChange(getMesAnterior(currentMonthId))}
          title="Mês Anterior"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="px-3 sm:px-4 py-1 text-center">
          <h2 className="text-base sm:text-lg font-extrabold text-slate-900 capitalize tracking-tight">
            {mesAnoExtenso(currentMonthId)}
          </h2>
          <span className="text-[11px] font-semibold text-slate-400">
            Período de Vendas
          </span>
        </div>

        <button
          onClick={() => onMonthChange(getProximoMes(currentMonthId))}
          title="Próximo Mês"
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Quick Today / Month Jump Button */}
      <div className="flex items-center gap-2 ml-auto">
        {!isCurrentMonth && (
          <button
            onClick={() => onMonthChange(mesAtual)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Voltar ao Mês Atual</span>
          </button>
        )}
        {isCurrentMonth && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/80">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Mês em Andamento
          </span>
        )}
      </div>
    </div>
  );
}
