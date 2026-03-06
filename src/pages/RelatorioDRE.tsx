import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { ContaContabil } from '@/types/finance';

export default function RelatorioDRE() {
  const { planoContas, gastos, contas, receitas } = useFinance();
  const [filterType, setFilterType] = useState<'mes' | 'ano' | 'intervalo'>('mes');
  const [mesFilter, setMesFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [anoFilter, setAnoFilter] = useState(() => String(new Date().getFullYear()));
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // Filter function for dates
  const isInRange = (dateStr: string) => {
    if (!dateStr) return false;
    const d = dateStr.substring(0, 10);
    if (filterType === 'mes') return d.substring(0, 7) === mesFilter;
    if (filterType === 'ano') return d.substring(0, 4) === anoFilter;
    if (filterType === 'intervalo') {
      if (dataInicio && d < dataInicio) return false;
      if (dataFim && d > dataFim) return false;
      return true;
    }
    return true;
  };

  // Aggregate values by contaContabil code
  const valoresPorConta = useMemo(() => {
    const map: Record<string, number> = {};

    // Gastos de faturas (despesas via cartão - classificadas por contaContabil)
    gastos.forEach(g => {
      if (!isInRange(g.data)) return;
      const code = g.contaContabil;
      if (code) {
        map[code] = (map[code] || 0) + g.valor;
      }
    });

    // Contas a pagar (despesas diretas - não duplicar cartão)
    contas.forEach(c => {
      if (!isInRange(c.dataVencimento)) return;
      const code = c.contaContabil;
      if (code) {
        map[code] = (map[code] || 0) + c.valor;
      }
    });

    // Receitas
    receitas.forEach(r => {
      if (!isInRange(r.dataPrevista)) return;
      const code = r.contaContabil;
      if (code) {
        map[code] = (map[code] || 0) + r.valor;
      }
    });

    return map;
  }, [gastos, contas, receitas, filterType, mesFilter, anoFilter, dataInicio, dataFim]);

  // Calculate totals recursively
  const getTotal = (conta: ContaContabil): number => {
    const children = planoContas.filter(c => c.parentId === conta.id);
    if (children.length === 0) {
      return valoresPorConta[conta.codigo] || 0;
    }
    return children.reduce((sum, child) => sum + getTotal(child), 0) + (valoresPorConta[conta.codigo] || 0);
  };

  const rootContas = useMemo(() =>
    planoContas.filter(c => !c.parentId).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [planoContas]
  );

  const totalReceitas = useMemo(() =>
    rootContas.filter(c => c.tipo === 'receita').reduce((s, c) => s + getTotal(c), 0),
    [rootContas, valoresPorConta, planoContas]
  );

  const totalDespesas = useMemo(() =>
    rootContas.filter(c => c.tipo === 'despesa').reduce((s, c) => s + getTotal(c), 0),
    [rootContas, valoresPorConta, planoContas]
  );

  const resultado = totalReceitas - totalDespesas;

  const renderContaDRE = (conta: ContaContabil, depth: number) => {
    const children = planoContas.filter(c => c.parentId === conta.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
    const total = getTotal(conta);
    const isRoot = !conta.parentId;
    const isLeaf = children.length === 0;

    if (total === 0 && isLeaf) return null; // hide zero leaf accounts

    return (
      <div key={conta.id}>
        <div
          className={`flex items-center justify-between py-2 px-3 ${isRoot ? 'border-b-2 border-border' : depth === 1 ? 'border-b border-border/50' : ''}`}
          style={{ paddingLeft: `${depth * 28 + 16}px` }}
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-muted-foreground">{conta.codigo}</span>
            <span className={`text-sm ${isRoot ? 'font-bold text-base' : depth === 1 ? 'font-semibold' : ''}`}>
              {conta.nome}
            </span>
          </div>
          <span className={`text-sm font-mono tabular-nums ${isRoot ? 'font-bold text-base' : depth === 1 ? 'font-semibold' : ''} ${total > 0 ? '' : 'text-muted-foreground'}`}>
            {fmt(total)}
          </span>
        </div>
        {children.map(child => renderContaDRE(child, depth + 1))}
      </div>
    );
  };

  // Available months/years
  const meses = useMemo(() => {
    const ms = new Set<string>();
    gastos.forEach(g => ms.add(g.data.substring(0, 7)));
    contas.forEach(c => ms.add(c.dataVencimento.substring(0, 7)));
    receitas.forEach(r => ms.add(r.dataPrevista.substring(0, 7)));
    return Array.from(ms).sort().reverse();
  }, [gastos, contas, receitas]);

  const anos = useMemo(() => {
    const as2 = new Set<string>();
    meses.forEach(m => as2.add(m.substring(0, 4)));
    if (as2.size === 0) as2.add(String(new Date().getFullYear()));
    return Array.from(as2).sort().reverse();
  }, [meses]);

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Relatório DRE</h1>
        <p className="text-muted-foreground text-sm mt-1">Demonstrativo de Resultado — visão contábil</p>
      </div>

      {/* Filters */}
      <div className="finance-card p-4">
        <Tabs value={filterType} onValueChange={v => setFilterType(v as typeof filterType)}>
          <TabsList>
            <TabsTrigger value="mes">Por Mês</TabsTrigger>
            <TabsTrigger value="ano">Por Ano</TabsTrigger>
            <TabsTrigger value="intervalo">Intervalo</TabsTrigger>
          </TabsList>
          <TabsContent value="mes" className="mt-3">
            <Select value={mesFilter} onValueChange={setMesFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                {!meses.includes(mesFilter) && <SelectItem value={mesFilter}>{mesFilter}</SelectItem>}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="ano" className="mt-3">
            <Select value={anoFilter} onValueChange={setAnoFilter}>
              <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </TabsContent>
          <TabsContent value="intervalo" className="mt-3">
            <div className="flex gap-3 items-center">
              <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-44" />
              <span className="text-muted-foreground text-sm">até</span>
              <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-44" />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* DRE Report */}
      <div className="finance-card overflow-hidden">
        <div className="p-4 border-b bg-muted/30">
          <h3 className="section-title">Demonstrativo de Resultado</h3>
        </div>
        <div className="divide-y-0">
          {rootContas.map(c => renderContaDRE(c, 0))}
        </div>

        {/* Totals */}
        <div className="border-t-2 border-border">
          <div className="flex items-center justify-between py-3 px-4 bg-success/5">
            <span className="font-bold text-success">Total de Receitas</span>
            <span className="font-bold font-mono tabular-nums text-success">{fmt(totalReceitas)}</span>
          </div>
          <div className="flex items-center justify-between py-3 px-4 bg-destructive/5">
            <span className="font-bold text-destructive">Total de Despesas</span>
            <span className="font-bold font-mono tabular-nums text-destructive">{fmt(totalDespesas)}</span>
          </div>
          <div className={`flex items-center justify-between py-4 px-4 ${resultado >= 0 ? 'bg-success/10' : 'bg-destructive/10'}`}>
            <span className="font-bold text-lg">
              {resultado >= 0 ? '✅ Superávit' : '⚠️ Déficit'}
            </span>
            <span className={`font-bold text-lg font-mono tabular-nums ${resultado >= 0 ? 'text-success' : 'text-destructive'}`}>
              {fmt(Math.abs(resultado))}
            </span>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="finance-card p-4">
        <p className="text-xs text-muted-foreground">
          💡 Para que os valores apareçam no DRE, classifique suas receitas, contas e gastos de fatura com a <strong>Categoria Contábil</strong> correspondente ao plano de contas.
          Cartões de crédito são tratados como meio de pagamento — apenas os gastos individuais são considerados, evitando duplicidade.
        </p>
      </div>
    </div>
  );
}
