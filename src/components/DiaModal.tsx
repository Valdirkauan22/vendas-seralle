import React, { useState, useRef } from "react";
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Percent,
  Footprints,
  Clock,
  Coffee,
  Tag,
  ShoppingBag,
  Sparkles,
  Users,
  Layers,
  MessageSquare,
  Calculator,
  Mic,
  Check,
  AlertCircle,
  Edit3,
  Share2,
  RotateCcw,
  TrendingUp,
} from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import {
  formatDataExtenso,
  formatMoeda,
  formatHora,
  parseValorMonetario,
} from "@/utils/formatters";
import { CATEGORIAS_PADRAO } from "@/types";
import { CalculadoraCrediarioModal } from "./CalculadoraCrediarioModal";
import { VoiceSaleInputModal } from "./VoiceSaleInputModal";

interface DiaModalProps {
  dataStr: string;
  onClose: () => void;
}

export function DiaModal({ dataStr, onClose }: DiaModalProps) {
  const {
    getDia,
    adicionarItem,
    editarItem,
    restaurarItem,
    removerItem,
    salvarMargemDia,
    salvarAtendimentosDia,
    salvarAnotacoesDia,
    alternarFolgaDia,
    removerDia,
  } = useVendas();

  const diaData = getDia(dataStr) || { itens: [], margem: 0, folga: false };

  const [valorStr, setValorStr] = useState("");
  const [paresStr, setParesStr] = useState("1");
  const [agregadosStr, setAgregadosStr] = useState("0");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>("Feminino");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [deletedItemUndo, setDeletedItemUndo] = useState<any | null>(null);
  const undoTimeoutRef = useRef<any>(null);

  const [margemInput, setMargemInput] = useState(
    diaData.margem > 0 ? String(diaData.margem) : ""
  );
  const [atendimentosInput, setAtendimentosInput] = useState(
    diaData.atendimentosTotais ? String(diaData.atendimentosTotais) : ""
  );
  const [anotacoesInput, setAnotacoesInput] = useState(
    diaData.anotacoes || ""
  );
  const [showCalculadora, setShowCalculadora] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Daily Totals
  const valorTotalDia = diaData.itens.reduce((acc, i) => acc + i.valor, 0);
  const paresTotalDia = diaData.itens.reduce((acc, i) => acc + i.pares, 0);
  const agregadosTotalDia = diaData.itens.reduce(
    (acc, i) => acc + (i.produtosAgregados || 0),
    0
  );
  const totalPecas = paresTotalDia + agregadosTotalDia;
  const qtdVendas = diaData.itens.length;
  const paDia = qtdVendas > 0 ? (totalPecas / qtdVendas) : 0;
  const ticketMedio = paresTotalDia > 0 ? valorTotalDia / paresTotalDia : 0;
  const atendimentos = diaData.atendimentosTotais || qtdVendas;
  const taxaConversao =
    atendimentos > 0 ? Math.min(100, (qtdVendas / atendimentos) * 100) : 100;

  // Handle currency input formatting
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setValorStr("");
      return;
    }
    const num = parseInt(raw, 10) / 100;
    setValorStr(
      num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleAddItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const valor = parseValorMonetario(valorStr);
    const pares = parseInt(paresStr, 10) || 1;
    const agregados = parseInt(agregadosStr, 10) || 0;

    if (valor <= 0) {
      setFormError("Informe o valor da venda para registrar (ex: R$ 150,00).");
      return false;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      if (editingItemId) {
        // Atualizando venda existente
        await editarItem(dataStr, editingItemId, {
          valor,
          pares,
          produtosAgregados: agregados,
          descricao:
            descricao.trim() ||
            `${pares} ${pares === 1 ? "par" : "pares"}${
              agregados > 0 ? ` + ${agregados} agregado(s)` : ""
            }`,
          categoria: categoria || "Geral",
        });
        setSuccessMsg(`✓ Venda alterada para ${formatMoeda(valor)} com sucesso!`);
        setEditingItemId(null);
      } else {
        // Nova venda
        await adicionarItem(dataStr, {
          valor,
          pares,
          produtosAgregados: agregados,
          descricao:
            descricao.trim() ||
            `${pares} ${pares === 1 ? "par" : "pares"}${
              agregados > 0 ? ` + ${agregados} agregado(s)` : ""
            }`,
          categoria: categoria || "Geral",
        });
        setSuccessMsg(`✓ Venda de ${formatMoeda(valor)} registrada com sucesso!`);
      }

      setTimeout(() => setSuccessMsg(null), 3500);

      // Reset item form
      setValorStr("");
      setParesStr("1");
      setAgregadosStr("0");
      setDescricao("");
      return true;
    } catch (err) {
      setFormError("Erro ao registrar a venda. Tente novamente.");
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (item: any) => {
    setEditingItemId(item.id);
    setValorStr(
      item.valor.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
    setParesStr(String(item.pares || 1));
    setAgregadosStr(String(item.produtosAgregados || 0));
    setCategoria(item.categoria || "Feminino");
    setDescricao(item.descricao || "");
    setFormError(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setValorStr("");
    setParesStr("1");
    setAgregadosStr("0");
    setDescricao("");
    setFormError(null);
  };

  const handleDeleteWithUndo = async (item: any) => {
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    setDeletedItemUndo(item);
    await removerItem(dataStr, item.id);
    // Auto fecha o toast após 6s
    undoTimeoutRef.current = setTimeout(() => {
      setDeletedItemUndo(null);
    }, 6000);
  };

  const handleUndoDelete = async () => {
    if (!deletedItemUndo) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    await restaurarItem(dataStr, deletedItemUndo);
    setSuccessMsg(`✓ Venda de ${formatMoeda(deletedItemUndo.valor)} restaurada!`);
    setTimeout(() => setSuccessMsg(null), 3500);
    setDeletedItemUndo(null);
  };

  const handleCompartilharWhatsAppDia = () => {
    const texto = `*📊 FECHAMENTO DO DIA - SERALLÊ CALÇADOS*
📅 Data: *${formatDataExtenso(dataStr)}*
💰 Total Vendido: *${formatMoeda(valorTotalDia)}*
👠 Pares Vendidos: *${paresTotalDia} pares*
🎯 PA (Peças/Atendimento): *${paDia.toFixed(2)}*
🧦 Agregados (Meias/Sprays): *${agregadosTotalDia}*
${diaData.margem > 0 ? `📈 Margem Média: *${diaData.margem.toFixed(1)}%*\n` : ""}👥 Atendimentos: *${atendimentos}* (${taxaConversao.toFixed(0)}% conversão)
${diaData.anotacoes ? `📝 Obs: _"${diaData.anotacoes}"_\n` : ""}
_Enviado pelo Diário de Vendas Serallê_`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
    window.open(url, "_blank");
  };

  const handleConcluir = async () => {
    // Se a vendedora digitou um valor no formulário e clicou diretamente em Concluir,
    // salva automaticamente a venda antes de fechar o modal para não perder os dados!
    const valor = parseValorMonetario(valorStr);
    if (valor > 0) {
      await handleAddItem();
    }
    onClose();
  };

  const handleSalvarMargem = async () => {
    const m = parseFloat(margemInput.replace(",", ".")) || 0;
    await salvarMargemDia(dataStr, m);
  };

  const handleSalvarAtendimentos = async () => {
    const at = parseInt(atendimentosInput, 10) || 0;
    await salvarAtendimentosDia(dataStr, at);
  };

  const handleSalvarAnotacoes = async () => {
    await salvarAnotacoesDia(dataStr, anotacoesInput.trim());
  };

  const handleToggleFolga = async () => {
    await alternarFolgaDia(dataStr);
  };

  const handleLimparDia = async () => {
    await removerDia(dataStr);
    onClose();
  };

  const handleQuickAddValue = (v: number) => {
    setValorStr(
      v.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-700 text-white flex items-center justify-center shadow-xs">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 capitalize">
                  {formatDataExtenso(dataStr)}
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Lançamento de Vendas, Peças por Atendimento (PA) & Conversão
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleCompartilharWhatsAppDia}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Compartilhar Fechamento no WhatsApp"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => setShowVoiceModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-blue-700 to-sky-700 hover:from-blue-800 hover:to-sky-800 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer animate-pulse hover:animate-none"
                title="Lançamento Rápido por Voz"
              >
                <Mic className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lançar por Voz</span>
                <span className="sm:hidden">Voz</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCalculadora(true)}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-sky-50 text-[#0082D7] border border-sky-200 hover:bg-sky-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Calculadora de Crediário e Balcão"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Calculadora</span>
              </button>

              <button
                type="button"
                onClick={handleToggleFolga}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 cursor-pointer ${
                  diaData.folga
                    ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Coffee className="w-3.5 h-3.5" />
                <span>{diaData.folga ? "Folga" : "Folga"}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 flex-1">
            {diaData.folga && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
                <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Este dia está marcado como sua <strong>Folga</strong>. As metas diárias calculadas desconsideram este dia para manter seu ritmo real de trabalho.
                </span>
              </div>
            )}

            {/* Day Totals Banner: Valor, Pares, PA, Conversão */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-blue-900 uppercase">
                  Total do Dia
                </span>
                <p className="text-base sm:text-lg font-black text-blue-950 mt-0.5">
                  {formatMoeda(valorTotalDia)}
                </p>
              </div>

              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-emerald-900 uppercase">
                  Pares Vendidos
                </span>
                <p className="text-base sm:text-lg font-black text-emerald-950 mt-0.5">
                  {paresTotalDia} {agregadosTotalDia > 0 && <span className="text-xs text-emerald-700">+{agregadosTotalDia} ag.</span>}
                </p>
              </div>

              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-xl text-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-purple-900 uppercase">
                  PA (Peças / Venda)
                </span>
                <p className="text-base sm:text-lg font-black text-purple-950 mt-0.5">
                  {paDia.toFixed(2)}
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                <span className="text-[10px] sm:text-[11px] font-bold text-amber-900 uppercase">
                  Conversão
                </span>
                <p className="text-base sm:text-lg font-black text-amber-950 mt-0.5">
                  {taxaConversao.toFixed(0)}%
                </p>
              </div>
            </div>

            {/* Form to Add / Edit Sale */}
            <div className={`p-4 rounded-xl border transition-all ${
              editingItemId ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/30" : "bg-slate-50 border-slate-200"
            }`}>
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2">
                  {editingItemId ? (
                    <>
                      <Edit3 className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                        Editando Lançamento
                      </h4>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="text-[11px] font-bold text-slate-500 hover:text-slate-800 underline ml-2 cursor-pointer"
                      >
                        Cancelar Edição
                      </button>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-blue-700" />
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                        Novo Lançamento
                      </h4>
                    </>
                  )}
                </div>

                {/* Botões Rápidos de Valor de Calçado Serallê */}
                {!editingItemId && (
                  <div className="flex items-center gap-1 flex-wrap">
                    <span className="text-[10px] font-bold text-slate-400 mr-1">Rápidos:</span>
                    {[99.9, 149.9, 199.9, 249.9, 299.9, 349.9, 399.9].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => handleQuickAddValue(v)}
                        className="px-2 py-0.5 text-[10px] font-extrabold bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 rounded-md transition-colors cursor-pointer active:scale-95"
                      >
                        {v.toFixed(0)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Feedback messages */}
              {successMsg && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}
              {formError && (
                <div className="mb-3 p-3 bg-red-50 border border-red-300 rounded-xl text-xs font-bold text-red-700 flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Undo Toast Notification */}
              {deletedItemUndo && (
                <div className="mb-3 p-3 bg-slate-900 text-white rounded-xl text-xs font-medium flex items-center justify-between shadow-lg animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Venda de <strong>{formatMoeda(deletedItemUndo.valor)}</strong> excluída.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleUndoDelete}
                    className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-lg transition-all cursor-pointer active:scale-95"
                  >
                    Desfazer
                  </button>
                </div>
              )}

              <form onSubmit={handleAddItem} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Valor Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Valor da Venda (R$) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0,00"
                        value={valorStr}
                        onChange={handleValorChange}
                        required
                        className="w-full pl-9 pr-3 py-2 text-sm font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0082D7] focus:border-[#0082D7]"
                      />
                    </div>
                  </div>

                  {/* Pares Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Qtd de Pares *
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={paresStr}
                      onChange={(e) => setParesStr(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0082D7]"
                    />
                  </div>

                  {/* Agregados (Meias / Cremes / Sprays) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-emerald-600" />
                      Agregados (Meias/Sprays)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={agregadosStr}
                      onChange={(e) => setAgregadosStr(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Categoria Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    Categoria de Calçado
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORIAS_PADRAO.map((cat) => {
                      const isSelected = categoria === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setCategoria(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-blue-700 text-white shadow-2xs"
                              : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Descrição / Observação */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Descrição / Marcas / Modelos (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Scarpin Vizzano + Cinto / Tênis Mizuno + Meia"
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0082D7]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-2.5 rounded-lg text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                    editingItemId
                      ? "bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400"
                      : "bg-blue-700 hover:bg-blue-800 disabled:bg-blue-400"
                  }`}
                >
                  {editingItemId ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{isSubmitting ? "Salvando Alterações..." : "Salvar Alterações da Venda"}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>{isSubmitting ? "Registrando Venda..." : "Registrar Venda"}</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Atendimentos & Margem & Anotações do Dia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Margem do Dia */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-600" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Margem do Dia (%)
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Lucratividade média do dia
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Ex: 48.5"
                    value={margemInput}
                    onChange={(e) => setMargemInput(e.target.value)}
                    onBlur={handleSalvarMargem}
                    className="w-20 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-[#0082D7] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleSalvarMargem}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              {/* Total de Atendimentos (Taxa de Conversão) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#0082D7]" />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Total de Atendimentos
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Pessoas atendidas no salão
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    placeholder={String(diaData.itens.length || 0)}
                    value={atendimentosInput}
                    onChange={(e) => setAtendimentosInput(e.target.value)}
                    onBlur={handleSalvarAtendimentos}
                    className="w-20 px-2 py-1 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-[#0082D7] focus:outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleSalvarAtendimentos}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>

            {/* Bloco de Anotações do Dia */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Anotações / Ocorrências do Plantão</span>
                </div>
                <button
                  type="button"
                  onClick={handleSalvarAnotacoes}
                  className="text-[11px] font-bold text-[#0082D7] hover:underline"
                >
                  Salvar Nota
                </button>
              </div>
              <input
                type="text"
                value={anotacoesInput}
                onChange={(e) => setAnotacoesInput(e.target.value)}
                onBlur={handleSalvarAnotacoes}
                placeholder="Ex: Movimento forte de manhã, falta de numeração no tênis Puma"
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-[#0082D7]"
              />
            </div>

            {/* Registered Items List */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Vendas Lançadas ({diaData.itens.length})
                </h4>
              </div>

              {diaData.itens.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  Nenhuma venda lançada neste dia. Use o formulário acima para registrar.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {diaData.itens.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-3 bg-white flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-extrabold text-xs">
                          #{idx + 1}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-extrabold text-slate-900">
                              {formatMoeda(item.valor)}
                            </p>
                            {item.categoria && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                                {item.categoria}
                              </span>
                            )}
                            {item.produtosAgregados && item.produtosAgregados > 0 ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                +{item.produtosAgregados} ag.
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-slate-500">
                            {item.pares} {item.pares === 1 ? "par" : "pares"} · {item.descricao}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {item.hora && (
                          <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mr-1 hidden sm:flex">
                            <Clock className="w-3 h-3" />
                            {formatHora(item.hora)}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          title="Editar este lançamento"
                          className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWithUndo(item)}
                          title="Excluir este lançamento (permite desfazer)"
                          className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            {diaData.itens.length > 0 && !confirmClear ? (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar todos os lançamentos</span>
              </button>
            ) : confirmClear ? (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-red-700 font-bold">Confirma exclusão?</span>
                <button
                  type="button"
                  onClick={handleLimparDia}
                  className="px-2 py-1 bg-red-600 text-white font-bold rounded-md hover:bg-red-700 cursor-pointer"
                >
                  Sim, Limpar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div />
            )}

            <button
              type="button"
              onClick={handleConcluir}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Concluir
            </button>
          </div>
        </div>
      </div>

      {showCalculadora && (
        <CalculadoraCrediarioModal
          onClose={() => setShowCalculadora(false)}
          onAplicarVenda={(valorTotal, desc) => {
            setValorStr(
              valorTotal.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })
            );
            setDescricao(desc);
          }}
        />
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
              await adicionarItem(dataStr, {
                valor,
                pares,
                produtosAgregados: agregados,
                categoria: sale.categoria || "Feminino",
                descricao: sale.descricao || `${pares} par(es) ${sale.categoria}`,
              });
              setSuccessMsg(`✓ Venda por voz de ${formatMoeda(valor)} registrada com sucesso!`);
              setTimeout(() => setSuccessMsg(null), 3500);
            } else {
              setValorStr(sale.valorStr);
              setParesStr(sale.paresStr);
              setAgregadosStr(sale.agregadosStr);
              setCategoria(sale.categoria);
              setDescricao(sale.descricao);
            }
          }}
        />
      )}
    </>
  );
}
