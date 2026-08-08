// Processador de arquivo Word/PDF: extrai texto, corrige ortografia,
// formata e salva versao corrigida. Tambem extrai dados (cliente, data)
// do texto pra preencher o pedido.
import mammoth from 'mammoth';
import { Document, Packer, Paragraph, TextRun, AlignmentType, HeadingLevel } from 'docx';
import * as pdfParse from 'pdf-parse';
import fs from 'fs';
import path from 'path';

// ============== DICIONARIO DE CORRECOES PT-BR ==============
// MVP: substituicoes comuns de internet/abreviacoes. Em producao,
// usar NLP/hunspell/ia. Cada chave e uma regex pra evitar falsos positivos.
const CORRECOES = [
  // abreviacoes de internet
  [/\bvc\b/gi, 'você'],
  [/\btb(?:m)?\b/gi, 'também'],
  [/\bpq\b/gi, 'porque'],
  [/\bobg\b/gi, 'obrigado'],
  [/\bblz\b/gi, 'beleza'],
  [/\bflw\b/gi, 'falou'],
  [/\bvlw\b/gi, 'valeu'],
  [/\bkkk+\b/gi, ''],
  [/\bq\s+(?!e\s+)[a-záéíóúâêôãõç]{1,3}\b/gi, (m) => `que ${m.split(' ')[1] || ''}`],
  // acentuacao esquecida
  [/\bnao\b/gi, 'não'],
  [/\bvcs\b/gi, 'vocês'],
  [/\btbm\b/gi, 'também'],
  [/\bta\s+(?=[a-záéíóúâêôãõç])/gi, 'está '],
  [/\bto\s+(?=[a-záéíóúâêôãõç])/gi, 'estou '],
  [/\bja\s+(?=[a-záéíóúâêôãõç])/gi, 'já '],
  [/\bvoce\b/gi, 'você'],
  [/\bprefeitura\s+mun(icipal)?\b/gi, 'Prefeitura Municipal'],
  [/\bMunicipio\s+de\s+([A-ZÁ][a-zá]+)/g, 'Município de $1'],
  [/\b(rua|avenida|av\.?)\s+/gi, (m) => m.toUpperCase()],
];

export function corrigirOrtografia(texto) {
  let out = texto;
  let correcoes = 0;
  for (const [regex, subst] of CORRECOES) {
    out = out.replace(regex, (...args) => {
      const match = args[0];
      const novo = typeof subst === 'function' ? subst(match) : subst;
      if (match.toLowerCase() !== (novo || '').toLowerCase()) correcoes++;
      return novo;
    });
  }
  return { texto: out, correcoes };
}

// ============== EXTRACAO DE DADOS ==============
export function extrairDados(texto) {
  const dados = {};
  // Datas: dd/mm/aaaa, dd/mm/aa, dd de mes de aaaa
  const dataRegex = /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b|\b(\d{1,2}\s+de\s+(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+\d{4})\b/gi;
  const datas = texto.match(dataRegex);
  if (datas) dados.datas = Array.from(new Set(datas));

  // CNPJ: 00.000.000/0000-00
  const cnpjRegex = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g;
  const cnpjs = texto.match(cnpjRegex);
  if (cnpjs) dados.cnpjs = Array.from(new Set(cnpjs));

  // Edital/Processo: 001/2026, 005/2025
  const procRegex = /\b(?:edital|processo|pregão|concorrência|tomada\s+de\s+preço|cotação)\s*(?:n[º°o.]?\s*)?(\d{1,4}\/\d{2,4})/gi;
  const procs = texto.match(procRegex);
  if (procs) dados.processos = Array.from(new Set(procs));

  // Valor: R$ 1.234,56
  const valorRegex = /R\$\s*[\d.]+,\d{2}/g;
  const valores = texto.match(valorRegex);
  if (valores) dados.valores = Array.from(new Set(valores));

  return dados;
}

// ============== EXTRACAO DE TEXTO ==============
export async function extrairTexto(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const r = await mammoth.extractRawText({ path: filePath });
    return r.value;
  }
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const r = await pdfParse(dataBuffer);
    return r.text;
  }
  if (ext === '.txt' || ext === '.odt') {
    return fs.readFileSync(filePath, 'utf8');
  }
  throw new Error(`Formato não suportado: ${ext}`);
}

// ============== FORMATACAO DE .DOCX ==============
// Cria um novo .docx formatado: fonte Arial 12, alinhamento justificado,
// margens 2.5cm, espacamento 1.5. Preserva paragrafos (quebras de linha).
export async function criarDocxFormatado(texto) {
  const paragrafos = texto.split(/\n\s*\n/).filter((p) => p.trim());

  const children = paragrafos.map((p) => {
    const linhas = p.split('\n').filter((l) => l.trim());
    return linhas.map((linha) => new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { line: 360, after: 120 },
      children: [new TextRun({
        text: linha.trim(),
        font: 'Arial',
        size: 24, // 12pt = 24 half-points
      })],
    }));
  }).flat();

  const doc = new Document({
    creator: 'Publi Legal',
    title: 'Documento processado',
    styles: {
      default: {
        document: {
          margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }, // 2.5cm = 1440 twips
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: children.length > 0 ? children : [new Paragraph({ children: [new TextRun('Documento vazio')] })],
    }],
  });

  return await Packer.toBuffer(doc);
}

// ============== PIPELINE COMPLETO ==============
// Extrai texto de um arquivo, corrige, formata e salva versao corrigida.
// Retorna { texto, texto_corrigido, correcoes, dados, arquivo_corrigido_path }
export async function processarArquivo(filePath, outputDir) {
  const texto = await extrairTexto(filePath);
  const { texto: corrigido, correcoes } = corrigirOrtografia(texto);
  const dados = extrairDados(corrigido);

  // Salva versao corrigida (so faz sentido pra .docx)
  let arquivoCorrigidoPath = null;
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.docx') {
    const buffer = await criarDocxFormatado(corrigido);
    const baseName = path.basename(filePath, ext);
    const novoNome = `${baseName}-corrigido-${Date.now()}${ext}`;
    arquivoCorrigidoPath = path.join(outputDir, novoNome);
    fs.writeFileSync(arquivoCorrigidoPath, buffer);
  }

  return {
    texto,
    texto_corrigido: corrigido,
    correcoes,
    dados,
    arquivo_corrigido_path: arquivoCorrigidoPath,
  };
}
