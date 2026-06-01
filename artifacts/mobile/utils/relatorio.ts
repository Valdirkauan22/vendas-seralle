import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { ConfigMes, DiaVenda } from "@/context/VendasContext";

function moeda(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(v: number, meta: number) {
  if (!meta) return "—";
  return Math.min((v / meta) * 100, 100).toFixed(1) + "%";
}

function barHtml(v: number, meta: number, cor: string) {
  const p = Math.min((v / meta) * 100, 100);
  return `<div style="background:#e8f0f8;border-radius:4px;height:8px;width:100%;overflow:hidden;">
    <div style="background:${cor};width:${p}%;height:100%;border-radius:4px;"></div>
  </div>`;
}

function statusBadge(v: number, meta: number, cor: string) {
  if (v >= meta) return `<span style="background:${cor}22;color:${cor};font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600;">✓ Atingida</span>`;
  return `<span style="color:#6b8cae;font-size:11px;">Falta ${moeda(meta - v)}</span>`;
}

interface RelatorioDados {
  mesNome: string;
  ano: number;
  total: { valor: number; pares: number; margem: number; dias: number };
  config: ConfigMes;
  diasMes: Array<{ data: string; dia: DiaVenda }>;
}

export async function gerarECompartilharRelatorio(dados: RelatorioDados) {
  const { mesNome, ano, total, config, diasMes } = dados;
  const agora = new Date().toLocaleString("pt-BR");

  const cotasRows = [
    { label: "Cota A", cor: "#10B981", cota: config.cotaA },
    { label: "Cota B", cor: "#3B82F6", cota: config.cotaB },
    { label: "Cota C", cor: "#8B5CF6", cota: config.cotaC },
    { label: "Cota Alta", cor: "#F59E0B", cota: config.cotaAlta },
  ]
    .map(({ label, cor, cota }) => {
      const margemStr = cota.margem > 0 ? ` · ${cota.margem}% margem` : "";
      return `
      <tr>
        <td style="padding:10px 8px;">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${cor};margin-right:6px;vertical-align:middle;"></span>
          <strong>${label}</strong>
          <div style="font-size:11px;color:#6b8cae;margin-top:2px;padding-left:16px;">
            ${cota.pares} pares · ${moeda(cota.valor)}${margemStr}
          </div>
        </td>
        <td style="padding:10px 8px;text-align:right;vertical-align:top;">
          <div style="font-weight:700;color:${cor};">${pct(total.valor, cota.valor)}</div>
          ${barHtml(total.valor, cota.valor, cor)}
          <div style="margin-top:4px;text-align:right;">${statusBadge(total.valor, cota.valor, cor)}</div>
        </td>
      </tr>`;
    })
    .join("");

  const diasRows = diasMes
    .map(({ data, dia }) => {
      const [, , d] = data.split("-");
      const valor = dia.itens.reduce((s, i) => s + i.valor, 0);
      const pares = dia.itens.reduce((s, i) => s + i.pares, 0);
      const qtd = dia.itens.length;
      const tktMedio = pares > 0 ? moeda(valor / pares) : "—";
      const margemStr = dia.margem > 0 ? `${dia.margem.toFixed(1)}%` : "—";
      return `
      <tr style="border-bottom:1px solid #e8f0f8;">
        <td style="padding:8px 8px;font-weight:600;color:#1a3a5c;">Dia ${parseInt(d)}</td>
        <td style="padding:8px 8px;text-align:right;">${moeda(valor)}</td>
        <td style="padding:8px 8px;text-align:right;">${pares}</td>
        <td style="padding:8px 8px;text-align:right;">${tktMedio}</td>
        <td style="padding:8px 8px;text-align:right;">${margemStr}</td>
        <td style="padding:8px 8px;text-align:right;color:#6b8cae;">${qtd} venda${qtd !== 1 ? "s" : ""}</td>
      </tr>`;
    })
    .join("");

  const tktMedioMes = total.pares > 0 ? moeda(total.valor / total.pares) : "—";

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; color:#1a3a5c; background:#fff; font-size:13px; }
    .header { background:#1A6BB5; color:#fff; padding:28px 32px 24px; }
    .header-top { display:flex; justify-content:space-between; align-items:flex-start; }
    .brand { font-size:22px; font-weight:800; letter-spacing:-0.5px; }
    .brand-sub { font-size:12px; opacity:0.75; margin-top:2px; }
    .header-date { text-align:right; font-size:11px; opacity:0.75; }
    .mes-title { font-size:32px; font-weight:800; margin-top:16px; }
    .mes-sub { font-size:14px; opacity:0.8; margin-top:2px; }
    .totais { display:flex; gap:0; background:#fff; border-bottom:2px solid #e8f0f8; }
    .total-box { flex:1; padding:20px 24px; border-right:1px solid #e8f0f8; }
    .total-box:last-child { border-right:none; }
    .total-label { font-size:10px; font-weight:700; color:#6b8cae; text-transform:uppercase; letter-spacing:0.8px; }
    .total-val { font-size:22px; font-weight:800; color:#1A6BB5; margin-top:4px; }
    .total-sub { font-size:11px; color:#6b8cae; margin-top:2px; }
    .section { padding:20px 24px 0; }
    .section-title { font-size:13px; font-weight:700; color:#6b8cae; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:12px; }
    table { width:100%; border-collapse:collapse; }
    th { font-size:10px; font-weight:700; color:#6b8cae; text-transform:uppercase; letter-spacing:0.5px; padding:8px; text-align:right; border-bottom:2px solid #e8f0f8; }
    th:first-child { text-align:left; }
    .cotas-table td { border-bottom:1px solid #f0f5fc; }
    .footer { padding:20px 24px; margin-top:16px; border-top:1px solid #e8f0f8; font-size:10px; color:#6b8cae; display:flex; justify-content:space-between; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <div class="brand">Serallê Calçados</div>
        <div class="brand-sub">Diário de Vendas</div>
      </div>
      <div class="header-date">Gerado em<br/>${agora}</div>
    </div>
    <div class="mes-title">${mesNome} ${ano}</div>
    <div class="mes-sub">${total.dias} ${total.dias === 1 ? "dia" : "dias"} com lançamento</div>
  </div>

  <div class="totais">
    <div class="total-box">
      <div class="total-label">Venda Total</div>
      <div class="total-val">${moeda(total.valor)}</div>
    </div>
    <div class="total-box">
      <div class="total-label">Pares</div>
      <div class="total-val">${total.pares}</div>
    </div>
    <div class="total-box">
      <div class="total-label">Ticket Médio</div>
      <div class="total-val">${tktMedioMes}</div>
      <div class="total-sub">por par</div>
    </div>
    ${total.margem > 0 ? `<div class="total-box">
      <div class="total-label">Margem Média</div>
      <div class="total-val">${total.margem.toFixed(1)}%</div>
    </div>` : ""}
  </div>

  <div class="section">
    <div class="section-title">Progresso nas Metas</div>
    <table class="cotas-table">
      ${cotasRows}
    </table>
  </div>

  ${diasMes.length > 0 ? `
  <div class="section" style="margin-top:20px;">
    <div class="section-title">Detalhamento por Dia</div>
    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Dia</th>
          <th>Valor</th>
          <th>Pares</th>
          <th>Tkt Médio</th>
          <th>Margem</th>
          <th>Qtd</th>
        </tr>
      </thead>
      <tbody>${diasRows}</tbody>
    </table>
  </div>` : ""}

  <div class="footer">
    <span>Serallê Calçados · Diário de Vendas</span>
    <span>${mesNome} ${ano}</span>
  </div>
</body>
</html>`;

  if (Platform.OS === "web") {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-${mesNome.toLowerCase()}-${ano}.html`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: `Relatório ${mesNome} ${ano}`,
      UTI: "com.adobe.pdf",
    });
  }
}
