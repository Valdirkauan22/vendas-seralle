import React, { useState } from "react";
import {
  Calculator,
  Percent,
  X,
  CreditCard,
  CheckCircle2,
  DollarSign,
  Divide,
  Sparkles,
} from "lucide-react";
import { formatMoeda, parseValorMonetario } from "@/utils/formatters";

interface CalculadoraCrediarioModalProps {
  onClose: () => void;
  onAplicarVenda?: (valorTotal: number, descricao: string) => void;
}

export function CalculadoraCrediarioModal({
  onClose,
  onAplicarVenda,
}: CalculadoraCrediarioModalProps) {
  const [valorStr, setValorStr] = useState("");
  const [parcelas, setParcelas] = useState(6);
  const [entradaStr, setEntradaStr] = useState("");
  const [jurosPct, setJurosPct] = useState(0); // juros mensal % se houver
  const [descontoPct, setDescontoPct] = useState(0);

  const valorOriginal = parseValorMonetario(valorStr);
  const entrada = parseValorMonetario(entradaStr);

  const valorComDesconto =
    descontoPct > 0
      ? valorOriginal * (1 - descontoPct / 100)
      : valorOriginal;

  const valorRestante = Math.max(0, valorComDesconto - entrada);

  // Cálculo com juros simples/compostos ou sem juros
  let valorFinalFinanciado = valorRestante;
  if (jurosPct > 0 && parcelas > 0) {
    valorFinalFinanciado = valorRestante * Math.pow(1 + jurosPct / 100, parcelas);
  }

  const valorParcela = parcelas > 0 ? valorFinalFinanciado / parcelas : 0;
  const valorTotalFinal = entrada + valorFinalFinanciado;

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

  const handleEntradaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setEntradaStr("");
      return;
    }
    const num = parseInt(raw, 10) / 100;
    setEntradaStr(
      num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-700 to-sky-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Calculator className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white">
                Calculadora Rápida de Balcão & Crediário
              </h3>
              <p className="text-xs text-blue-100">
                Simule parcelamento Serallê, entradas e descontos no ato da venda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Valor da Venda */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Valor Total do Calçado / Compra (R$)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
                R$
              </span>
              <input
                type="text"
                value={valorStr}
                onChange={handleValorChange}
                placeholder="0,00"
                autoFocus
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-lg font-extrabold text-slate-900 focus:bg-white focus:border-[#0082D7] focus:ring-2 focus:ring-[#0082D7]/20 outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Atalhos Rápidos de Valor */}
          <div className="flex flex-wrap gap-1.5">
            {[99.9, 149.9, 199.9, 249.9, 299.9, 399.9].map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => {
                  setValorStr(
                    v.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  );
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-sky-50 hover:text-[#0082D7] rounded-lg text-slate-700 transition-colors cursor-pointer"
              >
                R$ {v.toFixed(2).replace(".", ",")}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            {/* Entrada */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Entrada (R$)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  R$
                </span>
                <input
                  type="text"
                  value={entradaStr}
                  onChange={handleEntradaChange}
                  placeholder="0,00"
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-[#0082D7] outline-hidden"
                />
              </div>
            </div>

            {/* Desconto à Vista ou Especial */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Desconto (%)
                </label>
                {descontoPct > 0 && (
                  <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    {descontoPct}% OFF
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min="0"
                  max="40"
                  value={descontoPct === 0 ? "" : descontoPct}
                  onChange={(e) => {
                    const val = Math.min(40, Math.max(0, Number(e.target.value) || 0));
                    setDescontoPct(val);
                  }}
                  placeholder="0%"
                  className="w-full pl-3 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-[#0082D7] outline-hidden text-center"
                />
              </div>
            </div>
          </div>

          {/* Atalhos Rápidos de Desconto até 40% */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                Desconto Rápido (Até 40%):
              </span>
              {descontoPct > 0 && valorOriginal > 0 && (
                <span className="text-[11px] font-bold text-emerald-700">
                  Economia de {formatMoeda((valorOriginal * descontoPct) / 100)}
                </span>
              )}
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-9 gap-1">
              {[0, 5, 10, 15, 20, 25, 30, 35, 40].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDescontoPct(d)}
                  className={`py-1.5 text-xs font-extrabold rounded-lg border transition-all cursor-pointer text-center ${
                    descontoPct === d
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs scale-105"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300"
                  }`}
                >
                  {d === 0 ? "Sem" : `${d}%`}
                </button>
              ))}
            </div>
          </div>

          {/* Opções de Parcelas */}
          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Número de Parcelas (Sem Juros / Crediário Serallê)
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setParcelas(p)}
                  className={`py-2 px-1 text-xs font-extrabold rounded-xl border transition-all cursor-pointer text-center ${
                    parcelas === p
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs scale-105"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {p}x
                </button>
              ))}
            </div>
          </div>

          {/* Box de Resultado de Parcela */}
          {valorOriginal > 0 && (
            <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50/60 border border-sky-200 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">
                  Condição de Pagamento:
                </span>
                <span className="text-xs font-bold text-[#0082D7] bg-white px-2 py-0.5 rounded-md border border-sky-200">
                  {parcelas === 1 ? "À Vista" : `${parcelas}x no Crediário / Cartão`}
                </span>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="text-sm font-bold text-slate-800">
                  {parcelas}x de:
                </span>
                <span className="text-2xl sm:text-3xl font-black text-blue-950">
                  {formatMoeda(valorParcela)}
                </span>
              </div>

              {entrada > 0 && (
                <div className="flex justify-between text-xs text-slate-600 border-t border-sky-100 pt-1.5">
                  <span>Entrada de:</span>
                  <span className="font-bold text-slate-800">{formatMoeda(entrada)}</span>
                </div>
              )}

              {descontoPct > 0 && (
                <div className="flex justify-between text-xs text-emerald-700 border-t border-sky-100 pt-1.5">
                  <span>Desconto de {descontoPct}%:</span>
                  <span className="font-bold">
                    - {formatMoeda((valorOriginal * descontoPct) / 100)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-xs font-bold text-slate-700 border-t border-sky-100 pt-1.5">
                <span>Total Final da Compra:</span>
                <span>{formatMoeda(valorTotalFinal)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Fechar
          </button>

          {onAplicarVenda && valorOriginal > 0 && (
            <button
              onClick={() => {
                const desc = parcelas > 1 ? `${parcelas}x de ${formatMoeda(valorParcela)}` : "À Vista";
                onAplicarVenda(valorTotalFinal, desc);
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#0082D7] hover:bg-[#0070BA] text-white text-xs font-bold shadow-md shadow-[#0082D7]/20 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Lançar no Diário ({formatMoeda(valorTotalFinal)})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
