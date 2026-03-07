import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import type { Receita } from '@/types/finance';

export default function Receitas() {
  const { receitas, addReceita, updateReceita, deleteReceita, planoContas } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Receita | null>(null);
  const [form, setForm] = useState({ descricao: '', valor: '', dataPrevista: '', status: 'pendente' as 'pendente' | 'recebido', observacao: '', contaContabil: '' });

  const leafContas = planoContas.filter(c => c.tipo === 'receita' && !planoContas.some(other => other.parentId === c.id)).sort((a, b) => a.codigo.localeCompare(b.codigo));

  const resetForm = () => { setForm({ descricao: '', valor: '', dataPrevista: '', status: 'pendente', observacao: '', contaContabil: '' }); setEditing(null); };

  const handleSubmit = () => {
    if (!form.descricao || !form.valor || !form.dataPrevista) return;
    const payload = { descricao: form.descricao, valor: parseFloat(form.valor), dataPrevista: form.dataPrevista, status: form.status, observacao: form.observacao, contaContabil: form.contaContabil || undefined };
    if (editing) {
      updateReceita(editing.id, payload);
    } else {
      addReceita(payload);
    }
    resetForm();
    setOpen(false);
  };

  const startEdit = (r: Receita) => {
    setForm({ descricao: r.descricao, valor: String(r.valor), dataPrevista: r.dataPrevista, status: r.status, observacao: r.observacao || '', contaContabil: r.contaContabil || '' });
    setEditing(r);
    setOpen(true);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Receitas a Receber</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie suas receitas</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Receita</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Receita' : 'Nova Receita'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input placeholder="Descrição" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              <Input type="number" placeholder="Valor" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} />
              <Input type="date" value={form.dataPrevista} onChange={e => setForm(f => ({ ...f, dataPrevista: e.target.value }))} />
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as 'pendente' | 'recebido' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="recebido">Recebido</SelectItem>
                </SelectContent>
              </Select>
              <Select value={form.contaContabil || '__none__'} onValueChange={v => setForm(f => ({ ...f, contaContabil: v === '__none__' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Categoria Contábil (DRE)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Nenhuma</SelectItem>
                  {leafContas.map(c => (
                    <SelectItem key={c.id} value={c.codigo}>{c.codigo} — {c.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Textarea placeholder="Observação (opcional)" value={form.observacao} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} />
              <Button className="w-full" onClick={handleSubmit}>{editing ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="finance-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Descrição</th>
              <th className="text-right p-3 text-sm font-medium text-muted-foreground">Valor</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden sm:table-cell">Data</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground hidden lg:table-cell">Contábil</th>
              <th className="text-left p-3 text-sm font-medium text-muted-foreground">Status</th>
              <th className="text-right p-3 text-sm font-medium text-muted-foreground">Ações</th>
            </tr>
          </thead>
          <tbody>
            {receitas.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">Nenhuma receita cadastrada.</td></tr>
            )}
            {receitas.map(r => (
              <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="p-3 text-sm font-medium">{r.descricao}</td>
                <td className="p-3 text-sm text-right font-semibold text-success">{fmt(r.valor)}</td>
                <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{format(parseISO(r.dataPrevista), 'dd/MM/yyyy')}</td>
                <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                  {r.contaContabil ? <span className="font-mono text-xs">{r.contaContabil}</span> : '—'}
                </td>
                <td className="p-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${r.status === 'recebido' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                    {r.status === 'recebido' ? 'Recebido' : 'Pendente'}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <div className="flex gap-1 justify-end">
                    {r.status === 'pendente' && (
                      <Button variant="ghost" size="icon" onClick={() => updateReceita(r.id, { status: 'recebido' })} title="Marcar como recebido">
                        <Check className="w-4 h-4 text-success" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => startEdit(r)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteReceita(r.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
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
