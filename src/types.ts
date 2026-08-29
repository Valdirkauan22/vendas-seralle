export interface VendaItem {
  id: string;
  valor: number;
  pares: number;
  descricao: string;
  hora: string;
  categoria?: string; // ex: Feminino, Masculino, Infantil, Tenis, Salto, Bota, Sandalia, Conforto, Acessorios
}

export interface DiaVenda {
  itens: VendaItem[];
  margem: number;
  folga?: boolean; // Se a vendedora está de folga neste dia
}

export interface Cota {
  valor: number;
  pares: number;
  margem: number;
  premio?: number; // Valor da bonificação/prêmio em R$
}

export interface ConfigMes {
  cotaA: Cota;
  cotaB: Cota;
  cotaC: Cota;
  cotaAlta: Cota;
  comissaoPadraoPct?: number; // Ex: 2.5% de comissão base
}

export interface Perfil {
  id: string;
  nome: string;
  createdAt: string;
}

export interface TotaisMes {
  valor: number;
  pares: number;
  margem: number;
  dias: number;
  qtdVendas: number;
}

export interface TotaisDia {
  valor: number;
  pares: number;
  qtd: number;
}

export type ViewMode =
  | "dashboard"
  | "calendario"
  | "analises"
  | "loja"
  | "historico-metas";

export const CATEGORIAS_PADRAO = [
  "Feminino",
  "Masculino",
  "Infantil",
  "Tênis / Esportivo",
  "Salto / Social",
  "Sandália / Rasteira",
  "Bota",
  "Chinelo",
  "Conforto",
  "Bolsa / Acessório",
] as const;
