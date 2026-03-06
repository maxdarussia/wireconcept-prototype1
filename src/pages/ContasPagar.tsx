import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Conta } from '@/types/finance';

export default function ContasPagar() {
  const { contas, addConta, updateConta, deleteConta, categorias } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Conta | null>(null);
  const [form, setForm] = useState({ nome: '', valor: '', dataVencimento: '', categoria: '', status: 'pendente' as 'pendente' | 'pago' });

  const resetForm = () => { setForm({ nome: '', valor: '', dataVencimento: '', categoria: '', status: 'pendente' as 'pendente' | 'pago' }); setEditing(null); };

  const handleSubmit = () => {
    if (!form.nome || !form.valor || !form.dataVencimento || !form.categoria) return;
    if (editing) {
      updateConta(editing.id, { ...form, valor: parseFloat(form.valor) });
    } else {
      addConta({ ...form, valor: parseFloat(form.valor) });
    }
    resetForm();
    setOpen(false);
  };

  const startEdit = (c: Conta) => {
    setForm({ nome: c.nome, valor: String(c.valor), dataVencimento: c.dataVencimento, categoria: c.categoria, status: c.status });
    setEditing(c);
    setOpen(true);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Contas a Pagar</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas despesas</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Conta</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input placeholder="Nome da conta" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <Input type="number" placeholder="Valor" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              <Input type="date" value={form.dataVencimento} onChange={e => setForm(f => ({ ...f, dataVencimento: e.target.value }))} />
              <Select value={form.categoria} onValueChange={v => setForm(f => ({ ...f, categoria: v }))}>
                <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'pendente' | 'pago' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                </SelectContent>
              </Select>
              <Button className="w-full" onClick={handleSubmit}>{editing ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="finance-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Conta</th>
              <th className="text-right p-3 text-sm font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden sm:table-cell">Vencimento</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right p-3 text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {contas.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Nenhuma conta cadastrada.</td></tr>
            )}
            {contas.map(c => (
              <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{c.nome}</td>
                <td className="p-3 text-sm text-right font-semibold text-destructive">{fmt(c.valor)}</td>
                <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{format(parseISO(c.dataVencimento), 'dd/MM/yyyy')}</td>
                <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{c.categoria}</td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${c.status === 'pago' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {c.status === 'pago' ? 'Pago' : 'Pendente'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {c.status === 'pendente' && (
                      <Button variant="ghost" size="icon" onClick={() => updateConta(c.id, { status: 'pago' })} title="Marcar como pago">
                        <Check className="w-4 h-4 text-success" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => startEdit(c)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteConta(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
