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
import { LogoSeralle } from "@/components/LogoSeralle";
import { useProfile } from "@/context/ProfileContext";
import { useVendas } from "@/context/VendasContext";
import { useAuth } from "@/context/AuthContext";
import { LOJAS_SERALLE } from "@/data/lojasSeralle";
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
  const { userProfile, user } = useAuth();
  const { getTotalMes, getConfigMes, dias } = useVendas();

  const [copiedWhatsapp, setCopiedWhatsapp] = useState(false);

  const totalMes = getTotalMes(mesId);
  const configMes = getConfigMes(mesId);

  const nomeVendedora = userProfile?.displayName || user?.displayName || perfilAtivo?.nome || "Vendedora Serallê";
  const lojaNome = userProfile?.loja || "Loja Cianorte";
  const lojaObj = LOJAS_SERALLE.find((l) => l.nome === lojaNome || l.cidade.toLowerCase() === lojaNome.toLowerCase());
  const lojaEndereco = userProfile?.lojaEndereco || lojaObj?.endereco || "550 Avenida Souza Naves, Cianorte, PR";
  const lojaCep = userProfile?.lojaCep || lojaObj?.cep || "87200-252";
  const cargo = userProfile?.cargo || "Vendedora de Calçados";

  const ticketMedioPar = totalMes.pares > 0 ? totalMes.valor / totalMes.pares : 0;
  const ticketMedioVenda = totalMes.qtdVendas > 0 ? totalMes.valor / totalMes.qtdVendas : 0;
  const paMedio = totalMes.paMedio > 0 
    ? totalMes.paMedio 
    : (totalMes.qtdVendas > 0 ? totalMes.pares / totalMes.qtdVendas : 0);

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
    const headers = [
      "Data",
      "Valor (R$)",
      "Pares Vendidos",
      "Ticket Médio / Par (R$)",
      "Margem (%)",
      "Qtd de Vendas",
      "Categorias / Calçados",
    ];

    const lines = [headers.join(";")];

    diasDoMes.forEach(([dStr, dData]) => {
      const val = dData.itens.reduce((a, b) => a + b.valor, 0);
      const par = dData.itens.reduce((a, b) => a + b.pares, 0);
      const ticketPar = par > 0 ? (val / par).toFixed(2) : "0,00";
      const margem = (dData.margem || 0).toFixed(2);
      const categorias = dData.itens.map((i) => i.categoria || "Geral").join(", ");

      lines.push(
        [
          dStr,
          val.toFixed(2).replace(".", ","),
          par,
          ticketPar.replace(".", ","),
          margem.replace(".", ","),
          dData.itens.length,
          `"${categorias.replace(/"/g, '""')}"`,
        ].join(";")
      );
    });

    // Summary row
    lines.push(
      [
        "TOTAL",
        totalMes.valor.toFixed(2).replace(".", ","),
        totalMes.pares,
        ticketMedioPar.toFixed(2).replace(".", ","),
        totalMes.margem.toFixed(2).replace(".", ","),
        totalMes.qtdVendas,
        "-",
      ].join(";")
    );

    const csvContent = "\uFEFF" + lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `vendas-seralle-${mesId}-${(perfilAtivo?.nome || "vendedora").toLowerCase().replace(/\s+/g, "_")}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopiarWhatsApp = () => {
    let msg = `*📊 RELATÓRIO OFICIAL DE VENDAS — SERALLÊ CALÇADOS*\n`;
    msg += `🏬 *Filial:* ${lojaNome}\n`;
    if (lojaEndereco) {
      msg += `📍 *Endereço:* ${lojaEndereco} (CEP: ${lojaCep})\n`;
    }
    msg += `👤 *Vendedora:* ${nomeVendedora} · ${cargo}\n`;
    msg += `📅 *Período:* ${mesAnoExtenso(mesId)}\n\n`;

    msg += `*📈 RESULTADOS DO MÊS:*\n`;
    msg += `• *Total em Vendas:* ${formatMoeda(totalMes.valor)}\n`;
    msg += `• *Pares Vendidos:* ${totalMes.pares} pares\n`;
    msg += `• *P.A. Médio:* ${paMedio.toFixed(2)} peças/atend.\n`;
    msg += `• *Ticket Médio / Venda:* ${formatMoeda(ticketMedioVenda)}\n`;
    msg += `• *Ticket Médio / Par:* ${formatMoeda(ticketMedioPar)}\n`;
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

  const handleAbrirWhatsApp = () => {
    let msg = `*📊 RELATÓRIO OFICIAL DE VENDAS — SERALLÊ CALÇADOS*\n`;
    msg += `🏬 *Filial:* ${lojaNome}\n`;
    if (lojaEndereco) {
      msg += `📍 *Endereço:* ${lojaEndereco} (CEP: ${lojaCep})\n`;
    }
    msg += `👤 *Vendedora:* ${nomeVendedora} · ${cargo}\n`;
    msg += `📅 *Período:* ${mesAnoExtenso(mesId)}\n\n`;
    msg += `*📈 RESULTADOS DO MÊS:*\n`;
    msg += `• *Total em Vendas:* ${formatMoeda(totalMes.valor)}\n`;
    msg += `• *Pares Vendidos:* ${totalMes.pares} pares\n`;
    msg += `• *P.A. Médio:* ${paMedio.toFixed(2)} peças/atend.\n`;
    msg += `• *Ticket Médio / Venda:* ${formatMoeda(ticketMedioVenda)}\n`;
    msg += `• *Ganhos Estimados:* ${formatMoeda(ganhosTotais)}\n\n`;
    msg += `*🎯 STATUS DAS METAS:*\n`;
    cotas.forEach((c) => {
      const statusIcon = c.atingiu ? "✅" : "⏳";
      msg += `${statusIcon} *${c.label}:* ${formatMoeda(c.valor)} - ${c.pct}%\n`;
    });

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
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
              <div className="border-l border-slate-200 pl-3">
                <p className="text-xs font-extrabold text-slate-800">
                  {lojaNome} · Serallê Calçados
                </p>
                {lojaEndereco && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    {lojaEndereco} — CEP: {lojaCep}
                  </p>
                )}
              </div>
            </div>

            <div className="text-right text-xs">
              <p className="font-extrabold text-slate-800 uppercase">
                Período: {mesAnoExtenso(mesId)}
              </p>
              <p className="text-slate-600 font-medium">
                Vendedora: <strong className="text-slate-900">{nomeVendedora}</strong> ({cargo})
              </p>
            </div>
          </div>

          {/* Month Summary Numbers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Faturamento Total
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {formatMoeda(totalMes.valor)}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Pares Vendidos
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {totalMes.pares} <span className="text-xs font-semibold">pares</span>
              </p>
            </div>

            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-sky-700">
                P.A. Médio
              </span>
              <p className="text-lg font-black text-[#0082D7] mt-0.5">
                {paMedio.toFixed(2)}
              </p>
              <span className="text-[9px] text-sky-600 block">peças / atendimento</span>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Ticket Médio
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {formatMoeda(ticketMedioVenda)}
              </p>
              <span className="text-[9px] text-slate-500 block">por venda</span>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-emerald-800">
                Ganhos Estimados
              </span>
              <p className="text-lg font-black text-emerald-800 mt-0.5">
                {formatMoeda(ganhosTotais)}
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <span className="text-[10px] font-bold uppercase text-slate-400">
                Margem Ponderada
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
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
              <span>Exportar Planilha (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleCopiarWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              {copiedWhatsapp ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              <span>{copiedWhatsapp ? "Copiado!" : "Copiar p/ WhatsApp"}</span>
            </button>

            <button
              type="button"
              onClick={handleAbrirWhatsApp}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl transition-colors shadow-xs cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
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
