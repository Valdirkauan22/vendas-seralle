export const MESES_PT = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export const DIAS_SEMANA_PT = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export const DIAS_SEMANA_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export function formatMoeda(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatValorInput(v: number): string {
  return (v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Converte de forma inteligente strings de valor em números monetários válidos.
 * Trata:
 * - "150" => 150
 * - "150,00" => 150
 * - "150,50" => 150.5
 * - "1.250,00" => 1250
 * - "150.00" => 150
 * - "150.50" => 150.5
 * - 150 => 150
 */
export function parseValorMonetario(input: string | number): number {
  if (typeof input === "number") {
    return isNaN(input) ? 0 : input;
  }
  if (!input) return 0;

  const raw = String(input).trim();
  if (!raw) return 0;

  // Se o input contém vírgula (padrão brasileiro: "150,00", "1.450,50", "99,90")
  if (raw.includes(",")) {
    const semPontos = raw.replace(/\./g, "").replace(",", ".");
    // Extrair apenas dígitos e ponto
    const match = semPontos.match(/-?\d+(\.\d+)?/);
    if (!match) return 0;
    const num = parseFloat(match[0]);
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  }

  // Se o input contém ponto
  if (raw.includes(".")) {
    const parts = raw.split(".");
    // Se tem 2 partes e a última parte tem 1 ou 2 dígitos (ex: "150.50" ou "99.9"), é decimal
    if (parts.length === 2 && (parts[1].length === 1 || parts[1].length === 2)) {
      const match = raw.match(/-?\d+(\.\d+)?/);
      if (!match) return 0;
      const num = parseFloat(match[0]);
      return isNaN(num) ? 0 : Math.round(num * 100) / 100;
    }
    // Se são pontos de milhar sem decimais (ex: "1.250")
    const semPontos = raw.replace(/\./g, "");
    const match = semPontos.match(/-?\d+/);
    if (!match) return 0;
    const num = parseFloat(match[0]);
    return isNaN(num) ? 0 : num;
  }

  // String pura de dígitos (ex: "150", "299", "1200")
  const match = raw.match(/-?\d+/);
  if (!match) return 0;
  const num = parseFloat(match[0]);
  return isNaN(num) ? 0 : num;
}

/**
 * Converte palavras de números por extenso em português para número real.
 * Ex: "cento e cinquenta" => 150, "duzentos e noventa e nove e noventa" => 299.90
 */
export function converterExtensoParaNumero(texto: string): number {
  const t = texto.toLowerCase().trim();

  // Dicionário de valores fixos conhecidos
  const mapaUnidades: Record<string, number> = {
    um: 1, uma: 1, dois: 2, duas: 2, tres: 3, três: 3, quatro: 4,
    cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
    onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14,
    quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19,
  };

  const mapaDezenas: Record<string, number> = {
    vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50,
    sessenta: 60, setenta: 70, oitenta: 80, noventa: 90,
  };

  const mapaCentenas: Record<string, number> = {
    cem: 100, cento: 100, duzentos: 200, duzentas: 200,
    trezentos: 300, trezentas: 300, quatrocentos: 400, quatrocentas: 400,
    quinhentos: 500, quinhentas: 500, seiscentos: 600, seiscentas: 600,
    setecentos: 700, setecentas: 700, oitocentos: 800, oitocentas: 800,
    novecentos: 900, novecentas: 900,
  };

  // Divide o texto para analisar
  const palavras = t.split(/[\s,]+/);
  let total = 0;
  let tempCentena = 0;
  let tempDezena = 0;
  let temNumero = false;

  for (let i = 0; i < palavras.length; i++) {
    const p = palavras[i];
    if (p === "e" || p === "de" || p === "reais" || p === "real") continue;

    if (p === "mil") {
      if (total === 0 && tempCentena === 0 && tempDezena === 0) {
        total = 1000;
      } else {
        total = (total + tempCentena + tempDezena) * 1000;
      }
      tempCentena = 0;
      tempDezena = 0;
      temNumero = true;
    } else if (mapaCentenas[p] !== undefined) {
      tempCentena += mapaCentenas[p];
      temNumero = true;
    } else if (mapaDezenas[p] !== undefined) {
      tempDezena += mapaDezenas[p];
      temNumero = true;
    } else if (mapaUnidades[p] !== undefined) {
      tempDezena += mapaUnidades[p];
      temNumero = true;
    }
  }

  const acumulado = total + tempCentena + tempDezena;
  return temNumero ? acumulado : 0;
}

export function nomeMes(mesNum: number): string {
  return MESES_PT[mesNum - 1] ?? "";
}

export function mesAnoExtenso(mesId: string): string {
  const [ano, mes] = mesId.split("-").map(Number);
  return `${nomeMes(mes)} de ${ano}`;
}

export function formatDataExtenso(dataStr: string): string {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-").map(Number);
  const dt = new Date(ano, mes - 1, dia);
  return `${DIAS_SEMANA_PT[dt.getDay()]}, ${dia} de ${nomeMes(mes).toLowerCase()} de ${ano}`;
}

export function formatDataCurta(dataStr: string): string {
  if (!dataStr) return "";
  const [ano, mes, dia] = dataStr.split("-");
  return `${dia}/${mes}/${ano}`;
}

export function formatHora(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function getMesAtualId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function getDataHoje(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getMesAnterior(mesId: string): string {
  const [y, m] = mesId.split("-").map(Number);
  const dt = new Date(y, m - 2, 1);
  const prevY = dt.getFullYear();
  const prevM = String(dt.getMonth() + 1).padStart(2, "0");
  return `${prevY}-${prevM}`;
}

export function getProximoMes(mesId: string): string {
  const [y, m] = mesId.split("-").map(Number);
  const dt = new Date(y, m, 1);
  const nextY = dt.getFullYear();
  const nextM = String(dt.getMonth() + 1).padStart(2, "0");
  return `${nextY}-${nextM}`;
}

export function gerarSyncCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export const AVATAR_COLORS = ["#1A6BB5", "#10B981", "#8B5CF6", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

export function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function getIniciais(nome: string): string {
  if (!nome) return "V";
  const parts = nome.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
