import React, { useState } from "react";
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
} from "lucide-react";
import { useVendas } from "@/context/VendasContext";
import {
  formatDataExtenso,
  formatMoeda,
  formatHora,
  parseValorMonetario,
} from "@/utils/formatters";
import { CATEGORIAS_PADRAO } from "@/types";

interface DiaModalProps {
  dataStr: string;
  onClose: () => void;
}

export function DiaModal({ dataStr, onClose }: DiaModalProps) {
  const { getDia, adicionarItem, removerItem, salvarMargemDia, alternarFolgaDia, removerDia } = useVendas();
  const diaData = getDia(dataStr) || { itens: [], margem: 0, folga: false };

  const [valorStr, setValorStr] = useState("");
  const [paresStr, setParesStr] = useState("1");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<string>("Feminino");
  const [margemInput, setMargemInput] = useState(
    diaData.margem > 0 ? String(diaData.margem) : ""
  );
  const [confirmClear, setConfirmClear] = useState(false);

  // Daily Totals
  const valorTotalDia = diaData.itens.reduce((acc, i) => acc + i.valor, 0);
  const paresTotalDia = diaData.itens.reduce((acc, i) => acc + i.pares, 0);
  const ticketMedio = paresTotalDia > 0 ? valorTotalDia / paresTotalDia : 0;

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

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const valor = parseValorMonetario(valorStr);
    const pares = parseInt(paresStr, 10) || 1;

    if (valor <= 0) return;

    await adicionarItem(dataStr, {
      valor,
      pares,
      descricao: descricao.trim() || `${pares} ${pares === 1 ? "par" : "pares"}`,
      categoria: categoria || "Geral",
    });

    // Reset item form
    setValorStr("");
    setParesStr("1");
    setDescricao("");
  };

  const handleSalvarMargem = async () => {
    const m = parseFloat(margemInput.replace(",", ".")) || 0;
    await salvarMargemDia(dataStr, m);
  };

  const handleToggleFolga = async () => {
    await alternarFolgaDia(dataStr);
  };

  const handleLimparDia = async () => {
    await removerDia(dataStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
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
                Lançamento e Controle de Vendas Diárias
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleFolga}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                diaData.folga
                  ? "bg-amber-500 text-white border-amber-600 shadow-xs"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>{diaData.folga ? "Dia de Folga (Ativo)" : "Marcar Folga"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {diaData.folga && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-xs text-amber-900 font-semibold">
              <Coffee className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Este dia está marcado como sua <strong>Folga</strong>. As metas diárias calculadas desconsideram este dia para manter seu ritmo real de trabalho.
              </span>
            </div>
          )}

          {/* Day Totals Banner */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl text-center">
              <span className="text-[11px] font-bold text-blue-900 uppercase">
                Total do Dia
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-blue-950 mt-0.5">
                {formatMoeda(valorTotalDia)}
              </p>
            </div>

            <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-center">
              <span className="text-[11px] font-bold text-emerald-900 uppercase">
                Pares
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-emerald-950 mt-0.5">
                {paresTotalDia}
              </p>
            </div>

            <div className="p-3 bg-purple-50/70 border border-purple-200/80 rounded-xl text-center">
              <span className="text-[11px] font-bold text-purple-900 uppercase">
                Ticket Médio
              </span>
              <p className="text-lg sm:text-xl font-extrabold text-purple-950 mt-0.5">
                {formatMoeda(ticketMedio)}
              </p>
            </div>
          </div>

          {/* Form to Add New Sale */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2 mb-3">
              <Plus className="w-4 h-4 text-blue-700" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Novo Lançamento
              </h4>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                      className="w-full pl-9 pr-3 py-2 text-sm font-extrabold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                    className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
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
                  placeholder="Ex: Scarpin Vizzano + Chinelo Coca"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-medium text-slate-900 bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Registrar Venda</span>
              </button>
            </form>
          </div>

          {/* Margem do Dia Field */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-amber-600" />
              <div>
                <span className="text-xs font-bold text-slate-800">
                  Margem do Dia (%)
                </span>
                <p className="text-[11px] text-slate-500">
                  Margem de lucro do dia para cálculo ponderado
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: 48.5"
                value={margemInput}
                onChange={(e) => setMargemInput(e.target.value)}
                onBlur={handleSalvarMargem}
                className="w-24 px-2.5 py-1.5 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={handleSalvarMargem}
                className="px-3 py-1.5 text-xs font-bold bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg transition-colors"
              >
                Salvar
              </button>
            </div>
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
                        </div>
                        <p className="text-xs text-slate-500">
                          {item.pares} {item.pares === 1 ? "par" : "pares"} · {item.descricao}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {item.hora && (
                        <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatHora(item.hora)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removerItem(dataStr, item.id)}
                        title="Excluir este lançamento"
                        className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
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
              className="text-xs font-bold text-red-600 hover:underline flex items-center gap-1"
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
                className="px-2 py-1 bg-red-600 text-white font-bold rounded-md hover:bg-red-700"
              >
                Sim, Limpar
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="px-2 py-1 bg-slate-200 text-slate-700 font-semibold rounded-md hover:bg-slate-300"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
