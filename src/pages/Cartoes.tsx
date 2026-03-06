import { useState } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, CreditCard, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CORES_CARTAO } from '@/types/finance';
import type { Cartao } from '@/types/finance';

export default function Cartoes() {
  const { cartoes, addCartao, updateCartao, deleteCartao, faturas } = useFinance();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Cartao | null>(null);
  const [form, setForm] = useState({ nome: '', cor: CORES_CARTAO[0] });

  const resetForm = () => { setForm({ nome: '', cor: CORES_CARTAO[0] }); setEditing(null); };

  const handleSubmit = () => {
    if (!form.nome) return;
    if (editing) {
      updateCartao(editing.id, form);
    } else {
      addCartao(form);
    }
    resetForm();
    setOpen(false);
  };

  const startEdit = (c: Cartao) => {
    setForm({ nome: c.nome, cor: c.cor });
    setEditing(c);
    setOpen(true);
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Cartões de Crédito</h1>
          <p className="text-muted-foreground text-sm mt-1">Gerencie seus cartões e faturas</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 mr-2" />Novo Cartão</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cartão' : 'Novo Cartão'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <Input placeholder="Nome do cartão (ex: Nubank)" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              <div>
                <label className="text-sm font-medium mb-2 block">Cor</label>
                <div className="flex gap-2 flex-wrap">
                  {CORES_CARTAO.map(cor => (
                    <button
                      key={cor}
                      onClick={() => setForm(f => ({ ...f, cor }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform ${form.cor === cor ? 'border-foreground scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleSubmit}>{editing ? 'Salvar' : 'Adicionar'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {cartoes.length === 0 ? (
        <div className="finance-card p-12 text-center">
          <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhum cartão cadastrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoes.map(c => {
            const fats = faturas.filter(f => f.cartaoId === c.id);
            const totalFaturas = fats.reduce((s, f) => s + f.total, 0);
            return (
              <div
                key={c.id}
                className="finance-card p-5 cursor-pointer group"
                onClick={() => navigate(`/cartoes/${c.id}`)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: c.cor + '20' }}>
                      <CreditCard className="w-5 h-5" style={{ color: c.cor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold">{c.nome}</h3>
                      <p className="text-xs text-muted-foreground">{fats.length} fatura(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); startEdit(c); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); deleteCartao(c.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total em faturas</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{fmt(totalFaturas)}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
