import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, AlertTriangle, Bell } from 'lucide-react';
import { format } from 'date-fns';
import type { AlertaGasto, AlertaStatus } from '@/types/finance';

export default function Alertas() {
  const { alertas, addAlerta, updateAlerta, deleteAlerta, gastos, contas, categorias } = useFinance();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: '', tipo: 'estabelecimento' as 'estabelecimento' | 'categoria', referencia: '', limiteMensal: '', ativo: true });

  const mesAtual = format(new Date(), 'yyyy-MM');

  const handleSubmit = () => {
    if (!form.nome || !form.referencia || !form.limiteMensal) return;
    addAlerta({ ...form, limiteMensal: parseFloat(form.limiteMensal) });
    setForm({ nome: '', tipo: 'estabelecimento', referencia: '', limiteMensal: '', ativo: true });
    setOpen(false);
  };

  const alertasComStatus = useMemo(() => {
    return alertas.map(alerta => {
      const gastosRelacionados = gastos.filter(g => {
        if (g.data.substring(0, 7) !== mesAtual) return false;
        if (alerta.tipo === 'estabelecimento') return g.descricao.toLowerCase().includes(alerta.referencia.toLowerCase());
        return g.categoria.toLowerCase() === alerta.referencia.toLowerCase();
      });
      const contasRelacionadas = contas.filter(c => {
        if (c.dataVencimento.substring(0, 7) !== mesAtual) return false;
        if (alerta.tipo === 'categoria') return c.categoria.toLowerCase() === alerta.referencia.toLowerCase();
        return false;
      });
      const totalGasto = gastosRelacionados.reduce((s, g) => s + g.valor, 0) + contasRelacionadas.reduce((s, c) => s + c.valor, 0);
      const pct = alerta.limiteMensal > 0 ? (totalGasto / alerta.limiteMensal) * 100 : 0;
      const status: AlertaStatus = pct >= 100 ? 'limite' : pct >= 80 ? 'critico' : pct >= 50 ? 'aviso' : 'normal';
      return { ...alerta, totalGasto, pct, status };
    });
  }, [alertas, gastos, contas, mesAtual]);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const statusColors: Record<AlertaStatus, string> = {
    normal: 'bg-success/10 text-success',
    aviso: 'bg-warning/10 text-warning',
    critico: 'bg-destructive/10 text-destructive',
    limite: 'bg-destructive text-destructive-foreground',
  };

  const statusLabels: Record<AlertaStatus, string> = {
    normal: 'Normal',
    aviso: 'Aviso (50%)',
    critico: 'Crítico (80%)',
    limite: 'Limite Atingido',
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Alertas de Gastos</h1>
          <p className="text-muted-foreground text-sm mt-1">Configure limites de gastos mensais</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Alerta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Alerta</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Input placeholder="Nome do alerta" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as 'estabelecimento' | 'categoria', referencia: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="estabelecimento">Estabelecimento</SelectItem>
                  <SelectItem value="categoria">Categoria</SelectItem>
                </SelectContent>
              </Select>
              {form.tipo === 'categoria' ? (
                <Select value={form.referencia} onValueChange={v => setForm(f => ({ ...f, referencia: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="Nome do estabelecimento" value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))} />
              )}
              <Input type="number" placeholder="Limite mensal (R$)" value={form.limiteMensal} onChange={e => setForm(f => ({ ...f, limiteMensal: e.target.value }))} />
              <Button className="w-full" onClick={handleSubmit}>Criar Alerta</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {alertasComStatus.length === 0 ? (
        <div className="finance-card p-12 text-center">
          <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum alerta configurado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {alertasComStatus.map(a => (
            <div key={a.id} className={`finance-card p-5 ${a.status === 'limite' ? 'border-destructive' : a.status === 'critico' ? 'border-warning' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {a.status !== 'normal' && <AlertTriangle className={`w-4 h-4 ${a.status === 'limite' || a.status === 'critico' ? 'text-destructive' : 'text-warning'}`} />}
                  <h3 className="font-semibold">{a.nome}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={a.ativo} onCheckedChange={v => updateAlerta(a.id, { ativo: v })} />
                  <Button variant="ghost" size="icon" onClick={() => deleteAlerta(a.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                {a.tipo === 'estabelecimento' ? 'Estabelecimento' : 'Categoria'}: {a.referencia}
              </p>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">{fmt(a.totalGasto)} / {fmt(a.limiteMensal)}</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[a.status]}`}>
                  {statusLabels[a.status]}
                </span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${a.status === 'limite' ? 'bg-destructive' : a.status === 'critico' ? 'bg-destructive' : a.status === 'aviso' ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(a.pct, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1 text-right">{Math.round(a.pct)}% utilizado</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
