import { useState, useMemo, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, FileText, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, DollarSign, BarChart3, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import type { ContaContabil } from '@/types/finance';

interface ResumoGerado {
  id: string;
  periodo: string;
  periodoLabel: string;
  dataGeracao: string;
  status: 'processando' | 'disponivel' | 'erro';
  dados?: DadosDRE;
}

interface DadosDRE {
  receitaTotal: number;
  custos: number;
  despesas: number;
  lucroOperacional: number;
  lucroLiquido: number;
  detalhes: { codigo: string; nome: string; tipo: string; valor: number }[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const HISTORICO_KEY = 'fin_resumo_dre_historico';

const loadHistorico = (): ResumoGerado[] => {
  try {
    const v = localStorage.getItem(HISTORICO_KEY);
    return v ? JSON.parse(v) : [];
  } catch { return []; }
};

const saveHistorico = (h: ResumoGerado[]) => {
  localStorage.setItem(HISTORICO_KEY, JSON.stringify(h));
};

export default function ResumoAnualDRE() {
  const { planoContas, gastos, contas, receitas } = useFinance();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [periodo, setPeriodo] = useState(`${currentYear}`);
  const [historico, setHistorico] = useState<ResumoGerado[]>(() => loadHistorico());
  const [gerando, setGerando] = useState(false);

  const anos = useMemo(() => {
    const set = new Set<string>();
    gastos.forEach(g => set.add(g.data.substring(0, 4)));
    contas.forEach(c => set.add(c.dataVencimento.substring(0, 4)));
    receitas.forEach(r => set.add(r.dataPrevista.substring(0, 4)));
    set.add(String(currentYear));
    return Array.from(set).sort().reverse();
  }, [gastos, contas, receitas, currentYear]);

  const getTotal = useCallback((conta: ContaContabil, valoresPorConta: Record<string, number>): number => {
    const children = planoContas.filter(c => c.parentId === conta.id);
    if (children.length === 0) return valoresPorConta[conta.codigo] || 0;
    return children.reduce((sum, child) => sum + getTotal(child, valoresPorConta), 0) + (valoresPorConta[conta.codigo] || 0);
  }, [planoContas]);

  const gerarResumo = useCallback(() => {
    setGerando(true);
    const id = crypto.randomUUID();
    const novoResumo: ResumoGerado = {
      id,
      periodo,
      periodoLabel: `Ano ${periodo}`,
      dataGeracao: new Date().toISOString(),
      status: 'processando',
    };

    setHistorico(prev => {
      const updated = [novoResumo, ...prev];
      saveHistorico(updated);
      return updated;
    });

    // Simulate brief processing then compute
    setTimeout(() => {
      try {
        const isInRange = (dateStr: string) => {
          if (!dateStr) return false;
          return dateStr.substring(0, 4) === periodo;
        };

        const valoresPorConta: Record<string, number> = {};
        gastos.forEach(g => {
          if (!isInRange(g.data)) return;
          if (g.contaContabil) valoresPorConta[g.contaContabil] = (valoresPorConta[g.contaContabil] || 0) + g.valor;
        });
        contas.forEach(c => {
          if (!isInRange(c.dataVencimento)) return;
          if (c.contaContabil) valoresPorConta[c.contaContabil] = (valoresPorConta[c.contaContabil] || 0) + c.valor;
        });
        receitas.forEach(r => {
          if (!isInRange(r.dataPrevista)) return;
          if (r.contaContabil) valoresPorConta[r.contaContabil] = (valoresPorConta[r.contaContabil] || 0) + r.valor;
        });

        const rootContas = planoContas.filter(c => !c.parentId).sort((a, b) => a.codigo.localeCompare(b.codigo));
        const receitaTotal = rootContas.filter(c => c.tipo === 'receita').reduce((s, c) => s + getTotal(c, valoresPorConta), 0);
        const despesasTotal = rootContas.filter(c => c.tipo === 'despesa').reduce((s, c) => s + getTotal(c, valoresPorConta), 0);

        const detalhes = planoContas
          .filter(c => !c.parentId)
          .sort((a, b) => a.codigo.localeCompare(b.codigo))
          .map(c => ({ codigo: c.codigo, nome: c.nome, tipo: c.tipo, valor: getTotal(c, valoresPorConta) }));

        const dados: DadosDRE = {
          receitaTotal,
          custos: 0,
          despesas: despesasTotal,
          lucroOperacional: receitaTotal - despesasTotal,
          lucroLiquido: receitaTotal - despesasTotal,
          detalhes,
        };

        setHistorico(prev => {
          const updated = prev.map(r => r.id === id ? { ...r, status: 'disponivel' as const, dados } : r);
          saveHistorico(updated);
          return updated;
        });

        toast({ title: '✅ Resumo pronto!', description: 'Seu DRE está disponível para download.' });
      } catch {
        setHistorico(prev => {
          const updated = prev.map(r => r.id === id ? { ...r, status: 'erro' as const } : r);
          saveHistorico(updated);
          return updated;
        });
        toast({ title: '❌ Erro ao gerar', description: 'Não foi possível gerar o resumo. Tente novamente.', variant: 'destructive' });
      } finally {
        setGerando(false);
      }
    }, 1200);
  }, [periodo, gastos, contas, receitas, planoContas, getTotal, toast]);

  const baixarCSV = useCallback((resumo: ResumoGerado) => {
    if (!resumo.dados) return;
    const { dados } = resumo;
    const lines = [
      'Demonstrativo de Resultado do Exercício (DRE)',
      `Período: ${resumo.periodoLabel}`,
      `Gerado em: ${new Date(resumo.dataGeracao).toLocaleDateString('pt-BR')}`,
      '',
      'Categoria,Tipo,Valor',
      ...dados.detalhes.map(d => `"${d.nome}",${d.tipo === 'receita' ? 'Receita' : 'Despesa'},${d.valor.toFixed(2)}`),
      '',
      `Receita Total,,${dados.receitaTotal.toFixed(2)}`,
      `Total de Despesas,,${dados.despesas.toFixed(2)}`,
      `Resultado,,${dados.lucroLiquido.toFixed(2)}`,
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DRE_${resumo.periodo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const baixarPDF = useCallback((resumo: ResumoGerado) => {
    if (!resumo.dados) return;
    const { dados } = resumo;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text('Demonstrativo de Resultado (DRE)', 14, y);
    y += 10;
    doc.setFontSize(11);
    doc.text(`Período: ${resumo.periodoLabel}`, 14, y);
    y += 6;
    doc.text(`Gerado em: ${new Date(resumo.dataGeracao).toLocaleDateString('pt-BR')}`, 14, y);
    y += 12;

    // Summary cards
    doc.setFontSize(12);
    doc.setTextColor(34, 139, 34);
    doc.text(`Receita Total: ${fmt(dados.receitaTotal)}`, 14, y);
    y += 8;
    doc.setTextColor(220, 53, 69);
    doc.text(`Total de Despesas: ${fmt(dados.despesas)}`, 14, y);
    y += 8;
    const isPositive = dados.lucroLiquido >= 0;
    doc.setTextColor(isPositive ? 34 : 220, isPositive ? 139 : 53, isPositive ? 34 : 69);
    doc.text(`Resultado: ${fmt(dados.lucroLiquido)} ${isPositive ? '(Superávit)' : '(Déficit)'}`, 14, y);
    y += 14;

    // Table
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text('Detalhamento por Conta', 14, y);
    y += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Código', 14, y);
    doc.text('Conta', 40, y);
    doc.text('Tipo', 130, y);
    doc.text('Valor', 160, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    dados.detalhes.forEach(d => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(d.codigo, 14, y);
      doc.text(d.nome, 40, y);
      doc.text(d.tipo === 'receita' ? 'Receita' : 'Despesa', 130, y);
      doc.text(fmt(d.valor), 160, y);
      y += 6;
    });

    doc.save(`DRE_${resumo.periodo}.pdf`);
  }, []);

  const removerResumo = useCallback((id: string) => {
    setHistorico(prev => {
      const updated = prev.filter(r => r.id !== id);
      saveHistorico(updated);
      return updated;
    });
  }, []);

  const statusBadge = (status: ResumoGerado['status']) => {
    switch (status) {
      case 'processando':
        return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Em processamento</Badge>;
      case 'disponivel':
        return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3 h-3" />Disponível para download</Badge>;
      case 'erro':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Erro — tente novamente</Badge>;
    }
  };

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Resumo Anual (DRE)</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gere e baixe o resumo financeiro do ano em poucos cliques.
        </p>
      </div>

      {/* Step 1 & 2: Select period and generate */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gerar novo resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map(a => (
                    <SelectItem key={a} value={a}>Ano {a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={gerarResumo} disabled={gerando} className="gap-2">
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
              {gerando ? 'Gerando...' : 'Gerar resumo'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest available result preview */}
      {historico.length > 0 && historico[0].status === 'disponivel' && historico[0].dados && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Receita Total</span>
              <span className="font-bold text-emerald-600 tabular-nums">{fmt(historico[0].dados.receitaTotal)}</span>
            </CardContent>
          </Card>
          <Card className="border-red-200 dark:border-red-800">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <TrendingDown className="w-5 h-5 text-destructive" />
              <span className="text-xs text-muted-foreground">Despesas</span>
              <span className="font-bold text-destructive tabular-nums">{fmt(historico[0].dados.despesas)}</span>
            </CardContent>
          </Card>
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">Lucro Operacional</span>
              <span className="font-bold text-blue-600 tabular-nums">{fmt(historico[0].dados.lucroOperacional)}</span>
            </CardContent>
          </Card>
          <Card className={historico[0].dados.lucroLiquido >= 0 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <BarChart3 className={`w-5 h-5 ${historico[0].dados.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
              <span className="text-xs text-muted-foreground">Resultado</span>
              <span className={`font-bold tabular-nums ${historico[0].dados.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {fmt(historico[0].dados.lucroLiquido)}
              </span>
            </CardContent>
          </Card>
        </div>
      )}

      {/* History */}
      {historico.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Histórico de resumos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {historico.map(r => (
                <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-sm">{r.periodoLabel}</span>
                    <span className="text-xs text-muted-foreground">
                      Gerado em {new Date(r.dataGeracao).toLocaleDateString('pt-BR')} às {new Date(r.dataGeracao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {statusBadge(r.status)}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.status === 'disponivel' && (
                      <>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => baixarPDF(r)}>
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => baixarCSV(r)}>
                          <Download className="w-3.5 h-3.5" />
                          CSV
                        </Button>
                      </>
                    )}
                    {r.status === 'erro' && (
                      <Button size="sm" variant="outline" onClick={gerarResumo}>
                        Tentar novamente
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive" onClick={() => removerResumo(r.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {historico.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Nenhum resumo gerado ainda.</p>
            <p className="text-xs mt-1">Selecione o ano acima e clique em "Gerar resumo".</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
