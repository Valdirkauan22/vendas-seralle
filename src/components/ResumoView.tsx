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
  Layers,
  Users,
  Share2,
  Calculator,
  BookOpen,
  MessageCircle,
  Mic,
  Sliders,
  Flame,
  Store,
  Target,
  Trophy,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useVendas } from "@/context/VendasContext";
import { useProfile } from "@/context/ProfileContext";
import {
  formatMoeda,
  getDataHoje,
  formatDataCurta,
  mesAnoExtenso,
  parseValorMonetario,
} from "@/utils/formatters";
import { CalculadoraCrediarioModal } from "./CalculadoraCrediarioModal";
import { ClientesNotasModal } from "./ClientesNotasModal";
import { VoiceSaleInputModal } from "./VoiceSaleInputModal";
import { AvisosRitmoBanner } from "./AvisosRitmoBanner";

interface ResumoViewProps {
  mesId: string;
  onOpenDia: (dataStr: string) => void;
  onOpenMetas: () => void;
  onOpenLembretes?: () => void;
}

const COTAS_INFO = [
  { key: "cotaA" as const, label: "Cota A", cor: "#10B981", bgCor: "bg-emerald-500", lightBg: "bg-emerald-50", borderCor: "border-emerald-300", textCor: "text-emerald-700" },
  { key: "cotaB" as const, label: "Cota B", cor: "#3B82F6", bgCor: "bg-blue-500", lightBg: "bg-blue-50", borderCor: "border-blue-300", textCor: "text-blue-700" },
  { key: "cotaC" as const, label: "Cota C", cor: "#8B5CF6", bgCor: "bg-purple-500", lightBg: "bg-purple-50", borderCor: "border-purple-300", textCor: "text-purple-700" },
  { key: "cotaAlta" as const, label: "Cota Alta", cor: "#F59E0B", bgCor: "bg-amber-500", lightBg: "bg-amber-50", borderCor: "border-amber-300", textCor: "text-amber-700" },
];

export function ResumoView({ mesId, onOpenDia, onOpenMetas, onOpenLembretes }: ResumoViewProps) {
  const { getTotalMes, getConfigMes, getDiaTotais, getDia, dias } = useVendas();
  const { perfilAtivo } = useProfile();

  const [showCalculadora, setShowCalculadora] = useState(false);
  const [showClientes, setShowClientes] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [simValorVendas, setSimValorVendas] = useState<number>(0);
  const [simComissaoPct, setSimComissaoPct] = useState<number>(2.5);
  const [showSimulador, setShowSimulador] = useState(false);

  const { adicionarItem } = useVendas();

  const totalMes = getTotalMes(mesId);
  const configMes = getConfigMes(mesId);

  // Sync default simulator commission with month configuration when loaded
  useEffect(() => {
    if (configMes?.comissaoPadraoPct) {
      setSimComissaoPct(configMes.comissaoPadraoPct);
    }
  }, [configMes?.comissaoPadraoPct]);
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

  // Commission & Bonus & DSR calculations
  const comissaoPct = configMes.comissaoPadraoPct ?? 2.5;
  const valorComissaoBase = (totalMes.valor * comissaoPct) / 100;
  const valorPremioCota = maiorCotaAtingida?.premio ?? 0;

  // DSR calculation (Descanso Semanal Remunerado)
  const diasUteis = configMes.diasUteisMes || 25;
  const domingosFeriados = configMes.domingosFeriadosMes || 5;
  const valorDsrEstimado = diasUteis > 0 ? (valorComissaoBase / diasUteis) * domingosFeriados : 0;

  const totalGanhosEstimados = valorComissaoBase + valorPremioCota + valorDsrEstimado;

  // Store meta vs Individual contribution
  const metaLojaValor = configMes.metaLojaValor || 250000;
  const metaLojaPares = configMes.metaLojaPares || 1800;
  const pctMinhaContribuicaoValor = metaLojaValor > 0 ? (totalMes.valor / metaLojaValor) * 100 : 0;
  const pctMinhaContribuicaoPares = metaLojaPares > 0 ? (totalMes.pares / metaLojaPares) * 100 : 0;
  const paMedioMes = totalMes.paMedio > 0 ? totalMes.paMedio : (totalMes.qtdVendas > 0 ? totalMes.pares / totalMes.qtdVendas : 0);

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

  // Pacing (Ritmo) calculations
  const ritmoNecessarioProxima = proximaCota
    ? proximaCota.faltaValor / diasRestantesTrabalho
    : 0;
  const estaNoRitmo = mediaDiariaAtual >= ritmoNecessarioProxima;
  const diferencaRitmo = mediaDiariaAtual - ritmoNecessarioProxima;

  // Simulator calculations
  const simValorEfetivo =
    simValorVendas > 0
      ? simValorVendas
      : Math.max(totalMes.valor, configMes.cotaB.valor || 50000);
  const simValorComissao = (simValorEfetivo * (simComissaoPct || 2.5)) / 100;
  const simValorDsr = diasUteis > 0 ? (simValorComissao / diasUteis) * domingosFeriados : 0;
  const simCotaAtingida = cotasStatus
    .slice()
    .reverse()
    .find((c) => simValorEfetivo >= c.target.valor && c.target.valor > 0);
  const simPremio = simCotaAtingida?.premio || 0;
  const simTotalLiquido = simValorComissao + simValorDsr + simPremio;

  // Recent days with sales
  const diasComLancamentos = Object.entries(dias)
    .filter(([d, val]) => d.startsWith(mesId) && val.itens.length > 0)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 5);

  // Record day of month (Melhor dia de vendas do mês)
  const recordeDiaMes = Object.entries(dias)
    .filter(([d, val]) => d.startsWith(mesId) && val.itens.length > 0)
    .map(([dataStr, val]) => ({
      dataStr,
      valor: val.itens.reduce((sum, item) => sum + item.valor, 0),
      pares: val.itens.reduce((sum, item) => sum + item.pares, 0),
    }))
    .sort((a, b) => b.valor - a.valor)[0] || null;

  // WhatsApp Share Generator
  const handleCompartilharWhatsApp = () => {
    const vendedora = perfilAtivo?.nome || "Vendedora Serallê";
    const texto = `👞 *DIÁRIO DE VENDAS SERALLÊ CALÇADOS*
📅 *Mês:* ${mesAnoExtenso(mesId)}
👤 *Vendedora:* ${vendedora}

💰 *Faturamento Total:* ${formatMoeda(totalMes.valor)}
👟 *Total de Pares:* ${totalMes.pares} pares
🛍️ *P.A. Médio:* ${(totalMes.paMedio || 0).toFixed(2)} peças/venda
🎯 *Taxa de Conversão:* ${(totalMes.taxaConversao || 0).toFixed(0)}%
📊 *Ticket Médio:* ${formatMoeda(ticketMedioVenda)}/venda

🏆 *Status de Cotas:*
${maiorCotaAtingida ? `✅ ${maiorCotaAtingida.label} CONQUISTADA! (+${formatMoeda(maiorCotaAtingida.premio)})` : "⏳ Em busca da Cota A"}
${proximaCota ? `🎯 Próximo Alvo: ${proximaCota.label} (Faltam ${formatMoeda(proximaCota.faltaValor)})` : "🌟 Cota Máxima Superada!"}

📈 *Projeção de Fechamento:* ${formatMoeda(projecaoFechamento)}
💵 *Estimativa Líquida (Comissão+DSR+Prêmio):* ${formatMoeda(totalGanhosEstimados)}

_Enviado pelo Diário de Vendas Serallê_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  return (
    <>
      <div className="space-y-6">
        {/* ─── Banner Inteligente de Ritmo & Fechamento de Turno ───────── */}
        <AvisosRitmoBanner
          mesId={mesId}
          onOpenLancarVenda={() => onOpenDia(getDataHoje())}
          onOpenLembretes={onOpenLembretes || (() => {})}
        />

        {/* ─── Fast Tool Bar (Calculadora, CRM Clientes, WhatsApp, Voz, Lembretes) ───────── */}
        <div className="bg-gradient-to-r from-slate-900 via-[#072448] to-slate-900 p-3 sm:p-4 rounded-2xl text-white shadow-md">
          {/* Header Title */}
          <div className="hidden sm:flex items-center justify-between pb-3 border-b border-white/10 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-amber-300">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black text-white leading-tight">
                  Atalhos Rápidos de Balcão & Vendas
                </h4>
                <p className="text-[11px] text-blue-200">
                  Simule parcelas no crediário, anote pedidos e compartilhe seus números
                </p>
              </div>
            </div>

            {onOpenLembretes && (
              <button
                type="button"
                onClick={onOpenLembretes}
                className="px-2.5 py-1 text-xs font-bold rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5 text-amber-300" />
                <span>Alertas & Turno</span>
              </button>
            )}
          </div>

          {/* Quick Action Buttons Grid (5 columns on larger screens, compact wrap on mobile) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button
              onClick={() => setShowVoiceModal(true)}
              className="py-2 px-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Lançar venda por voz"
            >
              <Mic className="w-3.5 h-3.5 text-white shrink-0" />
              <span className="truncate">Lançar por Voz</span>
            </button>

            <button
              onClick={() => setShowCalculadora(true)}
              className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white text-blue-950 hover:bg-blue-50 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Calculator className="w-3.5 h-3.5 text-[#0082D7] shrink-0" />
              <span className="truncate">Crediário</span>
            </button>

            <button
              onClick={() => setShowClientes(true)}
              className="py-2 px-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">Notas & Pedidos</span>
            </button>

            <button
              onClick={handleCompartilharWhatsApp}
              className="py-2 px-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              title="Compartilhar resumo no WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">WhatsApp</span>
            </button>

            {onOpenLembretes && (
              <button
                onClick={onOpenLembretes}
                className="col-span-2 sm:col-span-1 py-2 px-2.5 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                title="Configurar Lembretes de Fechamento de Turno e Ritmo"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate">Lembretes</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Metric Cards Grid (2x2 on Mobile, 4x1 on Desktop) ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
          {/* Total do Mês */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Vendas no Mês
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-none block">
                  {formatMoeda(totalMes.valor)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              <span>{totalMes.dias}d trab.</span>
              <span>·</span>
              <span>{totalMes.qtdVendas} atend.</span>
            </div>
          </div>

          {/* Total de Pares & PA */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Pares & P.A.
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Footprints className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {totalMes.pares}{" "}
                  <span className="text-xs font-semibold text-slate-400">pares</span>
                </span>
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                  PA {(totalMes.paMedio || 1).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1 text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              <span>Meta: {configMes.metaPa || 1.5}</span>
              <span>·</span>
              <span>{(totalMes.dias > 0 ? totalMes.pares / totalMes.dias : 0).toFixed(1)} par/dia</span>
            </div>
          </div>

          {/* Ganhos Estimados (Comissão + DSR + Prêmio) */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-emerald-900 uppercase tracking-wider truncate">
                  Estimativa Líquida
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3">
                <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-emerald-950 tracking-tight leading-none block">
                  {formatMoeda(totalGanhosEstimados)}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-emerald-100 flex flex-col gap-0.5 text-[10px] sm:text-[11px] text-emerald-900/80 font-medium">
              <div className="flex justify-between">
                <span>{comissaoPct}%: {formatMoeda(valorComissaoBase)}</span>
                <span>DSR: {formatMoeda(valorDsrEstimado)}</span>
              </div>
              {valorPremioCota > 0 && (
                <span className="font-bold text-emerald-800 truncate">+{formatMoeda(valorPremioCota)} prêmio cota</span>
              )}
            </div>
          </div>

          {/* Margem Média & Conversão */}
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Margem & Conv.
                </span>
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Percent className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
              <div className="mt-2 sm:mt-3 flex items-baseline justify-between gap-1 flex-wrap">
                <span className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight leading-none">
                  {totalMes.margem > 0 ? `${totalMes.margem.toFixed(1)}%` : "—"}
                </span>
                <span className="text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                  Conv. {(totalMes.taxaConversao || 100).toFixed(0)}%
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] sm:text-xs text-slate-500 font-medium truncate">
              <span>TM {formatMoeda(ticketMedioPar)}/par</span>
              <span className="hidden sm:inline">{formatMoeda(ticketMedioVenda)}/venda</span>
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
              className="text-xs font-bold text-[#0082D7] hover:text-blue-800 hover:underline flex items-center gap-1 cursor-pointer"
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

            {/* Cota Milestone Labels */}
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

          {/* Cotas Cards Grid (2x2 on mobile, 4x1 on desktop) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
            {cotasStatus.map((cota) => {
              const isProximoAlvo = proximaCota?.key === cota.key;

              return (
                <div
                  key={cota.key}
                  style={{
                    borderColor: cota.atingiuValor ? `${cota.cor}60` : undefined,
                  }}
                  className={`p-3 sm:p-4 rounded-xl border transition-all flex flex-col justify-between relative ${
                    cota.atingiuValor
                      ? `${cota.lightBg} border-2 shadow-2xs`
                      : isProximoAlvo
                      ? "bg-blue-50/40 border-2 border-blue-400 ring-2 ring-blue-400/20 shadow-xs"
                      : "bg-slate-50/70 border-slate-200"
                  }`}
                >
                  {isProximoAlvo && (
                    <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wide shadow-xs flex items-center gap-1">
                      <Target className="w-2.5 h-2.5" />
                      <span>Próximo Alvo</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <div
                          style={{ backgroundColor: cota.cor }}
                          className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full"
                        />
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {cota.label}
                        </span>
                      </div>

                      {cota.atingiuValor ? (
                        <span
                          style={{ color: cota.cor }}
                          className="inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-extrabold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Atingida</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] sm:text-[11px] font-bold ${isProximoAlvo ? "text-blue-700" : "text-slate-500"}`}>
                          {cota.pctValor.toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="mt-2.5 space-y-1 text-[11px] sm:text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Meta:</span>
                        <span className="font-bold text-slate-800">
                          {formatMoeda(cota.target.valor)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Pares:</span>
                        <span className="font-bold text-slate-800">
                          {cota.target.pares} p.
                        </span>
                      </div>
                      {cota.premio > 0 && (
                        <div className="flex justify-between text-[10px] sm:text-xs text-amber-800 font-semibold bg-amber-50/80 px-1.5 py-0.5 rounded-md">
                          <span className="flex items-center gap-0.5 truncate">
                            <Gift className="w-3 h-3 text-amber-600 shrink-0" />
                            Prêmio:
                          </span>
                          <span className="font-bold truncate">{formatMoeda(cota.premio)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Remaining status and mini progress */}
                  <div className="pt-2 mt-2 border-t border-slate-200/60">
                    {!cota.atingiuValor && (
                      <div>
                        {/* Mini progress bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 mb-1.5 overflow-hidden">
                          <div
                            style={{
                              width: `${Math.min(cota.pctValor, 100)}%`,
                              backgroundColor: isProximoAlvo ? "#2563EB" : cota.cor,
                            }}
                            className="h-full rounded-full transition-all duration-500"
                          />
                        </div>
                        <div className="text-[10px] sm:text-xs font-semibold text-slate-600 flex items-center justify-between">
                          <span>Falta:</span>
                          <span className="text-blue-700 font-extrabold truncate">
                            {formatMoeda(cota.faltaValor)}
                          </span>
                        </div>
                      </div>
                    )}
                    {cota.atingiuValor && (
                      <div className="text-[10px] sm:text-xs font-bold text-emerald-700 flex items-center justify-between">
                        <span className="truncate">Superada:</span>
                        <span className="truncate">+{formatMoeda(totalMes.valor - cota.target.valor)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
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

          {/* Store Meta vs Individual Vendedora Contribution */}
          <div className="mt-5 pt-5 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
                  <Store className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Meta Geral da Loja vs. Sua Contribuição
                  </h4>
                  <p className="text-xs text-slate-500">
                    Acompanhe a sua participação no faturamento e pares globais da filial
                  </p>
                </div>
              </div>
              <button
                onClick={onOpenMetas}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100/80 px-2.5 py-1.5 rounded-lg transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5" />
                Configurar Metas da Loja
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Contribuição em Faturamento */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Meta Loja (Faturamento):</span>
                  <span className="font-bold text-slate-900">{formatMoeda(metaLojaValor)}</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pctMinhaContribuicaoValor, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sua contribuição individual:</span>
                  <span className="font-bold text-indigo-700">
                    {formatMoeda(totalMes.valor)} ({pctMinhaContribuicaoValor.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Contribuição em Pares */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-slate-600">Meta Loja (Pares de Calçados):</span>
                  <span className="font-bold text-slate-900">{metaLojaPares} pares</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-2">
                  <div
                    className="bg-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(pctMinhaContribuicaoPares, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Sua contribuição individual:</span>
                  <span className="font-bold text-purple-700">
                    {totalMes.pares} pares ({pctMinhaContribuicaoPares.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
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
                    Vendas (PA {(hojeTotais.pa || 1).toFixed(1)})
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
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm shadow-md shadow-blue-700/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>{hojeTotais.qtd > 0 ? "Ver / Adicionar Venda de Hoje" : "+ Lançar Primeira Venda de Hoje"}</span>
              </button>
            </div>
          </div>

          {/* Card Indicador de Ritmo (Pacing) Calibrado */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <h3 className="text-base font-extrabold text-slate-900">
                    Indicador de Ritmo (Pacing)
                  </h3>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  {diasRestantesTrabalho} dias úteis restantes
                </span>
              </div>

              {/* Status do Ritmo Badge */}
              <div className="mt-3">
                {proximaCota ? (
                  <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold ${
                    estaNoRitmo
                      ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                      : "bg-amber-50 border-amber-300 text-amber-900"
                  }`}>
                    <div className="flex items-center gap-1.5 truncate">
                      {estaNoRitmo ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <TrendingUp className="w-4 h-4 text-amber-600 shrink-0" />
                      )}
                      <span className="truncate">
                        {estaNoRitmo
                          ? `No ritmo da ${proximaCota.label} (+${formatMoeda(diferencaRitmo)}/dia)`
                          : `Acelerar: precisa de +${formatMoeda(Math.abs(diferencaRitmo))}/dia`}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white text-[11px] shrink-0 border border-slate-200">
                      Meta {formatMoeda(ritmoNecessarioProxima)}/dia
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 flex items-center gap-2 text-xs font-bold">
                    <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Todas as 4 cotas do mês foram superadas! Ritmo espetacular!</span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5 my-3">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <span className="text-slate-600 font-semibold">
                    Média diária atual:
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {formatMoeda(mediaDiariaAtual)} / dia trabalhado
                  </span>
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-xs">
                  <span className="text-purple-900 font-semibold">
                    Projeção estimada de fechamento:
                  </span>
                  <span className="font-extrabold text-purple-900 text-sm">
                    {formatMoeda(projecaoFechamento)}
                  </span>
                </div>

                {/* Pacing de PA e Agregados */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                  <span className="text-blue-900 font-semibold">
                    Ritmo de PA (Peças/Atendimento):
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-blue-900 text-sm">
                      {(totalMes.paMedio || 1).toFixed(2)}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white text-blue-700 border border-blue-200">
                      Meta: {configMes.metaPa || 1.5}
                    </span>
                  </div>
                </div>

                {/* Melhor Dia de Vendas do Mês (Gamificação) */}
                {recordeDiaMes && recordeDiaMes.valor > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDia(recordeDiaMes.dataStr)}
                    className="w-full flex items-center justify-between p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 border border-amber-200 text-xs transition-colors cursor-pointer text-left group"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform">
                        <Trophy className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <span className="text-amber-950 font-bold block">
                          Recorde do Mês ({formatDataCurta(recordeDiaMes.dataStr)})
                        </span>
                        <span className="text-[11px] text-amber-800 font-medium">
                          {recordeDiaMes.pares} pares vendidos no melhor dia
                        </span>
                      </div>
                    </div>
                    <span className="font-extrabold text-amber-950 text-sm">
                      {formatMoeda(recordeDiaMes.valor)}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Simulador de Comissão & Remuneração Serallê ────────────────── */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Simulador de Comissão & Remuneração Variável
                  </h3>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase">
                    Interativo
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simule quanto vai entrar no seu bolso atingindo diferentes volumes de vendas
                </p>
              </div>
            </div>

            {/* Quick buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1">Simular:</span>
              {[30000, 45000, 60000, 80000, 100000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSimValorVendas(val)}
                  className={`px-2.5 py-1 text-xs font-extrabold rounded-lg border transition-all cursor-pointer ${
                    simValorEfetivo === val
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  {val >= 1000 ? `${val / 1000}k` : val}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-5">
            {/* Controles de Simulação */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Vendas Mensais Simuladas
                  </label>
                  <span className="text-base font-black text-emerald-800">
                    {formatMoeda(simValorEfetivo)}
                  </span>
                </div>
                <input
                  type="range"
                  min={15000}
                  max={130000}
                  step={1000}
                  value={simValorEfetivo}
                  onChange={(e) => setSimValorVendas(Number(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] font-semibold text-slate-400 mt-1">
                  <span>R$ 15.000</span>
                  <span>R$ 70.000</span>
                  <span>R$ 130.000</span>
                </div>
              </div>

              {/* Taxa de Comissão */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Taxa de Comissão Base (%)
                  </label>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-black text-blue-700">
                      {simComissaoPct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Botões Rápidos de Comissão até 6% */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mb-2.5">
                  {[1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setSimComissaoPct(pct)}
                      className={`py-1 px-1.5 text-[11px] font-extrabold rounded-lg border transition-all cursor-pointer text-center ${
                        simComissaoPct === pct
                          ? "bg-blue-700 text-white border-blue-700 shadow-2xs scale-[1.02]"
                          : "bg-white hover:bg-slate-50 text-slate-700 border-slate-200"
                      }`}
                    >
                      {pct.toFixed(1)}%
                    </button>
                  ))}
                </div>

                {/* Slider fino de comissão de 0.5% até 6.0% */}
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-1">
                    <span>Ajuste fino (até 6,0%):</span>
                    <span className="text-blue-700 font-extrabold">{simComissaoPct.toFixed(1)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={6.0}
                    step={0.1}
                    value={simComissaoPct}
                    onChange={(e) => setSimComissaoPct(parseFloat(e.target.value))}
                    className="w-full accent-blue-700 cursor-pointer h-1.5 bg-slate-200 rounded-lg"
                  />
                  <div className="flex justify-between text-[9px] font-semibold text-slate-400 mt-1">
                    <span>0.5%</span>
                    <span>2.5% (Padrão)</span>
                    <span>4.0%</span>
                    <span>6.0% (Máx)</span>
                  </div>
                </div>
              </div>

              {/* Status de Cota na Simulação */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Cota Conquistada na Simulação:
                </span>
                <div className="mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {simCotaAtingida ? (
                      <>
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-black text-slate-900">
                          {simCotaAtingida.label}
                        </span>
                      </>
                    ) : (
                      <span className="text-xs font-semibold text-slate-500">
                        Abaixo da Cota A
                      </span>
                    )}
                  </div>
                  {simPremio > 0 && (
                    <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      +{formatMoeda(simPremio)} prêmio
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Resultado dos Ganhos na Simulação */}
            <div className="lg:col-span-7 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-blue-50 p-5 rounded-2xl border border-emerald-200 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black text-emerald-900 uppercase tracking-wider">
                  Remuneração Variável Líquida Estimada
                </span>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
                    {formatMoeda(simTotalLiquido)}
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    estimativa no bolso
                  </span>
                </div>
                <p className="text-xs text-emerald-900/70 mt-1">
                  Baseado em {diasUteis} dias úteis e {domingosFeriados} repousos semanais
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-emerald-200/60">
                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                    Comissão ({simComissaoPct}%)
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block truncate">
                    {formatMoeda(simValorComissao)}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                    DSR Estimado
                  </span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 mt-0.5 block truncate">
                    {formatMoeda(simValorDsr)}
                  </span>
                </div>
                <div className="bg-white/80 backdrop-blur-xs p-2.5 rounded-xl border border-emerald-200/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block truncate">
                    Bônus Cota
                  </span>
                  <span className="text-xs sm:text-sm font-black text-amber-700 mt-0.5 block truncate">
                    +{formatMoeda(simPremio)}
                  </span>
                </div>
              </div>
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
                    className="w-full py-3 flex items-center justify-between hover:bg-slate-50 px-2 rounded-xl transition-colors text-left cursor-pointer"
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
                          {diaData.anotacoes ? ` · 📝 ${diaData.anotacoes}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {diaData.margem > 0 && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {diaData.margem.toFixed(1)}% margem
                        </span>
                      )}
                      <span className="text-xs font-bold text-[#0082D7]">Ver →</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {showCalculadora && (
        <CalculadoraCrediarioModal
          onClose={() => setShowCalculadora(false)}
          onAplicarVenda={(valorTotal) => {
            setShowCalculadora(false);
            onOpenDia(dataHoje);
          }}
        />
      )}

      {showClientes && (
        <ClientesNotasModal onClose={() => setShowClientes(false)} />
      )}

      {showVoiceModal && (
        <VoiceSaleInputModal
          isOpen={showVoiceModal}
          onClose={() => setShowVoiceModal(false)}
          onParsedSale={async (sale) => {
            setShowVoiceModal(false);
            const valor = parseValorMonetario(sale.valorStr);
            const pares = parseInt(sale.paresStr, 10) || 1;
            const agregados = parseInt(sale.agregadosStr, 10) || 0;
            if (valor > 0) {
              await adicionarItem(dataHoje, {
                valor,
                pares,
                produtosAgregados: agregados,
                descricao: sale.descricao || `${pares} par(es) ${sale.categoria}`,
                categoria: sale.categoria || "Feminino",
              });
              onOpenDia(dataHoje);
            } else {
              // Abre o dia de hoje para que a vendedora digite diretamente caso o microfone não tenha pegado o valor
              onOpenDia(dataHoje);
            }
          }}
        />
      )}
    </>
  );
}
