import { useState, useMemo } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown } from 'lucide-react';
import type { ContaContabil } from '@/types/finance';

export default function PlanoContas() {
  const { planoContas, addContaContabil, updateContaContabil, deleteContaContabil } = useFinance();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ContaContabil | null>(null);
  const [parentCodigo, setParentCodigo] = useState<string>('');
  const [form, setForm] = useState({ codigo: '', nome: '', tipo: 'despesa' as 'receita' | 'despesa' });
  const [expanded, setExpanded] = useState<Set<string>>(new Set(planoContas.filter(c => !c.codigo.includes('.')).map(c => c.id)));

  const rootContas = useMemo(() =>
    planoContas.filter(c => !c.parentId).sort((a, b) => a.codigo.localeCompare(b.codigo)),
    [planoContas]
  );

  const getChildren = (parentId: string) =>
    planoContas.filter(c => c.parentId === parentId).sort((a, b) => a.codigo.localeCompare(b.codigo));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getNextCode = (parentCode: string) => {
    const children = planoContas.filter(c => {
      if (!parentCode) return !c.codigo.includes('.');
      if (!c.codigo.startsWith(parentCode + '.')) return false;
      const rest = c.codigo.substring(parentCode.length + 1);
      return !rest.includes('.');
    });
    if (children.length === 0) return parentCode ? `${parentCode}.1` : '1';
    const lastNum = Math.max(...children.map(c => {
      const parts = c.codigo.split('.');
      return parseInt(parts[parts.length - 1]) || 0;
    }));
    return parentCode ? `${parentCode}.${lastNum + 1}` : `${lastNum + 1}`;
  };

  const openAddRoot = () => {
    setEditing(null);
    setParentCodigo('');
    const code = getNextCode('');
    setForm({ codigo: code, nome: '', tipo: 'despesa' });
    setOpen(true);
  };

  const openAddChild = (parent: ContaContabil) => {
    setEditing(null);
    setParentCodigo(parent.codigo);
    const code = getNextCode(parent.codigo);
    setForm({ codigo: code, nome: '', tipo: parent.tipo });
    setOpen(true);
  };

  const openEdit = (conta: ContaContabil) => {
    setEditing(conta);
    setParentCodigo('');
    setForm({ codigo: conta.codigo, nome: conta.nome, tipo: conta.tipo });
    setOpen(true);
  };

  const handleSubmit = () => {
    if (!form.codigo || !form.nome) return;
    if (editing) {
      updateContaContabil(editing.id, { nome: form.nome, tipo: form.tipo });
    } else {
      const parentId = parentCodigo
        ? planoContas.find(c => c.codigo === parentCodigo)?.id
        : undefined;
      addContaContabil({ codigo: form.codigo, nome: form.nome, tipo: form.tipo, parentId });
    }
    setOpen(false);
    setEditing(null);
  };

  const renderConta = (conta: ContaContabil, depth: number) => {
    const children = getChildren(conta.id);
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(conta.id);
    const isLeaf = !hasChildren;
    const level = conta.codigo.split('.').length;

    return (
      <div key={conta.id}>
        <div
          className={`flex items-center gap-2 py-2.5 px-3 hover:bg-muted/40 rounded-lg group transition-colors`}
          style={{ paddingLeft: `${depth * 24 + 12}px` }}
        >
          <button
            className="w-5 h-5 flex items-center justify-center shrink-0"
            onClick={() => hasChildren && toggleExpand(conta.id)}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />
            ) : <span className="w-4" />}
          </button>

          <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${conta.tipo === 'receita' ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'}`}>
            {conta.codigo}
          </span>
          <span className={`text-sm flex-1 ${level === 1 ? 'font-bold' : level === 2 ? 'font-semibold' : 'font-normal'}`}>
            {conta.nome}
          </span>

          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openAddChild(conta)} title="Adicionar subconta">
              <Plus className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(conta)}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteContaContabil(conta.id)}>
              <Trash2 className="w-3.5 h-3.5 text-destructive" />
            </Button>
          </div>
        </div>
        {isExpanded && children.map(child => renderConta(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Plano de Contas</h1>
          <p className="text-muted-foreground text-sm mt-1">Estrutura contábil hierárquica para o DRE</p>
        </div>
        <Button onClick={openAddRoot}><Plus className="w-4 h-4 mr-2" />Nova Conta Raiz</Button>
      </div>

      <div className="finance-card p-4">
        {rootContas.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma conta cadastrada.</p>
        ) : (
          <div className="space-y-0.5">
            {rootContas.map(c => renderConta(c, 0))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Conta' : parentCodigo ? `Nova Subconta de ${parentCodigo}` : 'Nova Conta Raiz'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Código</label>
              <Input value={form.codigo} onChange={e => setForm(f => ({ ...f, codigo: e.target.value }))} disabled={!!editing} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Nome</label>
              <Input placeholder="Nome da conta" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Tipo</label>
              <Select value={form.tipo} onValueChange={v => setForm(f => ({ ...f, tipo: v as 'receita' | 'despesa' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="receita">Receita</SelectItem>
                  <SelectItem value="despesa">Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSubmit}>{editing ? 'Salvar' : 'Criar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
