import React from "react";
import { Plus, Check, Coffee } from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import {
  DIAS_SEMANA_ABREV,
  formatMoeda,
  getDataHoje,
} from "@/utils/formatters";

interface HistoricoCalendarioViewProps {
  mesId: string;
  onOpenDia: (dataStr: string) => void;
}

export function HistoricoCalendarioView({
  mesId,
  onOpenDia,
}: HistoricoCalendarioViewProps) {
  const { dias } = useVendas();
  const dataHoje = getDataHoje();

  const [ano, mes] = mesId.split("-").map(Number);

  // Total days in month
  const totalDias = new Date(ano, mes, 0).getDate();

  // First day of month weekday (0 = Dom, 1 = Seg, ..., 6 = Sáb)
  const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();

  // Generate blank prefix cells
  const blankCells = Array.from({ length: primeiroDiaSemana }, (_, i) => i);

  // Generate day numbers array
  const dayNumbers = Array.from({ length: totalDias }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
              Calendário de Vendas & Escala
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Clique em qualquer dia para registrar vendas, editar margem ou marcar/desmarcar folga
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300 inline-block" />
              Com Vendas
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-100 border border-amber-300 inline-block" />
              Folga
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-blue-100 border border-blue-400 inline-block" />
              Hoje
            </span>
          </div>
        </div>

        {/* Weekday Column Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2 text-center">
          {DIAS_SEMANA_ABREV.map((diaAbrev, idx) => (
            <div
              key={diaAbrev}
              className={`py-2 text-xs font-bold uppercase tracking-wider ${
                idx === 0 || idx === 6 ? "text-slate-400" : "text-slate-700"
              }`}
            >
              {diaAbrev}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {/* Blank prefix cells */}
          {blankCells.map((b) => (
            <div
              key={`blank-${b}`}
              className="min-h-[70px] sm:min-h-[90px] rounded-xl bg-slate-50/40 border border-transparent"
            />
          ))}

          {/* Actual Month Days */}
          {dayNumbers.map((num) => {
            const dataStr = `${mesId}-${String(num).padStart(2, "0")}`;
            const diaData = dias[dataStr];
            const isToday = dataStr === dataHoje;
            const isFolga = Boolean(diaData?.folga);

            const temVendas = diaData && diaData.itens && diaData.itens.length > 0;
            const valorTotalDia = temVendas
              ? diaData.itens.reduce((acc, i) => acc + i.valor, 0)
              : 0;
            const paresTotalDia = temVendas
              ? diaData.itens.reduce((acc, i) => acc + i.pares, 0)
              : 0;

            return (
              <button
                key={dataStr}
                onClick={() => onOpenDia(dataStr)}
                className={`min-h-[75px] sm:min-h-[95px] p-2 rounded-xl border text-left transition-all relative flex flex-col justify-between group hover:shadow-md ${
                  isToday
                    ? "border-blue-500 ring-2 ring-blue-400/30 bg-blue-50/30"
                    : isFolga
                    ? "border-amber-200 bg-amber-50/40 hover:border-amber-300"
                    : temVendas
                    ? "border-emerald-200 bg-emerald-50/30 hover:border-emerald-300"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70"
                }`}
              >
                {/* Day Number Header */}
                <div className="flex items-center justify-between w-full">
                  <span
                    className={`text-xs sm:text-sm font-extrabold w-6 h-6 rounded-full flex items-center justify-center ${
                      isToday
                        ? "bg-blue-700 text-white shadow-xs"
                        : isFolga
                        ? "text-amber-900 bg-amber-200/80"
                        : temVendas
                        ? "text-emerald-900 bg-emerald-100"
                        : "text-slate-700"
                    }`}
                  >
                    {num}
                  </span>

                  {isFolga ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-700">
                      <Coffee className="w-3 h-3" />
                      <span className="hidden sm:inline">Folga</span>
                    </span>
                  ) : temVendas ? (
                    <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700">
                      <Check className="w-3 h-3" />
                    </span>
                  ) : null}
                </div>

                {/* Day Sales Content */}
                {temVendas ? (
                  <div className="mt-1">
                    <p className="text-[11px] sm:text-xs font-extrabold text-slate-900 truncate">
                      {formatMoeda(valorTotalDia)}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold mt-0.5">
                      <span>{paresTotalDia} {paresTotalDia === 1 ? "par" : "pares"}</span>
                      {diaData.margem > 0 && (
                        <span className="hidden sm:inline text-emerald-700 font-bold">
                          {diaData.margem.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </div>
                ) : isFolga ? (
                  <div className="mt-auto text-[10px] font-semibold text-amber-800">
                    Escala de Folga
                  </div>
                ) : (
                  <div className="mt-auto opacity-0 group-hover:opacity-100 transition-opacity flex justify-end">
                    <span className="w-5 h-5 rounded-md bg-slate-200 text-slate-600 flex items-center justify-center text-[10px]">
                      <Plus className="w-3 h-3" />
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
