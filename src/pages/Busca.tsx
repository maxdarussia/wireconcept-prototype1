import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function Busca() {
  const { gastos, cartoes, faturas } = useFinance();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return gastos.filter(g =>
      g.descricao.toLowerCase().includes(q) || g.categoria.toLowerCase().includes(q)
    );
  }, [query, gastos]);

  const totalGasto = results.reduce((s, g) => s + g.valor, 0);
  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getCartaoNome = (cartaoId: string) => cartoes.find(c => c.id === cartaoId)?.nome || 'Desconhecido';
  const getFaturaMes = (faturaId: string) => {
    const f = faturas.find(f => f.id === faturaId);
    return f ? f.mes : '';
  };

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Busca de Gastos</h1>
        <p className="text-muted-foreground text-sm mt-1">Pesquise gastos em todas as faturas</p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          className="pl-11 h-12 text-base"
          placeholder="Pesquisar (ex: Burger King, Mercado...)"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
      </div>

      {query.trim() && (
        <>
          <div className="finance-card p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{results.length} resultado(s) encontrado(s)</span>
            <span className="font-bold text-lg">{fmt(totalGasto)}</span>
          </div>

          <div className="finance-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground">Descrição</th>
                  <th className="text-right p-3 text-sm font-medium text-muted-foreground">Valor</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                  <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Cartão / Fatura</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-8 text-muted-foreground text-sm">Nenhum resultado.</td></tr>
                ) : (
                  results.map(g => (
                    <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3 text-sm font-medium">{g.descricao}</td>
                      <td className="p-3 text-sm text-right font-semibold">{fmt(g.valor)}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{format(parseISO(g.data), 'dd/MM/yyyy')}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{g.categoria}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{getCartaoNome(g.cartaoId)} · {getFaturaMes(g.faturaId)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
