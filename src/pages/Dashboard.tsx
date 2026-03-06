import { useFinance } from '@/contexts/FinanceContext';
import { DollarSign, Receipt, CreditCard, TrendingUp, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { format, parseISO, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { receitas, contas, faturas, gastos, alertas } = useFinance();

  const totalReceitas = receitas.filter(r => r.status === 'pendente').reduce((s, r) => s + r.valor, 0);
  const totalContas = contas.filter(c => c.status === 'pendente').reduce((s, c) => s + c.valor, 0);
  const totalFaturas = faturas.reduce((s, f) => s + f.total, 0);
  const saldo = totalReceitas - totalContas - totalFaturas;

  const today = new Date();
  const proximasContas = contas
    .filter(c => c.status === 'pendente')
    .sort((a, b) => a.dataVencimento.localeCompare(b.dataVencimento))
    .slice(0, 5);

  const ultimosGastos = [...gastos]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 5);

  const mesAtual = format(today, 'yyyy-MM');
  const alertasAtivos = alertas.filter(a => a.ativo).map(alerta => {
    const gastosRelacionados = gastos.filter(g => {
      const gMes = g.data.substring(0, 7);
      if (gMes !== mesAtual) return false;
      if (alerta.tipo === 'estabelecimento') return g.descricao.toLowerCase().includes(alerta.referencia.toLowerCase());
      return g.categoria.toLowerCase() === alerta.referencia.toLowerCase();
    });
    const contasRelacionadas = contas.filter(c => {
      const cMes = c.dataVencimento.substring(0, 7);
      if (cMes !== mesAtual) return false;
      if (alerta.tipo === 'categoria') return c.categoria.toLowerCase() === alerta.referencia.toLowerCase();
      return false;
    });
    const totalGasto = gastosRelacionados.reduce((s, g) => s + g.valor, 0) + contasRelacionadas.reduce((s, c) => s + c.valor, 0);
    const pct = (totalGasto / alerta.limiteMensal) * 100;
    const status = pct >= 100 ? 'limite' : pct >= 80 ? 'critico' : pct >= 50 ? 'aviso' : 'normal';
    return { ...alerta, totalGasto, pct, status };
  }).filter(a => a.status !== 'normal');

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Resumo financeiro</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Receitas a Receber</span>
            <div className="w-9 h-9 rounded-lg bg-success/10 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-success" />
            </div>
          </div>
          <span className="text-2xl font-bold text-success">{fmt(totalReceitas)}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Contas a Pagar</span>
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-destructive" />
            </div>
          </div>
          <span className="text-2xl font-bold text-destructive">{fmt(totalContas)}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Faturas de Cartão</span>
            <div className="w-9 h-9 rounded-lg bg-warning/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-warning" />
            </div>
          </div>
          <span className="text-2xl font-bold text-warning">{fmt(totalFaturas)}</span>
        </div>
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Saldo Previsto</span>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
          </div>
          <span className={`text-2xl font-bold ${saldo >= 0 ? 'text-success' : 'text-destructive'}`}>{fmt(saldo)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Últimos Gastos */}
        <div className="finance-card p-5 lg:col-span-1">
          <h3 className="section-title mb-4">Últimos Gastos</h3>
          {ultimosGastos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum gasto cadastrado.</p>
          ) : (
            <div className="space-y-3">
              {ultimosGastos.map(g => (
                <div key={g.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{g.descricao}</p>
                    <p className="text-xs text-muted-foreground">{g.categoria} · {format(parseISO(g.data), 'dd/MM/yyyy')}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive">{fmt(g.valor)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Próximas Contas */}
        <div className="finance-card p-5 lg:col-span-1">
          <h3 className="section-title mb-4">Próximas Contas</h3>
          {proximasContas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma conta pendente.</p>
          ) : (
            <div className="space-y-3">
              {proximasContas.map(c => {
                const venc = parseISO(c.dataVencimento);
                const vencendo = isAfter(today, venc) || isAfter(addDays(today, 3), venc);
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{c.nome}</p>
                      <p className={`text-xs ${vencendo ? 'text-destructive' : 'text-muted-foreground'}`}>
                        <Clock className="w-3 h-3 inline mr-1" />
                        {format(venc, 'dd/MM/yyyy')}
                      </p>
                    </div>
                    <span className="text-sm font-semibold">{fmt(c.valor)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="finance-card p-5 lg:col-span-1">
          <h3 className="section-title mb-4">Alertas Ativos</h3>
          {alertasAtivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum alerta ativo.</p>
          ) : (
            <div className="space-y-3">
              {alertasAtivos.map(a => (
                <div key={a.id} className={`p-3 rounded-lg border ${a.status === 'limite' ? 'border-destructive bg-destructive/5' : a.status === 'critico' ? 'border-warning bg-warning/5' : 'border-primary bg-primary/5'}`}>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${a.status === 'limite' ? 'text-destructive' : a.status === 'critico' ? 'text-warning' : 'text-primary'}`} />
                    <span className="text-sm font-medium">{a.nome}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {fmt(a.totalGasto)} de {fmt(a.limiteMensal)} ({Math.round(a.pct)}%)
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
