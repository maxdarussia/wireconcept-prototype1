import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { GastoFatura } from '@/types/finance';

export default function CartaoFaturas() {
  const { cartaoId } = useParams<{ cartaoId: string }>();
  const navigate = useNavigate();
  const { cartoes, faturas, gastos, addFatura, updateFatura, deleteFatura, addGasto, updateGasto, deleteGasto, categorias, addCategoria, planoContas } = useFinance();

  const cartao = cartoes.find(c => c.id === cartaoId);
  const cartaoFaturas = faturas.filter(f => f.cartaoId === cartaoId).sort((a, b) => b.mes.localeCompare(a.mes));

  const [openFatura, setOpenFatura] = useState(false);
  const [faturaForm, setFaturaForm] = useState({ mes: '' });

  const [openGasto, setOpenGasto] = useState(false);
  const [gastoFaturaId, setGastoFaturaId] = useState('');
  const [editingGasto, setEditingGasto] = useState<GastoFatura | null>(null);
  const [gastoForm, setGastoForm] = useState({ descricao: '', valor: '', data: '', categoria: '', observacao: '', contaContabil: '' });
  const [novaCategoria, setNovaCategoria] = useState('');

  const [expandedFatura, setExpandedFatura] = useState<string | null>(null);

  // Leaf accounts for contaContabil selection
  const leafContas = planoContas.filter(c => {
    return !planoContas.some(other => other.parentId === c.id);
  }).sort((a, b) => a.codigo.localeCompare(b.codigo));

  if (!cartao) {
    return (
      <div className="page-container">
        <p className="text-muted-foreground">Cartão não encontrado.</p>
        <Button variant="ghost" onClick={() => navigate('/cartoes')}><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
      </div>
    );
  }

  const handleAddFatura = () => {
    if (!faturaForm.mes || !cartaoId) return;
    const existing = cartaoFaturas.find(f => f.mes === faturaForm.mes);
    if (existing) return;
    addFatura({ cartaoId, mes: faturaForm.mes, total: 0 });
    setFaturaForm({ mes: '' });
    setOpenFatura(false);
  };

  const handleGastoSubmit = () => {
    if (!gastoForm.descricao || !gastoForm.valor || !gastoForm.data || !gastoForm.categoria) return;
    const val = parseFloat(gastoForm.valor);
    const payload = { descricao: gastoForm.descricao, valor: val, data: gastoForm.data, categoria: gastoForm.categoria, observacao: gastoForm.observacao, contaContabil: gastoForm.contaContabil || undefined, formaPagamento: cartao ? `Cartão ${cartao.nome}` : undefined };
    if (editingGasto) {
      updateGasto(editingGasto.id, payload);
      const faturaGastos = gastos.filter(g => g.faturaId === editingGasto.faturaId && g.id !== editingGasto.id);
      const newTotal = faturaGastos.reduce((s, g) => s + g.valor, 0) + val;
      updateFatura(editingGasto.faturaId, { total: newTotal });
    } else {
      addGasto({ ...payload, faturaId: gastoFaturaId, cartaoId: cartaoId! });
      const faturaGastos = gastos.filter(g => g.faturaId === gastoFaturaId);
      const newTotal = faturaGastos.reduce((s, g) => s + g.valor, 0) + val;
      updateFatura(gastoFaturaId, { total: newTotal });
    }
    setGastoForm({ descricao: '', valor: '', data: '', categoria: '', observacao: '', contaContabil: '' });
    setEditingGasto(null);
    setOpenGasto(false);
  };

  const handleDeleteGasto = (g: GastoFatura) => {
    deleteGasto(g.id);
    const faturaGastos = gastos.filter(gs => gs.faturaId === g.faturaId && gs.id !== g.id);
    const newTotal = faturaGastos.reduce((s, gs) => s + gs.valor, 0);
    updateFatura(g.faturaId, { total: newTotal });
  };

  const startEditGasto = (g: GastoFatura) => {
    setGastoForm({ descricao: g.descricao, valor: String(g.valor), data: g.data, categoria: g.categoria, observacao: g.observacao || '', contaContabil: g.contaContabil || '' });
    setEditingGasto(g);
    setGastoFaturaId(g.faturaId);
    setOpenGasto(true);
  };

  const openAddGasto = (faturaId: string) => {
    setGastoFaturaId(faturaId);
    setEditingGasto(null);
    setGastoForm({ descricao: '', valor: '', data: '', categoria: '', observacao: '', contaContabil: '' });
    setOpenGasto(true);
  };

  const handleAddCategoria = () => {
    if (novaCategoria.trim()) {
      addCategoria(novaCategoria.trim());
      setGastoForm(f => ({ ...f, categoria: novaCategoria.trim() }));
      setNovaCategoria('');
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatMes = (mes: string) => {
    const [y, m] = mes.split('-');
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return format(d, 'MMMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase());
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/cartoes')}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cartao.cor + '20' }}>
            <span className="font-bold" style={{ color: cartao.cor }}>{cartao.nome[0]}</span>
          </div>
          <div>
            <h1 className="page-title">{cartao.nome}</h1>
            <p className="text-muted-foreground text-sm">Faturas do cartão</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Dialog open={openFatura} onOpenChange={setOpenFatura}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Nova Fatura</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova Fatura</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <Input type="month" value={faturaForm.mes} onChange={e => setFaturaForm({ mes: e.target.value })} />
              <Button className="w-full" onClick={handleAddFatura}>Criar Fatura</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cartaoFaturas.length === 0 ? (
        <div className="finance-card p-12 text-center">
          <p className="text-muted-foreground">Nenhuma fatura cadastrada.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {cartaoFaturas.map(f => {
            const fatGastos = gastos.filter(g => g.faturaId === f.id).sort((a, b) => b.data.localeCompare(a.data));
            const isExpanded = expandedFatura === f.id;
            return (
              <div key={f.id} className="finance-card overflow-hidden">
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-muted/30"
                  onClick={() => setExpandedFatura(isExpanded ? null : f.id)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
                    <div>
                      <h3 className="font-semibold">{formatMes(f.mes)}</h3>
                      <p className="text-xs text-muted-foreground">{fatGastos.length} item(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">{fmt(f.total)}</span>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteFatura(f.id); }}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {isExpanded && (
                  <div className="border-t">
                    <div className="p-4 flex justify-end">
                      <Button size="sm" onClick={() => openAddGasto(f.id)}>
                        <Plus className="w-4 h-4 mr-2" />Adicionar Gasto
                      </Button>
                    </div>
                    {fatGastos.length === 0 ? (
                      <p className="text-center text-sm text-muted-foreground pb-4">Nenhum gasto nesta fatura.</p>
                    ) : (
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground">Descrição</th>
                            <th className="text-right p-3 text-xs font-medium text-muted-foreground">Valor</th>
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                            <th className="text-left p-3 text-xs font-medium text-muted-foreground hidden lg:table-cell">Conta Contábil</th>
                            <th className="text-right p-3 text-xs font-medium text-muted-foreground">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fatGastos.map(g => (
                            <tr key={g.id} className="border-b last:border-0 hover:bg-muted/20">
                              <td className="p-3 text-sm">{g.descricao}</td>
                              <td className="p-3 text-sm text-right font-semibold">{fmt(g.valor)}</td>
                              <td className="p-3 text-sm text-muted-foreground hidden sm:table-cell">{format(parseISO(g.data), 'dd/MM/yyyy')}</td>
                              <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{g.categoria}</td>
                              <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                                {g.contaContabil ? <span className="font-mono text-xs">{g.contaContabil}</span> : <span className="text-xs italic">—</span>}
                              </td>
                              <td className="p-3 text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button variant="ghost" size="icon" onClick={() => startEditGasto(g)}><Pencil className="w-3 h-3" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteGasto(g)}><Trash2 className="w-3 h-3 text-destructive" /></Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={openGasto} onOpenChange={(o) => { setOpenGasto(o); if (!o) { setEditingGasto(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingGasto ? 'Editar Gasto' : 'Novo Gasto'}</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-2">
            <Input placeholder="Descrição (ex: Burger King)" value={gastoForm.descricao} onChange={e => setGastoForm(f => ({ ...f, descricao: e.target.value }))} />
            <Input type="number" placeholder="Valor" value={gastoForm.valor} onChange={e => setGastoForm(f => ({ ...f, valor: e.target.value }))} />
            <Input type="date" value={gastoForm.data} onChange={e => setGastoForm(f => ({ ...f, data: e.target.value }))} />
            <Select value={gastoForm.categoria} onValueChange={v => setGastoForm(f => ({ ...f, categoria: v }))}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>
                {categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Input placeholder="Nova categoria" value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} />
              <Button variant="outline" onClick={handleAddCategoria} disabled={!novaCategoria.trim()}>Criar</Button>
            </div>
            <Select value={gastoForm.contaContabil} onValueChange={v => setGastoForm(f => ({ ...f, contaContabil: v }))}>
              <SelectTrigger><SelectValue placeholder="Categoria Contábil (DRE)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {leafContas.map(c => (
                  <SelectItem key={c.id} value={c.codigo}>{c.codigo} — {c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea placeholder="Observação (opcional)" value={gastoForm.observacao} onChange={e => setGastoForm(f => ({ ...f, observacao: e.target.value }))} />
            <Button className="w-full" onClick={handleGastoSubmit}>{editingGasto ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
