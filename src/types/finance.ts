export interface Receita {
  id: string;
  descricao: string;
  valor: number;
  dataPrevista: string;
  status: 'recebido' | 'pendente';
  observacao?: string;
}

export interface Conta {
  id: string;
  nome: string;
  valor: number;
  dataVencimento: string;
  categoria: string;
  status: 'pago' | 'pendente';
}

export interface Cartao {
  id: string;
  nome: string;
  cor: string;
}

export interface Fatura {
  id: string;
  cartaoId: string;
  mes: string; // "2025-01"
  total: number;
}

export interface GastoFatura {
  id: string;
  faturaId: string;
  cartaoId: string;
  descricao: string;
  valor: number;
  data: string;
  categoria: string;
  observacao?: string;
}

export interface AlertaGasto {
  id: string;
  nome: string;
  tipo: 'estabelecimento' | 'categoria';
  referencia: string; // nome do estabelecimento ou categoria
  limiteMensal: number;
  ativo: boolean;
}

export type AlertaStatus = 'normal' | 'aviso' | 'critico' | 'limite';

export const CATEGORIAS_PADRAO = [
  'Alimentação',
  'Combustível',
  'Mercado',
  'Compras',
  'Assinaturas',
  'Lazer',
  'Transporte',
  'Saúde',
  'Educação',
  'Moradia',
  'Outros',
];

export const CORES_CARTAO = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];
