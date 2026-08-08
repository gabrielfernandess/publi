import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db, { STATUS_PEDIDO, STATUS_BY_ID } from '../db.js';
import { canMove } from './_middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const router = Router();

// ============== UPLOAD DE ARQUIVOS ==============
// Aceita .doc, .docx, .pdf, .odt, .txt, .png, .jpg, .jpeg (até 10MB)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const pedidoDir = path.join(uploadsDir, 'pedidos');
    fs.mkdirSync(pedidoDir, { recursive: true });
    cb(null, pedidoDir);
  },
  filename: (_req, file, cb) => {
    // sanitiza nome e adiciona timestamp + random
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    cb(null, `${ts}-${rand}-${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /\.(doc|docx|pdf|odt|txt|png|jpg|jpeg)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Tipo de arquivo não permitido (.doc/.docx/.pdf/.odt/.txt/.png/.jpg)'));
    cb(null, true);
  },
});

// helper: carrega pedido completo
function loadPedido(id) {
  const p = db.prepare(`
    SELECT
      p.*,
      c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio, c.estado AS cliente_estado,
      ct.numero AS contrato_numero, ct.id AS contrato_id
    FROM pedidos p
    INNER JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN contratos ct ON ct.id = p.contrato_id
    WHERE p.id = ?
  `).get(id);
  if (!p) return null;
  p.status_info = STATUS_BY_ID[p.status] || null;
  p.itens = db.prepare(`
    SELECT pi.*, ci.descricao AS item_descricao, ci.valor_unitario_venda, v.nome AS veiculo_nome, v.tipo AS veiculo_tipo
    FROM pedido_itens pi
    INNER JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
    INNER JOIN veiculos v ON v.id = ci.veiculo_id
    WHERE pi.pedido_id = ?
  `).all(id);
  p.arquivos_count = db.prepare('SELECT COUNT(*) AS n FROM pedido_arquivos WHERE pedido_id = ?').get(id).n;
  return p;
}

// kanban: retorna todos os pedidos agrupados por status
router.get('/kanban', (_req, res) => {
  const pedidos = db.prepare(`
    SELECT
      p.id, p.status, p.categoria, p.descricao, p.data_solicitacao, p.data_desejada_publicacao, p.created_at, p.updated_at,
      c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio, c.estado AS cliente_estado
    FROM pedidos p
    INNER JOIN clientes c ON c.id = p.cliente_id
    ORDER BY p.updated_at DESC
  `).all();

  const grupos = STATUS_PEDIDO.map((s) => ({
    ...s,
    pedidos: pedidos.filter((p) => p.status === s.id),
  }));
  res.json({ data: { colunas: grupos, total: pedidos.length } });
});

// LISTAR (com filtros)
router.get('/', (req, res) => {
  const { search, status, cliente_id, contrato_id, categoria } = req.query;
  let sql = `
    SELECT
      p.id, p.status, p.categoria, p.descricao, p.data_solicitacao, p.data_desejada_publicacao, p.created_at, p.updated_at,
      c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio
    FROM pedidos p
    INNER JOIN clientes c ON c.id = p.cliente_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (LOWER(c.nome) LIKE ? OR LOWER(p.descricao) LIKE ? OR LOWER(p.categoria) LIKE ?)';
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  if (status) { sql += ' AND p.status = ?'; params.push(status); }
  if (cliente_id) { sql += ' AND p.cliente_id = ?'; params.push(cliente_id); }
  if (contrato_id) { sql += ' AND p.contrato_id = ?'; params.push(contrato_id); }
  if (categoria) { sql += ' AND p.categoria = ?'; params.push(categoria); }
  sql += ' ORDER BY p.updated_at DESC LIMIT 200';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.get('/:id', (req, res) => {
  const p = loadPedido(req.params.id);
  if (!p) return res.status(404).json({ error: 'Pedido nao encontrado' });
  res.json({ data: p });
});

// CRIAR
router.post(
  '/',
  [
    body('cliente_id').isInt().withMessage('Cliente obrigatorio'),
    body('categoria').isLength({ min: 2 }).withMessage('Categoria obrigatoria'),
    body('data_solicitacao').isISO8601().withMessage('Data solicitacao invalida'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { cliente_id, contrato_id, data_solicitacao, data_desejada_publicacao, categoria, descricao, arquivo_recebido, responsavel_id, itens } = req.body;
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Pedido precisa ter ao menos 1 item' });
    }

    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO pedidos (cliente_id, contrato_id, data_solicitacao, data_desejada_publicacao, categoria, descricao, arquivo_recebido, responsavel_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(cliente_id, contrato_id || null, data_solicitacao, data_desejada_publicacao || null, categoria, descricao || null, arquivo_recebido || null, responsavel_id || null);

      const itemStmt = db.prepare(`
        INSERT INTO pedido_itens (pedido_id, contrato_item_id, cm_publicado)
        VALUES (?, ?, ?)
      `);
      for (const it of itens) {
        itemStmt.run(info.lastInsertRowid, it.contrato_item_id, Number(it.cm_publicado) || 0);
      }
      return info.lastInsertRowid;
    });

    const id = tx();
    res.status(201).json({ data: loadPedido(id) });
  }
);

// MOVER NO KANBAN (atualizar status) — com RBAC
router.patch('/:id/status',
  [
    body('status').isIn(STATUS_PEDIDO.map((s) => s.id)).withMessage('Status invalido'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const exists = db.prepare('SELECT id, status FROM pedidos WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });

    if (!canMove(req.user.papel, exists.status, req.body.status)) {
      return res.status(403).json({
        error: `Seu papel (${req.user.papel}) nao pode mover pedidos de "${exists.status}" para "${req.body.status}".`,
      });
    }

    db.prepare("UPDATE pedidos SET status = ?, updated_at = datetime('now') WHERE id = ?").run(req.body.status, req.params.id);
    res.json({ data: loadPedido(req.params.id) });
  }
);

// ATUALIZAR (campos basicos)
router.put('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });

  const fields = ['data_solicitacao', 'data_desejada_publicacao', 'categoria', 'descricao', 'arquivo_recebido', 'responsavel_id'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE pedidos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }
  res.json({ data: loadPedido(req.params.id) });
});

router.delete('/:id', (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });
  db.prepare('DELETE FROM pedidos WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ============== Sprint 4: Etapas, boletos, histórico ==============

// helper: loga evento no historico
function logEvento(pedidoId, userId, evento, statusAntigo, statusNovo, detalhes) {
  db.prepare(`
    INSERT INTO pedido_historico (pedido_id, user_id, evento, status_anterior, status_novo, detalhes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(pedidoId, userId || null, evento, statusAntigo || null, statusNovo || null, detalhes || null);
}

// GET /api/pedidos/:id/historico
router.get('/:id/historico', (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });
  const rows = db.prepare(`
    SELECT h.*, u.nome AS user_nome
    FROM pedido_historico h
    LEFT JOIN users u ON u.id = h.user_id
    WHERE h.pedido_id = ?
    ORDER BY h.created_at DESC
  `).all(req.params.id);
  res.json({ data: rows });
});

// PATCH /api/pedidos/:id/etapa/:etapa - atualiza campos especificos da etapa
router.patch('/:id/etapa/:etapa', (req, res) => {
  const { id, etapa } = req.params;
  const exists = db.prepare('SELECT * FROM pedidos WHERE id = ?').get(id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });
  if (!STATUS_BY_ID[etapa]) return res.status(400).json({ error: 'Etapa invalida' });

  // Campos permitidos por etapa (whitelist)
  const CAMPOS = {
    solicitada: ['descricao', 'categoria_publicacao', 'data_desejada_publicacao',
      'canal_recebimento', 'veiculos_solicitados', 'veiculo_unico', 'arquivo_word_path', 'arquivo_word_recebido_em',
      'cliente_contato', 'cliente_contato_nome', 'cliente_contato_telefone', 'cliente_contato_email'],
    em_preparacao: ['observacoes_internas', 'observacoes_preparacao', 'pasta_cliente_path',
      'formatado_dou', 'formatado_doe', 'formatado_jornal', 'revisao_ortografica'],
    aguardando_envio: ['observacoes_internas', 'previsao_envio', 'janela_envio'],
    enviada: [], // protocolos vao no pedido_itens
    cust_pgtos: [], // boletos em /boletos
    aguardando_publicacao: ['previsao_publicacao'],
    publicacao_recebida: ['data_publicacao_recebida', 'data_download_pdf'],
    cliente_atendido: ['data_envio_pdf_cliente', 'confirmacao_cliente_em'],
    aprovacao_faturamento: ['cm_faturado'],
    aguardando_nf: [],
    nf_emitida: [],
    aguardando_pagamento: [],
    recebido: [],
  };
  const allowed = CAMPOS[etapa] || [];
  const sets = [];
  const params = [];
  for (const f of allowed) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
  }
  // aprovado_por_id pode vir no body do admin
  if (etapa === 'aprovacao_faturamento' && req.user.papel === 'admin') {
    if (req.body.aprovar === true) {
      sets.push('data_aprovacao_faturamento = datetime(\'now\')');
      sets.push('aprovado_por_id = ?');
      params.push(req.user.id);
    }
  }
  if (sets.length > 0) {
    sets.push("updated_at = datetime('now')");
    params.push(id);
    db.prepare(`UPDATE pedidos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }
  // loga evento
  logEvento(id, req.user.id, `etapa_${etapa}`, exists.status, exists.status, JSON.stringify(req.body));
  res.json({ data: loadPedido(id) });
});

// GET /api/pedidos/:id/boletos
router.get('/:id/boletos', (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });
  const rows = db.prepare('SELECT * FROM pedido_boletos WHERE pedido_id = ? ORDER BY id').all(req.params.id);
  res.json({ data: rows });
});

// ============== PROCESSAMENTO DE ARQUIVO ==============
import { processarArquivo } from '../processador.js';
const uploadsPedidosDir = path.resolve(__dirname, '../../uploads/pedidos');

// POST /api/pedidos/:id/processar - pega o arquivo importado, corrige e formata
router.post('/:id/processar', async (req, res) => {
  const exists = db.prepare('SELECT id, status FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });

  // pega o último arquivo importado do pedido
  const arq = db.prepare(`
    SELECT * FROM pedido_arquivos WHERE pedido_id = ?
    ORDER BY uploaded_em DESC LIMIT 1
  `).get(req.params.id);
  if (!arq) return res.status(400).json({ error: 'Nenhum arquivo importado. Faca upload primeiro.' });

  const filePath = path.join(uploadsPedidosDir, arq.nome_arquivo);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Arquivo fisico nao encontrado. Faca upload novamente.' });
  }

  try {
    const resultado = await processarArquivo(filePath, uploadsPedidosDir);

    // Salva preview (amostra do antes/depois)
    const preview = {
      antes: resultado.texto.slice(0, 500),
      depois: resultado.texto_corrigido.slice(0, 500),
      dados_extraidos: resultado.dados,
      arquivo_original: arq.nome_original,
    };

    // Atualiza pedido com metadados de processamento
    db.prepare(`
      UPDATE pedidos SET
        processado_em = datetime('now'),
        qtd_correcoes = ?,
        preview_revisao = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(resultado.correcoes, JSON.stringify(preview), req.params.id);

    // Loga o evento
    logEvento(req.params.id, req.user.id, 'arquivo_processado', null, null,
      `Arquivo processado: ${resultado.correcoes} correcoes, ${JSON.stringify(resultado.dados).length} chars de dados extraidos`);

    res.json({
      data: {
        correcoes: resultado.correcoes,
        dados_extraidos: resultado.dados,
        preview,
        arquivo_corrigido: resultado.arquivo_corrigido_path ? path.basename(resultado.arquivo_corrigido_path) : null,
      },
    });
  } catch (err) {
    console.error('Erro ao processar arquivo:', err);
    res.status(500).json({ error: (err && err.message) || 'Erro ao processar arquivo' });
  }
});

// GET /api/pedidos/:id/arquivo-corrigido/:arqid/download - download do arquivo corrigido
router.get('/:id/arquivo-corrigido/:arqid/download', (req, res) => {
  const arq = db.prepare('SELECT * FROM pedido_arquivos WHERE id = ? AND pedido_id = ?').get(req.params.arqid, req.params.id);
  if (!arq) return res.status(404).json({ error: 'Arquivo nao encontrado' });
  // procura o corrigido pelo nome original
  const baseName = path.basename(arq.nome_arquivo, path.extname(arq.nome_arquivo));
  const files = fs.readdirSync(uploadsPedidosDir);
  const corrigido = files.find((f) => f.startsWith(baseName + '-corrigido-'));
  if (!corrigido) return res.status(404).json({ error: 'Arquivo corrigido nao encontrado. Processe o arquivo primeiro.' });
  const filePath = path.join(uploadsPedidosDir, corrigido);
  res.download(filePath, corrigido);
});

// POST /api/pedidos/:id/boletos
router.post('/:id/boletos', (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });
  const { veiculo_tipo, valor, data_vencimento, data_pagamento, arquivo_path, observacoes } = req.body;
  if (!veiculo_tipo || !['dou','doe','jornal'].includes(veiculo_tipo)) {
    return res.status(400).json({ error: 'veiculo_tipo invalido (dou/doe/jornal)' });
  }
  const r = db.prepare(`
    INSERT INTO pedido_boletos (pedido_id, veiculo_tipo, valor, data_vencimento, data_pagamento, arquivo_path, observacoes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, veiculo_tipo, Number(valor) || 0, data_vencimento || null, data_pagamento || null, arquivo_path || null, observacoes || null);
  logEvento(req.params.id, req.user.id, 'boleto_criado', null, null, `Boleto ${veiculo_tipo} R$ ${valor}`);
  res.status(201).json({ data: db.prepare('SELECT * FROM pedido_boletos WHERE id = ?').get(r.lastInsertRowid) });
});

// PATCH /api/pedidos/:id/boletos/:bid
router.patch('/:id/boletos/:bid', (req, res) => {
  const r = db.prepare('SELECT * FROM pedido_boletos WHERE id = ? AND pedido_id = ?').get(req.params.bid, req.params.id);
  if (!r) return res.status(404).json({ error: 'Boleto nao encontrado' });
  const fields = ['veiculo_tipo', 'valor', 'data_vencimento', 'data_pagamento', 'arquivo_path', 'observacoes'];
  const sets = [];
  const params = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
  }
  if (sets.length > 0) {
    params.push(req.params.bid);
    db.prepare(`UPDATE pedido_boletos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  }
  logEvento(req.params.id, req.user.id, 'boleto_atualizado', null, null, JSON.stringify(req.body));
  res.json({ data: db.prepare('SELECT * FROM pedido_boletos WHERE id = ?').get(req.params.bid) });
});

// DELETE /api/pedidos/:id/boletos/:bid
router.delete('/:id/boletos/:bid', (req, res) => {
  const r = db.prepare('SELECT * FROM pedido_boletos WHERE id = ? AND pedido_id = ?').get(req.params.bid, req.params.id);
  if (!r) return res.status(404).json({ error: 'Boleto nao encontrado' });
  db.prepare('DELETE FROM pedido_boletos WHERE id = ?').run(req.params.bid);
  logEvento(req.params.id, req.user.id, 'boleto_removido', null, null, `Boleto ${r.veiculo_tipo}`);
  res.json({ ok: true });
});

// ============== ARQUIVOS DO PEDIDO ==============

// POST /api/pedidos/:id/arquivos - upload (multipart)
router.post('/:id/arquivos', upload.single('file'), (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: 'Pedido nao encontrado' });
  }
  if (!req.file) return res.status(400).json({ error: 'Arquivo nao enviado' });
  const r = db.prepare(`
    INSERT INTO pedido_arquivos (pedido_id, user_id, nome_original, nome_arquivo, mimetype, tamanho, categoria)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, req.user.id, req.file.originalname, req.file.filename, req.file.mimetype, req.file.size, req.body.categoria || 'documento');
  logEvento(req.params.id, req.user.id, 'arquivo_upload', null, null, `Arquivo: ${req.file.originalname}`);
  res.status(201).json({
    data: {
      id: r.lastInsertRowid,
      nome_original: req.file.originalname,
      nome_arquivo: req.file.filename,
      mimetype: req.file.mimetype,
      tamanho: req.file.size,
      url: `/uploads/pedidos/${req.file.filename}`,
      uploaded_em: new Date().toISOString(),
    },
  });
});

// GET /api/pedidos/:id/arquivos - lista
router.get('/:id/arquivos', (req, res) => {
  const exists = db.prepare('SELECT id FROM pedidos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Pedido nao encontrado' });
  const rows = db.prepare(`
    SELECT a.id, a.nome_original, a.nome_arquivo, a.mimetype, a.tamanho, a.categoria, a.uploaded_em, u.nome AS user_nome
    FROM pedido_arquivos a
    LEFT JOIN users u ON u.id = a.user_id
    WHERE a.pedido_id = ?
    ORDER BY a.uploaded_em DESC
  `).all(req.params.id);
  const out = rows.map((r) => ({ ...r, url: `/uploads/pedidos/${r.nome_arquivo}` }));
  res.json({ data: out });
});

// GET /api/pedidos/:id/arquivos/:arqid - download
router.get('/:id/arquivos/:arqid/download', (req, res) => {
  const arq = db.prepare('SELECT * FROM pedido_arquivos WHERE id = ? AND pedido_id = ?').get(req.params.arqid, req.params.id);
  if (!arq) return res.status(404).json({ error: 'Arquivo nao encontrado' });
  const filePath = path.join(uploadsDir, 'pedidos', arq.nome_arquivo);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo fisico nao encontrado' });
  res.download(filePath, arq.nome_original);
});

// DELETE /api/pedidos/:id/arquivos/:arqid
router.delete('/:id/arquivos/:arqid', (req, res) => {
  const arq = db.prepare('SELECT * FROM pedido_arquivos WHERE id = ? AND pedido_id = ?').get(req.params.arqid, req.params.id);
  if (!arq) return res.status(404).json({ error: 'Arquivo nao encontrado' });
  const filePath = path.join(uploadsDir, 'pedidos', arq.nome_arquivo);
  if (fs.existsSync(filePath)) fs.unlink(filePath, () => {});
  db.prepare('DELETE FROM pedido_arquivos WHERE id = ?').run(arq.id);
  logEvento(req.params.id, req.user.id, 'arquivo_removido', null, null, `Arquivo: ${arq.nome_original}`);
  res.json({ ok: true });
});

export default router;
