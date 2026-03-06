export interface Receita {
  id: string;
  descricao: string;
  valor: number;
  dataPrevista: string;
  status: 'recebido' | 'pendente';
  observacao?: string;
  contaContabil?: string; // código do plano de contas (ex: "1.1")
}

export interface Conta {
  id: string;
  nome: string;
  valor: number;
  dataVencimento: string;
  categoria: string;
  status: 'pago' | 'pendente';
  contaContabil?: string;
  formaPagamento?: string;
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
  contaContabil?: string;
  formaPagamento?: string;
}

export interface AlertaGasto {
  id: string;
  nome: string;
  tipo: 'estabelecimento' | 'categoria';
  referencia: string;
  limiteMensal: number;
  ativo: boolean;
}

export type AlertaStatus = 'normal' | 'aviso' | 'critico' | 'limite';

export interface ContaContabil {
  id: string;
  codigo: string;       // "1", "1.1", "2.1.1"
  nome: string;
  tipo: 'receita' | 'despesa';
  parentId?: string;    // id da conta pai
}

export const FORMAS_PAGAMENTO = [
  'PIX',
  'Dinheiro',
  'Débito',
  'Boleto',
  'Transferência',
];

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

export const PLANO_CONTAS_INICIAL: Omit<ContaContabil, 'id'>[] = [
  { codigo: '1', nome: 'Receitas', tipo: 'receita' },
  { codigo: '1.1', nome: 'Salários', tipo: 'receita' },
  { codigo: '1.2', nome: 'Outros Recebimentos', tipo: 'receita' },
  { codigo: '2', nome: 'Despesas Operacionais', tipo: 'despesa' },
  { codigo: '2.1', nome: 'Contas de Consumo', tipo: 'despesa' },
  { codigo: '2.1.1', nome: 'Água', tipo: 'despesa' },
  { codigo: '2.1.2', nome: 'Internet', tipo: 'despesa' },
  { codigo: '2.1.3', nome: 'Energia', tipo: 'despesa' },
  { codigo: '2.2', nome: 'Transporte', tipo: 'despesa' },
  { codigo: '2.2.1', nome: 'Combustível', tipo: 'despesa' },
  { codigo: '2.2.2', nome: 'Transporte por aplicativo', tipo: 'despesa' },
  { codigo: '2.3', nome: 'Alimentação', tipo: 'despesa' },
  { codigo: '2.3.1', nome: 'Restaurantes', tipo: 'despesa' },
  { codigo: '2.3.2', nome: 'Mercado', tipo: 'despesa' },
  { codigo: '2.4', nome: 'Lazer', tipo: 'despesa' },
  { codigo: '2.4.1', nome: 'Viagens', tipo: 'despesa' },
  { codigo: '2.4.2', nome: 'Entretenimento', tipo: 'despesa' },
];
