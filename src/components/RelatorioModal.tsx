import React, { useState } from "react";
import {
  X,
  FileText,
  Printer,
  Download,
  Share2,
  Check,
  CheckCircle2,
  Award,
  FileSpreadsheet,
  Coins,
} from "lucide-react";
import * as XLSX from "xlsx";
import { LogoSeralle } from "@/components/LogoSeralle";
import { useProfile } from "@/context/ProfileContext";
import { useVendas } from "@/context/VendasContext";
import {
  formatMoeda,
  mesAnoExtenso,
  formatDataCurta,
  formatDataExtenso,
} from "@/utils/formatters";

interface RelatorioModalProps {
  mesId: string;
  onClose: () => void;
}

export function RelatorioModal({ mesId, onClose }: RelatorioModalProps) {
  const { perfilAtivo } = useProfile();
  const { getTotalMes, getConfigMes, dias } = useVendas();

  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  const totalMes = getTotalMes(mesId);
  const configMes = getConfigMes(mesId);

  const ticketMedioPar = totalMes.pares > 0 ? totalMes.valor / totalMes.pares : 0;
  const ticketMedioVenda = totalMes.qtdVendas > 0 ? totalMes.valor / totalMes.qtdVendas : 0;

  // Filter and sort days with sales
  const diasDoMes = Object.entries(dias)
    .filter(([d, val]) => d.startsWith(mesId) && val.itens.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  // Check cotas
  const cotas = [
    { label: "Cota A", ...configMes.cotaA },
    { label: "Cota B", ...configMes.cotaB },
    { label: "Cota C", ...configMes.cotaC },
    { label: "Cota Alta", ...configMes.cotaAlta },
  ].map((c) => ({
    ...c,
    atingiu: totalMes.valor >= c.valor && c.valor > 0,
    pct: c.valor > 0 ? ((totalMes.valor / c.valor) * 100).toFixed(1) : "0",
  }));

  const cotasBatidas = cotas.filter((c) => c.atingiu);
  const maiorCota = cotasBatidas[cotasBatidas.length - 1];

  const comissaoPct = configMes.comissaoPadraoPct ?? 2.5;
  const valorComissao = (totalMes.valor * comissaoPct) / 100;
  const valorPremio = maiorCota?.premio ?? 0;
  const ganhosTotais = valorComissao + valorPremio;

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const rows = diasDoMes.map(([dStr, dData]) => {
      const val = dData.itens.reduce((a, b) => a + b.valor, 0);
      const par = dData.itens.reduce((a, b) => a + b.pares, 0);
      return {
        Data: dStr,
        "Valor (R$)": val,
        "Pares Vendidos": par,
        "Ticket Médio / Par (R$)": par > 0 ? (val / par).toFixed(2) : 0,
        "Margem (%)": dData.margem || 0,
        "Qtd de Vendas": dData.itens.length,
        "Categorias / Calçados": dData.itens.map((i) => i.categoria || "Geral").join(", "),
      };
    });

    // Add summary row
    rows.push({
      Data: "TOTAL",
      "Valor (R$)": totalMes.valor,
      "Pares Vendidos": totalMes.pares,
      "Ticket Médio / Par (R$)": Number(ticketMedioPar.toFixed(2)),
      "Margem (%)": Number(totalMes.margem.toFixed(2)),
      "Qtd de Vendas": totalMes.qtdVendas,
      "Categorias / Calçados": "-",
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendas");

    XLSX.writeFile(
      workbook,
      `vendas-seralle-${mesId}-${perfilAtivo?.nome || "vendedora"}.xlsx`
    );
  };

  const handleCopiarWhatsApp = () => {
    let msg = `*📊 RELATÓRIO DE VENDAS SERALLÊ CALÇADOS*\n`;
    msg += `👤 *Vendedora:* ${perfilAtivo?.nome || "Vendedora"}\n`;
    msg += `📅 *Período:* ${mesAnoExtenso(mesId)}\n\n`;

    msg += `*📈 RESULTADOS DO MÊS:*\n`;
    msg += `• *Total em Vendas:* ${formatMoeda(totalMes.valor)}\n`;
    msg += `• *Pares Vendidos:* ${totalMes.pares} pares\n`;
    msg += `• *Ticket Médio:* ${formatMoeda(ticketMedioPar)} / par\n`;
    if (totalMes.margem > 0) {
      msg += `• *Margem Média:* ${totalMes.margem.toFixed(1)}%\n`;
    }
    msg += `• *Ganhos Estimados (Comissão + Bônus):* ${formatMoeda(ganhosTotais)}\n`;
    msg += `• *Dias Trabalhados:* ${totalMes.dias} dias (${totalMes.qtdVendas} vendas)\n\n`;

    msg += `*🎯 STATUS DAS METAS:*\n`;
    cotas.forEach((c) => {
      const statusIcon = c.atingiu ? "✅" : "⏳";
      msg += `${statusIcon} *${c.label}:* ${formatMoeda(c.valor)} (${c.pares} pares) - ${c.pct}%\n`;
    });

    navigator.clipboard.writeText(msg);
    setCopiedWhatsapp(true);
    setTimeout(() => setCopiedWhatsapp(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 no-print">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#0082D7] text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 capitalize">
                Relatório Mensal · {mesAnoExtenso(mesId)}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Vendedora: <strong>{perfilAtivo?.nome}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Canvas */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-white">
          {/* Company Brand Letterhead */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b-2 border-slate-200">
            <div className="flex items-center gap-3">
              <LogoSeralle size="md" />
              <div className="border-l border-slate-200 pl-3 hidden sm:block">
                <p className="text-xs font-semibold text-slate-500">
                  Diário Oficial de Vendas & Metas
                </p>
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="font-extrabold text-slate-800 uppercase">
                Período: {mesAnoExtenso(mesId)}
              </p>
              <p className="text-slate-500">
                Vendedora: <span className="font-bold text-slate-700">{perfilAtivo?.nome}</span>
              </p>
            </div>
          </div>

          {/* Month Summary Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Faturamento Total
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {formatMoeda(totalMes.valor)}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Pares Vendidos
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {totalMes.pares} <span className="text-xs font-semibold">pares</span>
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Estimativa de Ganhos
              </span>
              <p className="text-xl font-black text-emerald-800 mt-0.5">
                {formatMoeda(ganhosTotais)}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Margem Ponderada
              </span>
              <p className="text-xl font-black text-slate-900 mt-0.5">
                {totalMes.margem > 0 ? `${totalMes.margem.toFixed(1)}%` : "—"}
              </p>
            </div>
          </div>

          {/* Cotas Progress Checklist */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Status das Cotas & Bonificações
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {cotas.map((c) => (
                <div
                  key={c.label}
                  className={`p-3 rounded-xl border ${
                    c.atingiu
                      ? "bg-emerald-50/70 border-emerald-300 text-emerald-950"
                      : "bg-slate-50 border-slate-200 text-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{c.label}</span>
                    {c.atingiu && (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Atingida
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-extrabold mt-1">
                    {formatMoeda(c.valor)}
                  </p>
                  <div className="flex justify-between text-[11px] text-slate-500 font-semibold mt-1">
                    <span>{c.pares} pares</span>
                    <span>{c.pct}%</span>
                  </div>
                  {Boolean(c.premio && c.premio > 0) && (
                    <div className="text-[11px] font-bold text-amber-800 mt-1 pt-1 border-t border-slate-200/60">
                      Bônus: {formatMoeda(c.premio || 0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Daily Table Breakdown */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Detalhamento de Vendas por Dia ({diasDoMes.length} dias com lançamentos)
            </h4>

            {diasDoMes.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
                Nenhuma venda registrada no período selecionado.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/70 text-slate-700 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3">Data</th>
                      <th className="p-3">Valor (R$)</th>
                      <th className="p-3">Pares</th>
                      <th className="p-3">Ticket Médio</th>
                      <th className="p-3">Margem</th>
                      <th className="p-3 text-right">Lançamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {diasDoMes.map(([dStr, dData]) => {
                      const val = dData.itens.reduce((a, b) => a + b.valor, 0);
                      const par = dData.itens.reduce((a, b) => a + b.pares, 0);
                      const tm = par > 0 ? val / par : 0;

                      return (
                        <tr key={dStr} className="hover:bg-slate-50/80">
                          <td className="p-3 font-bold text-slate-900">
                            {formatDataCurta(dStr)}
                          </td>
                          <td className="p-3 font-extrabold text-blue-900">
                            {formatMoeda(val)}
                          </td>
                          <td className="p-3 font-semibold text-slate-700">
                            {par}
                          </td>
                          <td className="p-3 text-slate-600 font-medium">
                            {formatMoeda(tm)}
                          </td>
                          <td className="p-3 font-bold text-emerald-700">
                            {dData.margem > 0 ? `${dData.margem.toFixed(1)}%` : "—"}
                          </td>
                          <td className="p-3 text-right text-slate-500 font-medium">
                            {dData.itens.length} {dData.itens.length === 1 ? "venda" : "vendas"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-100/90 font-black text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="p-3">TOTAL:</td>
                      <td className="p-3 text-blue-900">{formatMoeda(totalMes.valor)}</td>
                      <td className="p-3">{totalMes.pares} pares</td>
                      <td className="p-3">{formatMoeda(ticketMedioPar)}</td>
                      <td className="p-3 text-emerald-800">
                        {totalMes.margem > 0 ? `${totalMes.margem.toFixed(1)}%` : "—"}
                      </td>
                      <td className="p-3 text-right">{totalMes.qtdVendas} vendas</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center justify-between gap-2 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimir / Salvar PDF</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Exportar Excel (XLSX)</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
            >
              {copiedWhatsapp ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedWhatsapp ? "Copiado!" : "Copiar p/ WhatsApp"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
