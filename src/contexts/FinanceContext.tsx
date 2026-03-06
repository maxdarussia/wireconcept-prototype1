import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { Receita, Conta, Cartao, Fatura, GastoFatura, AlertaGasto, ContaContabil } from '@/types/finance';
import { PLANO_CONTAS_INICIAL } from '@/types/finance';

interface FinanceData {
  receitas: Receita[];
  contas: Conta[];
  cartoes: Cartao[];
  faturas: Fatura[];
  gastos: GastoFatura[];
  alertas: AlertaGasto[];
  categorias: string[];
  planoContas: ContaContabil[];
}

interface FinanceContextType extends FinanceData {
  addReceita: (r: Omit<Receita, 'id'>) => void;
  updateReceita: (id: string, r: Partial<Receita>) => void;
  deleteReceita: (id: string) => void;
  addConta: (c: Omit<Conta, 'id'>) => void;
  updateConta: (id: string, c: Partial<Conta>) => void;
  deleteConta: (id: string) => void;
  addCartao: (c: Omit<Cartao, 'id'>) => void;
  updateCartao: (id: string, c: Partial<Cartao>) => void;
  deleteCartao: (id: string) => void;
  addFatura: (f: Omit<Fatura, 'id'>) => void;
  updateFatura: (id: string, f: Partial<Fatura>) => void;
  deleteFatura: (id: string) => void;
  addGasto: (g: Omit<GastoFatura, 'id'>) => void;
  updateGasto: (id: string, g: Partial<GastoFatura>) => void;
  deleteGasto: (id: string) => void;
  addAlerta: (a: Omit<AlertaGasto, 'id'>) => void;
  updateAlerta: (id: string, a: Partial<AlertaGasto>) => void;
  deleteAlerta: (id: string) => void;
  addCategoria: (c: string) => void;
  searchGastos: (query: string) => GastoFatura[];
  addContaContabil: (c: Omit<ContaContabil, 'id'>) => void;
  updateContaContabil: (id: string, c: Partial<ContaContabil>) => void;
  deleteContaContabil: (id: string) => void;
  getContasFilhas: (parentCodigo: string) => ContaContabil[];
  getContasByCodigo: (codigo: string) => ContaContabil | undefined;
  formasPagamento: string[];
}

const FinanceContext = createContext<FinanceContextType | null>(null);

const uid = () => crypto.randomUUID();

const load = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
};

const CATEGORIAS_INIT = ['Alimentação', 'Combustível', 'Mercado', 'Compras', 'Assinaturas', 'Lazer', 'Transporte', 'Saúde', 'Educação', 'Moradia', 'Outros'];

const initPlanoContas = (): ContaContabil[] => {
  const saved = load<ContaContabil[] | null>('fin_plano_contas', null);
  if (saved && saved.length > 0) return saved;
  // Build parent relationships
  const contas: ContaContabil[] = [];
  for (const c of PLANO_CONTAS_INICIAL) {
    const parts = c.codigo.split('.');
    let parentId: string | undefined;
    if (parts.length > 1) {
      const parentCodigo = parts.slice(0, -1).join('.');
      const parent = contas.find(p => p.codigo === parentCodigo);
      parentId = parent?.id;
    }
    contas.push({ ...c, id: uid(), parentId });
  }
  return contas;
};

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [receitas, setReceitas] = useState<Receita[]>(() => load('fin_receitas', []));
  const [contas, setContas] = useState<Conta[]>(() => load('fin_contas', []));
  const [cartoes, setCartoes] = useState<Cartao[]>(() => load('fin_cartoes', []));
  const [faturas, setFaturas] = useState<Fatura[]>(() => load('fin_faturas', []));
  const [gastos, setGastos] = useState<GastoFatura[]>(() => load('fin_gastos', []));
  const [alertas, setAlertas] = useState<AlertaGasto[]>(() => load('fin_alertas', []));
  const [categorias, setCategorias] = useState<string[]>(() => load('fin_categorias', CATEGORIAS_INIT));
  const [planoContas, setPlanoContas] = useState<ContaContabil[]>(() => initPlanoContas());

  useEffect(() => { localStorage.setItem('fin_receitas', JSON.stringify(receitas)); }, [receitas]);
  useEffect(() => { localStorage.setItem('fin_contas', JSON.stringify(contas)); }, [contas]);
  useEffect(() => { localStorage.setItem('fin_cartoes', JSON.stringify(cartoes)); }, [cartoes]);
  useEffect(() => { localStorage.setItem('fin_faturas', JSON.stringify(faturas)); }, [faturas]);
  useEffect(() => { localStorage.setItem('fin_gastos', JSON.stringify(gastos)); }, [gastos]);
  useEffect(() => { localStorage.setItem('fin_alertas', JSON.stringify(alertas)); }, [alertas]);
  useEffect(() => { localStorage.setItem('fin_categorias', JSON.stringify(categorias)); }, [categorias]);
  useEffect(() => { localStorage.setItem('fin_plano_contas', JSON.stringify(planoContas)); }, [planoContas]);

  const addReceita = useCallback((r: Omit<Receita, 'id'>) => setReceitas(p => [...p, { ...r, id: uid() }]), []);
  const updateReceita = useCallback((id: string, r: Partial<Receita>) => setReceitas(p => p.map(x => x.id === id ? { ...x, ...r } : x)), []);
  const deleteReceita = useCallback((id: string) => setReceitas(p => p.filter(x => x.id !== id)), []);

  const addConta = useCallback((c: Omit<Conta, 'id'>) => setContas(p => [...p, { ...c, id: uid() }]), []);
  const updateConta = useCallback((id: string, c: Partial<Conta>) => setContas(p => p.map(x => x.id === id ? { ...x, ...c } : x)), []);
  const deleteConta = useCallback((id: string) => setContas(p => p.filter(x => x.id !== id)), []);

  const addCartao = useCallback((c: Omit<Cartao, 'id'>) => setCartoes(p => [...p, { ...c, id: uid() }]), []);
  const updateCartao = useCallback((id: string, c: Partial<Cartao>) => setCartoes(p => p.map(x => x.id === id ? { ...x, ...c } : x)), []);
  const deleteCartao = useCallback((id: string) => {
    setCartoes(p => p.filter(x => x.id !== id));
    setFaturas(p => p.filter(x => x.cartaoId !== id));
    setGastos(p => p.filter(x => x.cartaoId !== id));
  }, []);

  const addFatura = useCallback((f: Omit<Fatura, 'id'>) => setFaturas(p => [...p, { ...f, id: uid() }]), []);
  const updateFatura = useCallback((id: string, f: Partial<Fatura>) => setFaturas(p => p.map(x => x.id === id ? { ...x, ...f } : x)), []);
  const deleteFatura = useCallback((id: string) => {
    setFaturas(p => p.filter(x => x.id !== id));
    setGastos(p => p.filter(x => x.faturaId !== id));
  }, []);

  const addGasto = useCallback((g: Omit<GastoFatura, 'id'>) => {
    setGastos(p => [...p, { ...g, id: uid() }]);
  }, []);
  const updateGasto = useCallback((id: string, g: Partial<GastoFatura>) => setGastos(p => p.map(x => x.id === id ? { ...x, ...g } : x)), []);
  const deleteGasto = useCallback((id: string) => setGastos(p => p.filter(x => x.id !== id)), []);

  const addAlerta = useCallback((a: Omit<AlertaGasto, 'id'>) => setAlertas(p => [...p, { ...a, id: uid() }]), []);
  const updateAlerta = useCallback((id: string, a: Partial<AlertaGasto>) => setAlertas(p => p.map(x => x.id === id ? { ...x, ...a } : x)), []);
  const deleteAlerta = useCallback((id: string) => setAlertas(p => p.filter(x => x.id !== id)), []);

  const addCategoria = useCallback((c: string) => setCategorias(p => p.includes(c) ? p : [...p, c]), []);

  const searchGastos = useCallback((query: string) => {
    const q = query.toLowerCase();
    return gastos.filter(g => g.descricao.toLowerCase().includes(q) || g.categoria.toLowerCase().includes(q));
  }, [gastos]);

  // Plano de Contas
  const addContaContabil = useCallback((c: Omit<ContaContabil, 'id'>) => {
    setPlanoContas(p => [...p, { ...c, id: uid() }]);
  }, []);

  const updateContaContabil = useCallback((id: string, c: Partial<ContaContabil>) => {
    setPlanoContas(p => p.map(x => x.id === id ? { ...x, ...c } : x));
  }, []);

  const deleteContaContabil = useCallback((id: string) => {
    setPlanoContas(p => {
      const toDelete = new Set<string>();
      const collectChildren = (parentId: string) => {
        toDelete.add(parentId);
        p.filter(x => x.parentId === parentId).forEach(x => collectChildren(x.id));
      };
      collectChildren(id);
      return p.filter(x => !toDelete.has(x.id));
    });
  }, []);

  const getContasFilhas = useCallback((parentCodigo: string) => {
    return planoContas.filter(c => {
      if (!c.codigo.startsWith(parentCodigo + '.')) return false;
      const rest = c.codigo.substring(parentCodigo.length + 1);
      return !rest.includes('.');
    });
  }, [planoContas]);

  const getContasByCodigo = useCallback((codigo: string) => {
    return planoContas.find(c => c.codigo === codigo);
  }, [planoContas]);

  // Build formas de pagamento dynamically from cartões + defaults
  const formasPagamento = useMemo(() => {
    const base = ['PIX', 'Dinheiro', 'Débito', 'Boleto', 'Transferência'];
    const cardNames = cartoes.map(c => `Cartão ${c.nome}`);
    return [...cardNames, ...base];
  }, [cartoes]);

  return (
    <FinanceContext.Provider value={{
      receitas, contas, cartoes, faturas, gastos, alertas, categorias, planoContas,
      addReceita, updateReceita, deleteReceita,
      addConta, updateConta, deleteConta,
      addCartao, updateCartao, deleteCartao,
      addFatura, updateFatura, deleteFatura,
      addGasto, updateGasto, deleteGasto,
      addAlerta, updateAlerta, deleteAlerta,
      addCategoria, searchGastos,
      addContaContabil, updateContaContabil, deleteContaContabil,
      getContasFilhas, getContasByCodigo, formasPagamento,
    }}>
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance must be used within FinanceProvider');
  return ctx;
};
