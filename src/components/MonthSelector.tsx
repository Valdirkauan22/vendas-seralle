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
    <div className="flex items-center justify-between gap-2 bg-white px-3 py-2 sm:p-4 rounded-2xl border border-slate-200 shadow-xs mb-4 sm:mb-6">
      {/* Month Navigation */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          onClick={() => onMonthChange(getMesAnterior(currentMonthId))}
          title="Mês Anterior"
          className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="px-2 sm:px-4 py-0.5 text-center">
          <h2 className="text-sm sm:text-lg font-extrabold text-slate-900 capitalize tracking-tight leading-tight">
            {mesAnoExtenso(currentMonthId)}
          </h2>
          <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 block leading-none mt-0.5">
            Período de Vendas
          </span>
        </div>

        <button
          onClick={() => onMonthChange(getProximoMes(currentMonthId))}
          title="Próximo Mês"
          className="p-1.5 sm:p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Quick Today / Month Jump Button */}
      <div className="flex items-center gap-1.5 ml-auto">
        {!isCurrentMonth && (
          <button
            onClick={() => onMonthChange(mesAtual)}
            className="flex items-center gap-1 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] sm:text-xs font-bold border border-blue-200 transition-colors whitespace-nowrap"
          >
            <CalendarIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">Voltar ao Mês Atual</span>
            <span className="sm:hidden">Mês Atual</span>
          </button>
        )}
        {isCurrentMonth && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1 rounded-full bg-emerald-50 text-emerald-700 text-[11px] sm:text-xs font-bold border border-emerald-200/80 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">Mês em Andamento</span>
            <span className="sm:hidden">Ativo</span>
          </span>
        )}
      </div>
    </div>
  );
}
