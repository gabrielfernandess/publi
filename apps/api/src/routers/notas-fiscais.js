import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../db.js';
import { requirePapel } from './_middleware.js';

const router = Router();

// =================== HELPERS ===================
function loadNF(id) {
  const nf = db.prepare(`
    SELECT nf.*, c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio, c.estado AS cliente_estado,
           ct.id AS contrato_id, ct.numero AS contrato_numero
    FROM notas_fiscais nf
    INNER JOIN clientes c ON c.id = nf.cliente_id
    LEFT JOIN pedidos p ON p.id = nf.pedido_id
    LEFT JOIN contratos ct ON ct.id = p.contrato_id
    WHERE nf.id = ?
  `).get(id);
  if (!nf) return null;
  return nf;
}

// Baixa automática: soma os cm_publicado do pedido nos contrato_itens
function baixarSaldoPorNF(pedidoId) {
  if (!pedidoId) return;
  const itens = db.prepare(`
    SELECT pi.contrato_item_id, pi.cm_publicado, ci.cm_contratado, ci.cm_utilizado
    FROM pedido_itens pi
    INNER JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
    WHERE pi.pedido_id = ?
  `).all(pedidoId);
  const upd = db.prepare('UPDATE contrato_itens SET cm_utilizado = cm_utilizado + ? WHERE id = ?');
  for (const it of itens) {
    upd.run(it.cm_publicado, it.contrato_item_id);
  }
}

// Estorna baixa (quando cancela NF)
function estornarSaldoPorNF(pedidoId) {
  if (!pedidoId) return;
  const itens = db.prepare(`
    SELECT pi.contrato_item_id, pi.cm_publicado
    FROM pedido_itens pi
    WHERE pi.pedido_id = ?
  `).all(pedidoId);
  const upd = db.prepare('UPDATE contrato_itens SET cm_utilizado = MAX(0, cm_utilizado - ?) WHERE id = ?');
  for (const it of itens) {
    upd.run(it.cm_publicado, it.contrato_item_id);
  }
}

// KPIs - visao executiva do caixa/faturamento
router.get('/kpis', (req, res) => {
  const nfEmitida = db.prepare(`SELECT COALESCE(SUM(valor), 0) AS v, COUNT(*) AS c FROM notas_fiscais WHERE status = 'emitida'`).get();
  const abertas = db.prepare(`SELECT COALESCE(SUM(valor), 0) AS v, COUNT(*) AS c FROM notas_fiscais WHERE status IN ('emitida', 'enviada')`).get();
  const atrasadas = db.prepare(`SELECT COALESCE(SUM(valor), 0) AS v, COUNT(*) AS c FROM notas_fiscais WHERE status IN ('emitida', 'enviada') AND julianday('now') - julianday(data_emissao) > 60`).get();
  const inicioMes = new Date();
  inicioMes.setDate(1);
  const inicioMesISO = inicioMes.toISOString().slice(0, 10);
  const recebidasMes = db.prepare(`SELECT COALESCE(SUM(valor), 0) AS v, COUNT(*) AS c FROM notas_fiscais WHERE status = 'paga' AND data_pagamento >= ?`).get(inicioMesISO);
  const emAprovacao = db.prepare(`SELECT COUNT(*) AS c FROM pedidos WHERE status = 'aprovacao_faturamento'`).get();

  res.json({
    data: {
      em_aprovacao:    { count: emAprovacao.c,  valor: 0 },
      nf_emitidas:     { count: nfEmitida.c,     valor: nfEmitida.v },
      a_receber:       { count: abertas.c,       valor: abertas.v },
      em_atraso:       { count: atrasadas.c,     valor: atrasadas.v },
      recebidas_mes:   { count: recebidasMes.c,  valor: recebidasMes.v },
    }
  });
});

// LISTAR
router.get('/', (req, res) => {
  const { search, status, cliente_id, data_inicio, data_fim } = req.query;
  let sql = `
    SELECT
      nf.id, nf.numero, nf.data_emissao, nf.data_pagamento, nf.valor, nf.status, nf.observacoes, nf.created_at,
      c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio, c.estado AS cliente_estado,
      p.id AS pedido_id, p.categoria AS pedido_categoria, p.descricao AS pedido_descricao,
      ct.id AS contrato_id, ct.numero AS contrato_numero
    FROM notas_fiscais nf
    INNER JOIN clientes c ON c.id = nf.cliente_id
    LEFT JOIN pedidos p ON p.id = nf.pedido_id
    LEFT JOIN contratos ct ON ct.id = p.contrato_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (LOWER(nf.numero) LIKE ? OR LOWER(c.nome) LIKE ? OR LOWER(nf.observacoes) LIKE ?)';
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  if (status) { sql += ' AND nf.status = ?'; params.push(status); }
  if (cliente_id) { sql += ' AND nf.cliente_id = ?'; params.push(cliente_id); }
  if (data_inicio) { sql += ' AND nf.data_emissao >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND nf.data_emissao <= ?'; params.push(data_fim); }
  sql += ' ORDER BY nf.data_emissao DESC, nf.id DESC LIMIT 500';
  res.json({ data: db.prepare(sql).all(...params) });
});

router.get('/:id', (req, res) => {
  const nf = loadNF(req.params.id);
  if (!nf) return res.status(404).json({ error: 'Nota fiscal nao encontrada' });
  res.json({ data: nf });
});

// IMPORTAR NF — faturamento/admin podem
router.post(
  '/',
  requirePapel('admin', 'faturamento'),
  [
    body('cliente_id').isInt().withMessage('Cliente obrigatorio'),
    body('numero').isLength({ min: 1 }).withMessage('Numero obrigatorio'),
    body('data_emissao').isISO8601().withMessage('Data emissao invalida'),
    body('valor').isFloat({ min: 0 }).withMessage('Valor obrigatorio'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { cliente_id, pedido_id, numero, data_emissao, valor, observacoes } = req.body;

    // se tem pedido_id, valida e dá baixa no saldo
    if (pedido_id) {
      const pedido = db.prepare('SELECT id, status, cliente_id FROM pedidos WHERE id = ?').get(pedido_id);
      if (!pedido) return res.status(400).json({ error: 'Pedido nao encontrado' });
      if (pedido.cliente_id !== cliente_id) return res.status(400).json({ error: 'Pedido nao pertence ao cliente informado' });
    }

    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO notas_fiscais (pedido_id, cliente_id, numero, data_emissao, valor, observacoes, status)
        VALUES (?, ?, ?, ?, ?, ?, 'emitida')
      `).run(pedido_id || null, cliente_id, numero, data_emissao, valor, observacoes || null);

      // baixa automática do saldo contratual
      if (pedido_id) baixarSaldoPorNF(pedido_id);

      return info.lastInsertRowid;
    });

    const id = tx();
    res.status(201).json({ data: loadNF(id) });
  }
);

// ATUALIZAR status / marcar como paga
router.patch('/:id',
  requirePapel('admin', 'faturamento', 'financeiro'),
  [
    body('status').optional().isIn(['emitida', 'enviada', 'cancelada', 'paga']),
    body('data_pagamento').optional({ values: 'falsy' }).isISO8601(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const nf = loadNF(req.params.id);
    if (!nf) return res.status(404).json({ error: 'Nota fiscal nao encontrada' });

    // RBAC por status
    if (req.body.status) {
      const canDo =
        req.user.papel === 'admin' ||
        (req.body.status === 'paga' && (req.user.papel === 'financeiro' || req.user.papel === 'admin')) ||
        (req.body.status === 'cancelada' && req.user.papel === 'admin') ||
        ((req.body.status === 'enviada' || req.body.status === 'emitida') && ['admin','faturamento'].includes(req.user.papel));
      if (!canDo) return res.status(403).json({ error: `Seu papel nao pode mudar status para "${req.body.status}"` });
    }

    // Se marcando como paga, exige data_pagamento
    if (req.body.status === 'paga' && !req.body.data_pagamento && !nf.data_pagamento) {
      return res.status(400).json({ error: 'Para marcar como paga, informe data_pagamento' });
    }

    // Se cancelando, estorna o saldo
    const tx = db.transaction(() => {
      const fields = [];
      const params = [];
      for (const f of ['numero', 'data_emissao', 'valor', 'status', 'data_pagamento', 'observacoes']) {
        if (req.body[f] !== undefined) { fields.push(`${f} = ?`); params.push(req.body[f]); }
      }
      if (fields.length > 0) {
        params.push(req.params.id);
        db.prepare(`UPDATE notas_fiscais SET ${fields.join(', ')} WHERE id = ?`).run(...params);
      }
      if (req.body.status === 'cancelada' && nf.status !== 'cancelada' && nf.pedido_id) {
        estornarSaldoPorNF(nf.pedido_id);
      }
    });
    tx();

    res.json({ data: loadNF(req.params.id) });
  }
);

// DELETAR (só admin)
router.delete('/:id', requirePapel('admin'), (req, res) => {
  const nf = loadNF(req.params.id);
  if (!nf) return res.status(404).json({ error: 'Nota fiscal nao encontrada' });
  // estorna saldo se tiver pedido vinculado
  if (nf.pedido_id) estornarSaldoPorNF(nf.pedido_id);
  db.prepare('DELETE FROM notas_fiscais WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

export default router;
