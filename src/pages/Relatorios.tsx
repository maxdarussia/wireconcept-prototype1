import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316', '#EF4444', '#14B8A6', '#6366F1', '#84CC16'];

export default function Relatorios() {
  const { gastos, contas, cartoes, categorias } = useFinance();
  const [mesFilter, setMesFilter] = useState('todos');
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  const [cartaoFilter, setCartaoFilter] = useState('todos');

  const meses = useMemo(() => {
    const ms = new Set<string>();
    gastos.forEach(g => ms.add(g.data.substring(0, 7)));
    contas.forEach(c => ms.add(c.dataVencimento.substring(0, 7)));
    return Array.from(ms).sort().reverse();
  }, [gastos, contas]);

  const filteredGastos = useMemo(() => {
    return gastos.filter(g => {
      if (mesFilter !== 'todos' && g.data.substring(0, 7) !== mesFilter) return false;
      if (categoriaFilter !== 'todas' && g.categoria !== categoriaFilter) return false;
      if (cartaoFilter !== 'todos' && g.cartaoId !== cartaoFilter) return false;
      return true;
    });
  }, [gastos, mesFilter, categoriaFilter, cartaoFilter]);

  // Gastos por categoria (Pie)
  const gastosPorCategoria = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGastos.forEach(g => { map[g.categoria] = (map[g.categoria] || 0) + g.valor; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [filteredGastos]);

  // Gastos mensais (Bar)
  const gastosMensais = useMemo(() => {
    const map: Record<string, number> = {};
    gastos.forEach(g => {
      const m = g.data.substring(0, 7);
      map[m] = (map[m] || 0) + g.valor;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([mes, total]) => {
        const [y, m] = mes.split('-');
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return { mes: format(d, 'MMM/yy', { locale: ptBR }), total };
      });
  }, [gastos]);

  // Top estabelecimentos
  const topEstabelecimentos = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGastos.forEach(g => { map[g.descricao] = (map[g.descricao] || 0) + g.valor; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredGastos]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const totalFiltrado = filteredGastos.reduce((s, g) => s + g.valor, 0);

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1">Análise dos seus gastos</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={mesFilter} onValueChange={setMesFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={cartaoFilter} onValueChange={setCartaoFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos cartões</SelectItem>
            {cartoes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-muted-foreground">Total filtrado:</span>
          <span className="font-bold text-lg">{fmt(totalFiltrado)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gastos por categoria */}
        <div className="finance-card p-5">
          <h3 className="section-title mb-4">Gastos por Categoria</h3>
          {gastosPorCategoria.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={gastosPorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {gastosPorCategoria.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmt(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Gastos mensais */}
        <div className="finance-card p-5">
          <h3 className="section-title mb-4">Gastos Mensais</h3>
          {gastosMensais.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={gastosMensais}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt(v)} />
                <Bar dataKey="total" fill="hsl(160 84% 39%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top estabelecimentos */}
        <div className="finance-card p-5 lg:col-span-2">
          <h3 className="section-title mb-4">Top Estabelecimentos</h3>
          {topEstabelecimentos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sem dados.</p>
          ) : (
            <div className="space-y-3">
              {topEstabelecimentos.map((e, i) => (
                <div key={e.name} className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground w-6 text-right">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{e.name}</span>
                      <span className="text-sm font-semibold">{fmt(e.value)}</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(e.value / topEstabelecimentos[0].value) * 100}%`,
                          backgroundColor: COLORS[i % COLORS.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
