import React, { useState, useEffect } from "react";
import {
  Bell,
  Clock,
  Flame,
  CheckCircle2,
  TrendingUp,
  PlusCircle,
  X,
  Sparkles,
  Sliders,
  Award,
  Target,
} from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import { formatMoeda, getDataHoje, getMesAtualId } from "@/utils/formatters";
import { getLembretesConfig } from "@/utils/notifications";

interface AvisosRitmoBannerProps {
  mesId: string;
  onOpenLancarVenda: () => void;
  onOpenLembretes: () => void;
}

export function AvisosRitmoBanner({
  mesId,
  onOpenLancarVenda,
  onOpenLembretes,
}: AvisosRitmoBannerProps) {
  const { getDiaTotais, getDia, getTotalMes, getConfigMes } = useVendas();
  const [dispensado, setDispensado] = useState(false);
  const [horaAtual, setHoraAtual] = useState(new Date());

  // Atualiza relógio a cada 30 segundos
  useEffect(() => {
    const timer = setInterval(() => {
      setHoraAtual(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  const hojeStr = getDataHoje();
  const eMesAtual = mesId === getMesAtualId();

  // Se não estiver visualizando o mês atual, não mostra o alerta de hoje
  if (!eMesAtual || dispensado) return null;

  const diaHoje = getDia(hojeStr);
  const totaisHoje = getDiaTotais(hojeStr);
  const totalMes = getTotalMes(mesId);
  const configMes = getConfigMes(mesId);
  const configLembretes = getLembretesConfig();

  // Se hoje é dia de folga marcado, não precisa de alerta de ritmo
  if (diaHoje?.folga) {
    return null;
  }

  // Identifica a próxima cota
  const cotas = [
    { label: "Cota A", ...configMes.cotaA },
    { label: "Cota B", ...configMes.cotaB },
    { label: "Cota C", ...configMes.cotaC },
    { label: "Cota Alta", ...configMes.cotaAlta },
  ];

  const proximaCota = cotas.find((c) => totalMes.valor < c.valor && c.valor > 0) || cotas[cotas.length - 1];

  // Cálculo de dias úteis e dias restantes
  const diasUteisTotais = configMes.diasUteisMes || 26;
  const diasPassados = totalMes.dias || 1;
  const diasRestantesTrabalho = Math.max(diasUteisTotais - diasPassados + (totaisHoje.qtd > 0 ? 0 : 1), 1);

  // Ritmo necessário por dia para alcançar a meta
  const faltaValorTotal = Math.max(0, proximaCota.valor - totalMes.valor);
  const faltaParesTotal = Math.max(0, proximaCota.pares - totalMes.pares);
  const ritmoDiarioValor = faltaValorTotal / diasRestantesTrabalho;
  const ritmoDiarioPares = Math.max(1, Math.round(faltaParesTotal / diasRestantesTrabalho));

  const bateuRitmoHoje = totaisHoje.valor >= ritmoDiarioValor && ritmoDiarioValor > 0;
  const diferencaHoje = totaisHoje.valor - ritmoDiarioValor;
  const paresFaltamHoje = Math.max(0, Math.ceil(ritmoDiarioPares - (totaisHoje.pares || 0)));

  // Verificação de Fechamento de Turno
  const [horaFim, minutoFim] = (configLembretes.horarioFechamento || "18:00")
    .split(":")
    .map(Number);
  const minutosAtuais = horaAtual.getHours() * 60 + horaAtual.getMinutes();
  const minutosFimTurno = (horaFim || 18) * 60 + (minutoFim || 0);
  const estaPertoFimTurno = minutosAtuais >= minutosFimTurno - 45; // 45 min antes ou depois do fim do turno
  const precisaFecharTurno = estaPertoFimTurno && totaisHoje.qtd === 0 && configLembretes.fechamentoTurnoAtivo;

  return (
    <div className="mb-4">
      {precisaFecharTurno ? (
        /* Card de Urgência: Fechamento de Turno */
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-orange-500/10 border border-amber-300 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-amber-900 uppercase tracking-wide">
                  ⏰ Fechamento de Turno ({configLembretes.horarioFechamento})
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-200 text-amber-900">
                  Importante
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-700 mt-0.5">
                Você ainda não registrou os atendimentos ou vendas de hoje. Feche seu turno para atualizar o ranking da loja!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onOpenLancarVenda}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Lançar Vendas de Hoje</span>
            </button>
            <button
              onClick={() => setDispensado(true)}
              className="p-2 rounded-xl hover:bg-amber-100/60 text-slate-400 hover:text-slate-600 transition-colors"
              title="Dispensar aviso por agora"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Card de Ritmo do Dia (Pacing) */
        <div className="p-3.5 sm:p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                bateuRitmoHoje
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  : "bg-amber-100 text-amber-800 border border-amber-300"
              }`}
            >
              {bateuRitmoHoje ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
              ) : (
                <Flame className="w-5 h-5 text-amber-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900">
                  {bateuRitmoHoje ? (
                    <span className="text-emerald-800 flex items-center gap-1">
                      🎉 Ritmo do Dia Superado!
                    </span>
                  ) : (
                    <span className="text-slate-900">
                      ⚡ Ritmo Diário de Hoje ({proximaCota.label})
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-bold text-slate-400 hidden md:inline">
                  • Meta do dia: {formatMoeda(ritmoDiarioValor)} ({ritmoDiarioPares} pares) • Faltam {formatMoeda(faltaValorTotal)} para a {proximaCota.label}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-0.5">
                {bateuRitmoHoje ? (
                  <span>
                    Você já atingiu <b>{formatMoeda(totaisHoje.valor)}</b> ({totaisHoje.pares} pares) hoje — saldo positivo de{" "}
                    <b className="text-emerald-700">+{formatMoeda(diferencaHoje)}</b>!
                  </span>
                ) : (
                  <span>
                    Hoje você vendeu <b>{formatMoeda(totaisHoje.valor)}</b> ({totaisHoje.pares} pares).{" "}
                    <span className="font-extrabold text-amber-800">
                      {paresFaltamHoje > 0
                        ? `Faltam só ${paresFaltamHoje} par${paresFaltamHoje > 1 ? "es" : ""} (${formatMoeda(Math.abs(diferencaHoje))}) para o ritmo de hoje!`
                        : `Faltam só ${formatMoeda(Math.abs(diferencaHoje))} para o ritmo de hoje!`}
                    </span>
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              onClick={onOpenLancarVenda}
              className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-extrabold flex items-center gap-1 shadow-xs transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+ Venda</span>
            </button>

            <button
              onClick={onOpenLembretes}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-[#0082D7] transition-colors border border-slate-200 cursor-pointer"
              title="Configurar Lembretes e Alertas de Turno"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDispensado(true)}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Dispensar por agora"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
