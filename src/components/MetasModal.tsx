import React, { useState } from "react";
import {
  X,
  Target,
  RotateCcw,
  Save,
  CheckCircle2,
  DollarSign,
  Gift,
  Layers,
  Calendar,
  Sparkles,
  Store,
} from "lucide-react";
import { useVendas, CONFIG_MES_PADRAO } from "@/context/VendasContext";
import { ConfigMes } from "@/types";
import { formatMoeda, mesAnoExtenso, parseValorMonetario } from "@/utils/formatters";

interface MetasModalProps {
  mesId: string;
  onClose: () => void;
}

export function MetasModal({ mesId, onClose }: MetasModalProps) {
  const { getConfigMes, salvarConfigMes } = useVendas();
  const currentConfig = getConfigMes(mesId);

  const [cotaAValor, setCotaAValor] = useState(
    currentConfig.cotaA.valor ? currentConfig.cotaA.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "55.000,00"
  );
  const [cotaAPares, setCotaAPares] = useState(String(currentConfig.cotaA.pares || 410));
  const [cotaAPremio, setCotaAPremio] = useState(String(currentConfig.cotaA.premio ?? 150));

  const [cotaBValor, setCotaBValor] = useState(
    currentConfig.cotaB.valor ? currentConfig.cotaB.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "65.000,00"
  );
  const [cotaBPares, setCotaBPares] = useState(String(currentConfig.cotaB.pares || 450));
  const [cotaBPremio, setCotaBPremio] = useState(String(currentConfig.cotaB.premio ?? 300));

  const [cotaCValor, setCotaCValor] = useState(
    currentConfig.cotaC.valor ? currentConfig.cotaC.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "75.000,00"
  );
  const [cotaCPares, setCotaCPares] = useState(String(currentConfig.cotaC.pares || 490));
  const [cotaCPremio, setCotaCPremio] = useState(String(currentConfig.cotaC.premio ?? 500));

  const [cotaAltaValor, setCotaAltaValor] = useState(
    currentConfig.cotaAlta.valor ? currentConfig.cotaAlta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "90.000,00"
  );
  const [cotaAltaPares, setCotaAltaPares] = useState(String(currentConfig.cotaAlta.pares || 550));
  const [cotaAltaPremio, setCotaAltaPremio] = useState(String(currentConfig.cotaAlta.premio ?? 800));

  const [metaLojaValor, setMetaLojaValor] = useState(
    currentConfig.metaLojaValor ? currentConfig.metaLojaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "250.000,00"
  );
  const [metaLojaPares, setMetaLojaPares] = useState(String(currentConfig.metaLojaPares || 1800));

  const [comissaoPct, setComissaoPct] = useState(String(currentConfig.comissaoPadraoPct ?? 2.5));
  const [metaPa, setMetaPa] = useState(String(currentConfig.metaPa ?? 1.5));
  const [diasUteis, setDiasUteis] = useState(String(currentConfig.diasUteisMes ?? 25));
  const [domingosFeriados, setDomingosFeriados] = useState(String(currentConfig.domingosFeriadosMes ?? 5));

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleCurrencyChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setter("");
      return;
    }
    const num = parseInt(raw, 10) / 100;
    setter(
      num.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  };

  const handleResetDefaults = () => {
    setCotaAValor(CONFIG_MES_PADRAO.cotaA.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setCotaAPares(String(CONFIG_MES_PADRAO.cotaA.pares));
    setCotaAPremio(String(CONFIG_MES_PADRAO.cotaA.premio || 150));

    setCotaBValor(CONFIG_MES_PADRAO.cotaB.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setCotaBPares(String(CONFIG_MES_PADRAO.cotaB.pares));
    setCotaBPremio(String(CONFIG_MES_PADRAO.cotaB.premio || 300));

    setCotaCValor(CONFIG_MES_PADRAO.cotaC.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setCotaCPares(String(CONFIG_MES_PADRAO.cotaC.pares));
    setCotaCPremio(String(CONFIG_MES_PADRAO.cotaC.premio || 500));

    setCotaAltaValor(CONFIG_MES_PADRAO.cotaAlta.valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }));
    setCotaAltaPares(String(CONFIG_MES_PADRAO.cotaAlta.pares));
    setCotaAltaPremio(String(CONFIG_MES_PADRAO.cotaAlta.premio || 800));

    setComissaoPct(String(CONFIG_MES_PADRAO.comissaoPadraoPct || 2.5));
    setMetaLojaValor(CONFIG_MES_PADRAO.metaLojaValor ? CONFIG_MES_PADRAO.metaLojaValor.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) : "250.000,00");
    setMetaLojaPares(String(CONFIG_MES_PADRAO.metaLojaPares || 1800));
    setMetaPa("1.5");
    setDiasUteis("25");
    setDomingosFeriados("5");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const newConfig: ConfigMes = {
      cotaA: {
        valor: parseValorMonetario(cotaAValor),
        pares: parseInt(cotaAPares, 10) || 0,
        margem: 0,
        premio: parseFloat(cotaAPremio) || 0,
      },
      cotaB: {
        valor: parseValorMonetario(cotaBValor),
        pares: parseInt(cotaBPares, 10) || 0,
        margem: 0,
        premio: parseFloat(cotaBPremio) || 0,
      },
      cotaC: {
        valor: parseValorMonetario(cotaCValor),
        pares: parseInt(cotaCPares, 10) || 0,
        margem: 0,
        premio: parseFloat(cotaCPremio) || 0,
      },
      cotaAlta: {
        valor: parseValorMonetario(cotaAltaValor),
        pares: parseInt(cotaAltaPares, 10) || 0,
        margem: 0,
        premio: parseFloat(cotaAltaPremio) || 0,
      },
      metaLojaValor: parseValorMonetario(metaLojaValor),
      metaLojaPares: parseInt(metaLojaPares, 10) || 0,
      comissaoPadraoPct: parseFloat(comissaoPct.replace(",", ".")) || 2.5,
      metaPa: parseFloat(metaPa.replace(",", ".")) || 1.5,
      diasUteisMes: parseInt(diasUteis, 10) || 25,
      domingosFeriadosMes: parseInt(domingosFeriados, 10) || 5,
    };

    await salvarConfigMes(mesId, newConfig);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 capitalize">
                Configurar Metas & Comissões · {mesAnoExtenso(mesId)}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Defina valores, pares, bonificações, meta de PA e cálculo de DSR
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Base Commission & PA & DSR Settings */}
          <div className="p-4 rounded-xl bg-sky-50/70 border border-sky-200 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#0082D7]" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Parâmetros Gerais de Remuneração & Varejo
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-blue-700" />
                  Comissão Base (%)
                </label>
                <input
                  type="text"
                  placeholder="2.5"
                  value={comissaoPct}
                  onChange={(e) => setComissaoPct(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-[#0082D7] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-purple-600" />
                  Meta de PA (Peças/Venda)
                </label>
                <input
                  type="text"
                  placeholder="1.5"
                  value={metaPa}
                  onChange={(e) => setMetaPa(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  Dias Úteis / DSR
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min="1"
                    title="Dias úteis no mês"
                    placeholder="25"
                    value={diasUteis}
                    onChange={(e) => setDiasUteis(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                  <input
                    type="number"
                    min="0"
                    title="Domingos e feriados"
                    placeholder="5"
                    value={domingosFeriados}
                    onChange={(e) => setDomingosFeriados(e.target.value)}
                    className="w-1/2 px-2 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Meta Global da Filial / Loja */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-amber-700" />
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Meta Global da Filial Serallê (Mês)
                </h4>
                <p className="text-[11px] text-amber-800 font-medium">
                  Acompanhe no painel quanto as suas vendas representam da meta da loja
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta de Faturamento da Loja (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    placeholder="250.000,00"
                    value={metaLojaValor}
                    onChange={handleCurrencyChange(setMetaLojaValor)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta em Pares da Loja
                </label>
                <input
                  type="number"
                  placeholder="1800"
                  value={metaLojaPares}
                  onChange={(e) => setMetaLojaPares(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg text-center focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Cota A */}
          <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <h4 className="text-sm font-bold text-emerald-950">Cota A (Meta Base)</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta em Vendas (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cotaAValor}
                    onChange={handleCurrencyChange(setCotaAValor)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta de Pares
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaAPares}
                  onChange={(e) => setCotaAPares(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-emerald-600" />
                  Prêmio Bônus (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaAPremio}
                  onChange={(e) => setCotaAPremio(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Cota B */}
          <div className="p-4 rounded-xl bg-blue-50/40 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <h4 className="text-sm font-bold text-blue-950">Cota B (Meta Intermediária)</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta em Vendas (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cotaBValor}
                    onChange={handleCurrencyChange(setCotaBValor)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta de Pares
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaBPares}
                  onChange={(e) => setCotaBPares(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-blue-600" />
                  Prêmio Bônus (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaBPremio}
                  onChange={(e) => setCotaBPremio(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Cota C */}
          <div className="p-4 rounded-xl bg-purple-50/40 border border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <h4 className="text-sm font-bold text-purple-950">Cota C (Meta Avançada)</h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta em Vendas (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cotaCValor}
                    onChange={handleCurrencyChange(setCotaCValor)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta de Pares
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaCPares}
                  onChange={(e) => setCotaCPares(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-purple-600" />
                  Prêmio Bônus (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaCPremio}
                  onChange={(e) => setCotaCPremio(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Cota Alta */}
          <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <h4 className="text-sm font-bold text-amber-950">
                  Cota Alta (Supermeta de Destaque)
                </h4>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta em Vendas (R$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={cotaAltaValor}
                    onChange={handleCurrencyChange(setCotaAltaValor)}
                    required
                    className="w-full pl-9 pr-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Meta de Pares
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaAltaPares}
                  onChange={(e) => setCotaAltaPares(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Gift className="w-3.5 h-3.5 text-amber-600" />
                  Prêmio Bônus (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  value={cotaAltaPremio}
                  onChange={(e) => setCotaAltaPremio(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold text-slate-900 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Restaurar Padrões</span>
            </button>

            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0082D7] hover:bg-[#0070BA] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Metas & Prêmios Salvos!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Metas & Parâmetros</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
