import jsPDF from 'jspdf';

export interface DREEmpresa {
  nome: string;
  documento: string; // CNPJ or CPF
}

export interface DRELinha {
  codigo: string;
  nome: string;
  valor: number;
  depth: number;       // indentation level
  isSummary: boolean;  // bold/highlighted
  isTotal: boolean;    // double-line total
}

export interface DREDadosCompletos {
  receitaBruta: number;
  deducoes: number;
  receitaLiquida: number;
  custos: number;
  lucroBruto: number;
  despesasOperacionais: number;
  resultadoOperacional: number;
  receitasFinanceiras: number;
  despesasFinanceiras: number;
  resultadoFinanceiro: number;
  resultadoAntesIR: number;
  irCsll: number;
  lucroLiquido: number;
  linhasDetalhadas: DRELinha[];
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const fmtContabil = (v: number): string => {
  if (v < 0) return `(${fmt(Math.abs(v))})`;
  return fmt(v);
};

export function gerarPDFDRE(
  dados: DREDadosCompletos,
  empresa: DREEmpresa,
  periodoLabel: string,
  modo: 'resumido' | 'detalhado'
) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const marginL = 14;
  const marginR = 14;
  const contentW = pageW - marginL - marginR;
  let y = 16;

  const checkPage = (needed: number) => {
    if (y + needed > 275) {
      doc.addPage();
      y = 16;
      // Repeat thin header
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text('DRE — continuação', marginL, y);
      y += 8;
      doc.setTextColor(0, 0, 0);
    }
  };

  // === HEADER ===
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO', pageW / 2, y, { align: 'center' });
  y += 7;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('(DRE)', pageW / 2, y, { align: 'center' });
  y += 10;

  // Company info
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(empresa.nome || 'Empresa não informada', marginL, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  if (empresa.documento) {
    doc.text(`CNPJ/CPF: ${empresa.documento}`, marginL, y);
    y += 5;
  }
  doc.text(`Período: ${periodoLabel}`, marginL, y);
  y += 5;
  const now = new Date();
  doc.text(
    `Emissão: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
    marginL, y
  );
  y += 3;

  // Separator
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.line(marginL, y, pageW - marginR, y);
  y += 8;

  // === HELPER: print a DRE line ===
  const printLine = (label: string, valor: number, opts?: { bold?: boolean; indent?: number; topLine?: boolean; doubleLine?: boolean; fontSize?: number }) => {
    const { bold = false, indent = 0, topLine = false, doubleLine = false, fontSize = 9 } = opts || {};
    checkPage(doubleLine ? 12 : 8);

    if (topLine) {
      doc.setDrawColor(0);
      doc.setLineWidth(0.3);
      doc.line(marginL, y - 1, pageW - marginR, y - 1);
      y += 1;
    }

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');

    const labelX = marginL + indent;
    doc.text(label, labelX, y);

    const valStr = fmtContabil(valor);
    doc.text(valStr, pageW - marginR, y, { align: 'right' });

    if (doubleLine) {
      y += 2;
      doc.setLineWidth(0.3);
      doc.line(pageW - marginR - 45, y, pageW - marginR, y);
      y += 1;
      doc.line(pageW - marginR - 45, y, pageW - marginR, y);
    }

    y += 6;
  };

  const printSectionTitle = (label: string) => {
    checkPage(10);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(80, 80, 80);
    doc.text(label, marginL, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  };

  // === MODE: column header ===
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text(`Modo: ${modo === 'resumido' ? 'Resumido' : 'Detalhado'}`, pageW - marginR, y, { align: 'right' });
  doc.setTextColor(0, 0, 0);
  y += 4;

  // Column headers
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIÇÃO', marginL, y);
  doc.text('VALOR (R$)', pageW - marginR, y, { align: 'right' });
  y += 2;
  doc.setLineWidth(0.3);
  doc.line(marginL, y, pageW - marginR, y);
  y += 6;

  // === DRE BODY ===

  // 1. RECEITA BRUTA
  printLine('RECEITA BRUTA', dados.receitaBruta, { bold: true, fontSize: 10 });

  if (modo === 'detalhado') {
    const receitaLines = dados.linhasDetalhadas.filter(l => l.codigo.startsWith('1'));
    receitaLines.forEach(l => {
      printLine(`${l.codigo} — ${l.nome}`, l.valor, { indent: l.depth * 8 });
    });
  }

  // 2. DEDUÇÕES
  printLine('(-) Deduções sobre Receita', dados.deducoes, { indent: 4 });

  // 3. RECEITA LÍQUIDA
  printLine('RECEITA LÍQUIDA', dados.receitaLiquida, { bold: true, topLine: true });
  y += 2;

  // 4. CUSTOS
  printLine('(-) Custos (CMV/CSP)', dados.custos, { indent: 4 });

  // 5. LUCRO BRUTO
  printLine('LUCRO BRUTO', dados.lucroBruto, { bold: true, topLine: true, fontSize: 10 });
  y += 2;

  // 6. DESPESAS OPERACIONAIS
  printLine('(-) Despesas Operacionais', dados.despesasOperacionais, { bold: true });

  if (modo === 'detalhado') {
    const despesaLines = dados.linhasDetalhadas.filter(l => l.codigo.startsWith('2'));
    despesaLines.forEach(l => {
      printLine(`${l.codigo} — ${l.nome}`, l.valor < 0 ? l.valor : -l.valor, { indent: l.depth * 8 });
    });
  }
  y += 2;

  // 7. RESULTADO OPERACIONAL
  printLine('RESULTADO OPERACIONAL', dados.resultadoOperacional, { bold: true, topLine: true, fontSize: 10 });
  y += 2;

  // 8. RESULTADO FINANCEIRO
  printSectionTitle('RESULTADO FINANCEIRO');
  printLine('Receitas Financeiras', dados.receitasFinanceiras, { indent: 4 });
  printLine('(-) Despesas Financeiras', dados.despesasFinanceiras, { indent: 4 });
  printLine('Resultado Financeiro', dados.resultadoFinanceiro, { bold: true, topLine: true });
  y += 2;

  // 9. RESULTADO ANTES IR
  printLine('RESULTADO ANTES DO IR/CSLL', dados.resultadoAntesIR, { bold: true, fontSize: 10 });

  // 10. IR/CSLL
  printLine('(-) IR/CSLL', dados.irCsll, { indent: 4 });
  y += 2;

  // 11. LUCRO LÍQUIDO
  printLine('LUCRO LÍQUIDO DO EXERCÍCIO', dados.lucroLiquido, { bold: true, topLine: true, doubleLine: true, fontSize: 11 });

  // Footer
  y += 6;
  checkPage(12);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.line(marginL, y, pageW - marginR, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(130, 130, 130);
  doc.setFont('helvetica', 'italic');
  doc.text('Documento gerado automaticamente para fins gerenciais.', marginL, y);
  y += 4;
  doc.text('Valores expressos em Reais (R$). Valores negativos indicados entre parênteses.', marginL, y);

  return doc;
}

export function gerarCSVDRE(
  dados: DREDadosCompletos,
  empresa: DREEmpresa,
  periodoLabel: string,
  modo: 'resumido' | 'detalhado'
): string {
  const lines: string[] = [
    'DEMONSTRAÇÃO DO RESULTADO DO EXERCÍCIO (DRE)',
    `Empresa: ${empresa.nome}`,
    `CNPJ/CPF: ${empresa.documento}`,
    `Período: ${periodoLabel}`,
    `Emissão: ${new Date().toLocaleDateString('pt-BR')}`,
    `Modo: ${modo === 'resumido' ? 'Resumido' : 'Detalhado'}`,
    '',
    'Descrição,Valor',
    `RECEITA BRUTA,${dados.receitaBruta.toFixed(2)}`,
  ];

  if (modo === 'detalhado') {
    dados.linhasDetalhadas.filter(l => l.codigo.startsWith('1')).forEach(l => {
      lines.push(`"  ${l.codigo} — ${l.nome}",${l.valor.toFixed(2)}`);
    });
  }

  lines.push(
    `"(-) Deduções sobre Receita",${dados.deducoes.toFixed(2)}`,
    `RECEITA LÍQUIDA,${dados.receitaLiquida.toFixed(2)}`,
    `"(-) Custos (CMV/CSP)",${dados.custos.toFixed(2)}`,
    `LUCRO BRUTO,${dados.lucroBruto.toFixed(2)}`,
    `"(-) Despesas Operacionais",${dados.despesasOperacionais.toFixed(2)}`,
  );

  if (modo === 'detalhado') {
    dados.linhasDetalhadas.filter(l => l.codigo.startsWith('2')).forEach(l => {
      lines.push(`"  ${l.codigo} — ${l.nome}",${(-l.valor).toFixed(2)}`);
    });
  }

  lines.push(
    `RESULTADO OPERACIONAL,${dados.resultadoOperacional.toFixed(2)}`,
    `"Receitas Financeiras",${dados.receitasFinanceiras.toFixed(2)}`,
    `"(-) Despesas Financeiras",${dados.despesasFinanceiras.toFixed(2)}`,
    `"Resultado Financeiro",${dados.resultadoFinanceiro.toFixed(2)}`,
    `"RESULTADO ANTES DO IR/CSLL",${dados.resultadoAntesIR.toFixed(2)}`,
    `"(-) IR/CSLL",${dados.irCsll.toFixed(2)}`,
    `"LUCRO LÍQUIDO DO EXERCÍCIO",${dados.lucroLiquido.toFixed(2)}`,
  );

  return '\uFEFF' + lines.join('\n');
}
