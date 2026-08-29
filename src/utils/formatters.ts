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

export function parseValorMonetario(str: string): number {
  if (!str) return 0;
  const digits = str.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
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
