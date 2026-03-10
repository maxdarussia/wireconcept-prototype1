import { useState, useMemo, useCallback } from 'react';
import { useFinance } from '@/contexts/FinanceContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, FileText, Loader2, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, DollarSign, BarChart3, Trash2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { gerarPDFDRE, gerarCSVDRE } from '@/utils/drePdfGenerator';
import type { DREDadosCompletos, DRELinha, DREEmpresa } from '@/utils/drePdfGenerator';
import type { ContaContabil } from '@/types/finance';

interface ResumoGerado {
  id: string;
  periodo: string;
  periodoLabel: string;
  dataGeracao: string;
  status: 'processando' | 'disponivel' | 'erro';
  dados?: DREDadosCompletos;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const HISTORICO_KEY = 'fin_resumo_dre_historico';
const EMPRESA_KEY = 'fin_empresa_dre';

const loadHistorico = (): ResumoGerado[] => {
  try { const v = localStorage.getItem(HISTORICO_KEY); return v ? JSON.parse(v) : []; } catch { return []; }
};
const saveHistorico = (h: ResumoGerado[]) => localStorage.setItem(HISTORICO_KEY, JSON.stringify(h));

const loadEmpresa = (): DREEmpresa => {
  try { const v = localStorage.getItem(EMPRESA_KEY); return v ? JSON.parse(v) : { nome: '', documento: '' }; } catch { return { nome: '', documento: '' }; }
};
const saveEmpresa = (e: DREEmpresa) => localStorage.setItem(EMPRESA_KEY, JSON.stringify(e));

export default function ResumoAnualDRE() {
  const { planoContas, gastos, contas, receitas } = useFinance();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const [periodo, setPeriodo] = useState(`${currentYear}`);
  const [historico, setHistorico] = useState<ResumoGerado[]>(() => loadHistorico());
  const [gerando, setGerando] = useState(false);
  const [modo, setModo] = useState<'resumido' | 'detalhado'>('resumido');
  const [empresa, setEmpresa] = useState<DREEmpresa>(() => loadEmpresa());

  const updateEmpresa = (field: keyof DREEmpresa, value: string) => {
    const updated = { ...empresa, [field]: value };
    setEmpresa(updated);
    saveEmpresa(updated);
  };

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

  const buildLinhasDetalhadas = useCallback((valoresPorConta: Record<string, number>): DRELinha[] => {
    const linhas: DRELinha[] = [];
    const render = (conta: ContaContabil, depth: number) => {
      const children = planoContas.filter(c => c.parentId === conta.id).sort((a, b) => a.codigo.localeCompare(b.codigo));
      const valor = getTotal(conta, valoresPorConta);
      const isRoot = !conta.parentId;
      linhas.push({
        codigo: conta.codigo,
        nome: conta.nome,
        valor,
        depth,
        isSummary: isRoot || children.length > 0,
        isTotal: isRoot,
      });
      children.forEach(child => render(child, depth + 1));
    };
    planoContas
      .filter(c => !c.parentId)
      .sort((a, b) => a.codigo.localeCompare(b.codigo))
      .forEach(c => render(c, 0));
    return linhas;
  }, [planoContas, getTotal]);

  const gerarResumo = useCallback(() => {
    setGerando(true);
    const id = crypto.randomUUID();
    const novoResumo: ResumoGerado = {
      id, periodo, periodoLabel: `01/01/${periodo} a 31/12/${periodo}`,
      dataGeracao: new Date().toISOString(), status: 'processando',
    };
    setHistorico(prev => { const u = [novoResumo, ...prev]; saveHistorico(u); return u; });

    setTimeout(() => {
      try {
        const isInRange = (dateStr: string) => dateStr?.substring(0, 4) === periodo;
        const valoresPorConta: Record<string, number> = {};

        gastos.forEach(g => { if (isInRange(g.data) && g.contaContabil) valoresPorConta[g.contaContabil] = (valoresPorConta[g.contaContabil] || 0) + g.valor; });
        contas.forEach(c => { if (isInRange(c.dataVencimento) && c.contaContabil) valoresPorConta[c.contaContabil] = (valoresPorConta[c.contaContabil] || 0) + c.valor; });
        receitas.forEach(r => { if (isInRange(r.dataPrevista) && r.contaContabil) valoresPorConta[r.contaContabil] = (valoresPorConta[r.contaContabil] || 0) + r.valor; });

        const rootContas = planoContas.filter(c => !c.parentId).sort((a, b) => a.codigo.localeCompare(b.codigo));
        const receitaBruta = rootContas.filter(c => c.tipo === 'receita').reduce((s, c) => s + getTotal(c, valoresPorConta), 0);
        const despesasOperacionais = rootContas.filter(c => c.tipo === 'despesa').reduce((s, c) => s + getTotal(c, valoresPorConta), 0);

        const linhasDetalhadas = buildLinhasDetalhadas(valoresPorConta);

        // Standard DRE structure (deductions/financial/IR are 0 since not tracked yet)
        const dados: DREDadosCompletos = {
          receitaBruta,
          deducoes: 0,
          receitaLiquida: receitaBruta,
          custos: 0,
          lucroBruto: receitaBruta,
          despesasOperacionais,
          resultadoOperacional: receitaBruta - despesasOperacionais,
          receitasFinanceiras: 0,
          despesasFinanceiras: 0,
          resultadoFinanceiro: 0,
          resultadoAntesIR: receitaBruta - despesasOperacionais,
          irCsll: 0,
          lucroLiquido: receitaBruta - despesasOperacionais,
          linhasDetalhadas,
        };

        setHistorico(prev => { const u = prev.map(r => r.id === id ? { ...r, status: 'disponivel' as const, dados } : r); saveHistorico(u); return u; });
        toast({ title: '✅ Resumo pronto!', description: 'Seu DRE está disponível para download.' });
      } catch {
        setHistorico(prev => { const u = prev.map(r => r.id === id ? { ...r, status: 'erro' as const } : r); saveHistorico(u); return u; });
        toast({ title: '❌ Erro ao gerar', description: 'Não foi possível gerar. Tente novamente.', variant: 'destructive' });
      } finally { setGerando(false); }
    }, 1200);
  }, [periodo, gastos, contas, receitas, planoContas, getTotal, buildLinhasDetalhadas, toast]);

  const baixarPDF = useCallback((resumo: ResumoGerado) => {
    if (!resumo.dados) return;
    const doc = gerarPDFDRE(resumo.dados, empresa, resumo.periodoLabel, modo);
    doc.save(`DRE_${resumo.periodo}_${modo}.pdf`);
  }, [empresa, modo]);

  const baixarCSV = useCallback((resumo: ResumoGerado) => {
    if (!resumo.dados) return;
    const csv = gerarCSVDRE(resumo.dados, empresa, resumo.periodoLabel, modo);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `DRE_${resumo.periodo}_${modo}.csv`; a.click();
    URL.revokeObjectURL(url);
  }, [empresa, modo]);

  const removerResumo = useCallback((id: string) => {
    setHistorico(prev => { const u = prev.filter(r => r.id !== id); saveHistorico(u); return u; });
  }, []);

  const statusBadge = (status: ResumoGerado['status']) => {
    switch (status) {
      case 'processando': return <Badge variant="secondary" className="gap-1"><Loader2 className="w-3 h-3 animate-spin" />Em processamento</Badge>;
      case 'disponivel': return <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-700"><CheckCircle2 className="w-3 h-3" />Disponível para download</Badge>;
      case 'erro': return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" />Erro — tente novamente</Badge>;
    }
  };

  const latestDados = historico.length > 0 && historico[0].status === 'disponivel' ? historico[0].dados : null;

  return (
    <div className="page-container">
      <div>
        <h1 className="page-title">Resumo Anual (DRE)</h1>
        <p className="text-muted-foreground text-sm mt-1">Gere e baixe o DRE contábil profissional em poucos cliques.</p>
      </div>

      {/* Company info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Building2 className="w-4 h-4" />Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="empresa-nome" className="text-xs text-muted-foreground">Nome / Razão Social</Label>
              <Input id="empresa-nome" placeholder="Minha Empresa Ltda" value={empresa.nome} onChange={e => updateEmpresa('nome', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="empresa-doc" className="text-xs text-muted-foreground">CNPJ ou CPF</Label>
              <Input id="empresa-doc" placeholder="00.000.000/0001-00" value={empresa.documento} onChange={e => updateEmpresa('documento', e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Generate section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Gerar novo resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Período</Label>
                <Select value={periodo} onValueChange={setPeriodo}>
                  <SelectTrigger className="w-44"><SelectValue placeholder="Selecione o ano" /></SelectTrigger>
                  <SelectContent>{anos.map(a => <SelectItem key={a} value={a}>Ano {a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Nível de detalhe</Label>
                <Tabs value={modo} onValueChange={v => setModo(v as 'resumido' | 'detalhado')}>
                  <TabsList>
                    <TabsTrigger value="resumido">Resumido</TabsTrigger>
                    <TabsTrigger value="detalhado">Detalhado</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              <Button onClick={gerarResumo} disabled={gerando} className="gap-2">
                {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                {gerando ? 'Gerando...' : 'Gerar resumo'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {latestDados && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Receita Bruta</span>
              <span className="font-bold text-emerald-600 tabular-nums">{fmt(latestDados.receitaBruta)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <TrendingDown className="w-5 h-5 text-destructive" />
              <span className="text-xs text-muted-foreground">Despesas</span>
              <span className="font-bold text-destructive tabular-nums">{fmt(latestDados.despesasOperacionais)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-xs text-muted-foreground">Resultado Operacional</span>
              <span className="font-bold text-blue-600 tabular-nums">{fmt(latestDados.resultadoOperacional)}</span>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex flex-col items-center text-center gap-1">
              <BarChart3 className={`w-5 h-5 ${latestDados.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-destructive'}`} />
              <span className="text-xs text-muted-foreground">Lucro Líquido</span>
              <span className={`font-bold tabular-nums ${latestDados.lucroLiquido >= 0 ? 'text-emerald-600' : 'text-destructive'}`}>
                {fmt(latestDados.lucroLiquido)}
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
                          <Download className="w-3.5 h-3.5" />PDF
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => baixarCSV(r)}>
                          <Download className="w-3.5 h-3.5" />CSV
                        </Button>
                      </>
                    )}
                    {r.status === 'erro' && (
                      <Button size="sm" variant="outline" onClick={gerarResumo}>Tentar novamente</Button>
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
            <p className="text-xs mt-1">Preencha os dados acima e clique em "Gerar resumo".</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground">
            💡 O DRE segue a estrutura contábil padrão. Campos como Deduções, Custos (CMV/CSP), Resultado Financeiro e IR/CSLL aparecem como R$ 0,00 quando não há dados cadastrados — mantenha seu plano de contas atualizado para um relatório mais completo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
