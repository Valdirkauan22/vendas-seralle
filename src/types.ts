export interface VendaItem {
  id: string;
  valor: number;
  pares: number;
  descricao: string;
  hora: string;
  categoria?: string; // ex: Feminino, Masculino, Infantil, Tenis, Salto, Bota, Sandalia, Conforto, Acessorios
  produtosAgregados?: number; // Qtd de itens agregados/casados (meias, sprays, palmilhas, etc.)
}

export interface NotaCliente {
  id: string;
  nomeCliente: string;
  telefone?: string;
  calcadoDesejado: string;
  tamanho?: string;
  observacoes?: string;
  atendido?: boolean;
  dataCriacao: string;
}

export interface DiaVenda {
  itens: VendaItem[];
  margem: number;
  folga?: boolean; // Se a vendedora está de folga neste dia
  atendimentosTotais?: number; // Total de pessoas atendidas no dia (para taxa de conversão)
  anotacoes?: string; // Observações do dia
  updatedAt?: string; // Timestamp ISO da última alteração
  deletedAt?: string | null; // Se o dia foi excluído (soft-delete para evitar reaparecimento)
}

export interface Cota {
  valor: number;
  pares: number;
  margem: number;
  premio?: number; // Valor da bonificação/prêmio em R$
}

export interface FaixaComissao {
  minAtingimentoPct: number; // Ex: 0, 80, 100, 120
  comissaoPct: number; // Ex: 2.0, 2.5, 3.0, 3.5
}

export interface ConfigMes {
  cotaA: Cota;
  cotaB: Cota;
  cotaC: Cota;
  cotaAlta: Cota;
  comissaoPadraoPct?: number; // Ex: 2.5% de comissão base
  metaPa?: number; // Ex: 1.5 Peças por Atendimento
  ativarFaixasComissao?: boolean;
  faixasComissao?: FaixaComissao[];
  diasUteisMes?: number; // Dias úteis para cálculo de DSR
  domingosFeriadosMes?: number; // Domingos/Feriados para cálculo de DSR
  updatedAt?: string; // Timestamp ISO da última alteração de metas
  deletedAt?: string | null;
}

export interface UsuarioAuth {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  loja?: string;
  role?: "vendedora" | "gerente";
  createdAt?: string;
  lastLoginAt?: string;
}

export interface Perfil {
  id: string;
  nome: string;
  email?: string;
  loja?: string;
  createdAt: string;
}

export interface TotaisMes {
  valor: number;
  pares: number;
  margem: number;
  dias: number;
  qtdVendas: number;
  produtosAgregados: number;
  atendimentosTotais: number;
  paMedio: number; // Peças / Atendimento (ou Itens / Vendas)
  taxaConversao: number; // Vendas / Atendimentos (%)
}

export interface TotaisDia {
  valor: number;
  pares: number;
  qtd: number;
  produtosAgregados: number;
  atendimentosTotais: number;
  pa: number;
  taxaConversao: number;
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
  "Agregados (Meias/Cremes/Sprays)",
] as const;

export interface LembretesConfig {
  habilitado: boolean;
  fechamentoTurnoAtivo: boolean;
  horarioFechamento: string; // "18:00"
  avisoRitmoAtivo: boolean;
  horarioAvisoRitmo: string; // "14:30"
  somHabilitado: boolean;
  notificacaoNavegador: boolean;
}

export const LEMBRETES_CONFIG_PADRAO: LembretesConfig = {
  habilitado: true,
  fechamentoTurnoAtivo: true,
  horarioFechamento: "18:00",
  avisoRitmoAtivo: true,
  horarioAvisoRitmo: "14:30",
  somHabilitado: true,
  notificacaoNavegador: false,
};

