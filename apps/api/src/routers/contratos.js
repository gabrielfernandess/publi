import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../db.js';
import { requirePapel } from './_middleware.js';

const router = Router();

function diffDias(fim) {
  const hoje = new Date();
  const f = new Date(fim);
  if (isNaN(f.getTime())) return null;
  return Math.ceil((f - hoje) / (1000 * 60 * 60 * 24));
}

// LISTAR com info de saldo
router.get('/', (req, res) => {
  const { search, status, cliente_id } = req.query;
  let sql = `
    SELECT
      c.*,
      cl.nome AS cliente_nome,
      cl.tipo AS cliente_tipo,
      cl.municipio AS cliente_municipio,
      cl.estado AS cliente_estado,
      COUNT(DISTINCT ci.id) AS total_itens,
      COALESCE(SUM(ci.cm_contratado), 0) AS cm_total_contratado,
      COALESCE(SUM(ci.cm_utilizado), 0) AS cm_total_utilizado,
      COALESCE(SUM(ci.cm_contratado * ci.valor_unitario_venda), 0) AS valor_total_venda,
      COALESCE(SUM(ci.cm_utilizado * ci.valor_unitario_venda), 0) AS valor_utilizado
    FROM contratos c
    INNER JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN contrato_itens ci ON ci.contrato_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (LOWER(cl.nome) LIKE ? OR LOWER(c.numero) LIKE ? OR LOWER(c.objeto) LIKE ?)';
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s);
  }
  if (status) { sql += ' AND c.status = ?'; params.push(status); }
  if (cliente_id) { sql += ' AND c.cliente_id = ?'; params.push(cliente_id); }
  sql += ' GROUP BY c.id ORDER BY c.data_fim ASC, c.id DESC';
  const rows = db.prepare(sql).all(...params).map((r) => ({ ...r, dias_para_vencer: diffDias(r.data_fim) }));
  res.json({ data: rows });
});

// ============== Sprint 4: Alertas (rota estática ANTES de /:id) ==============

// GET /api/contratos/alertas - contratos com saldo baixo ou vigência crítica
router.get('/alertas', (_req, res) => {
  const rows = db.prepare(`
    SELECT c.id, c.numero, c.data_fim, c.status,
      cl.nome AS cliente_nome,
      (SELECT COALESCE(SUM(ci.cm_contratado), 0) FROM contrato_itens ci WHERE ci.contrato_id = c.id) AS cm_total_contratado,
      (SELECT COALESCE(SUM(ci.cm_utilizado), 0) FROM contrato_itens ci WHERE ci.contrato_id = c.id) AS cm_total_utilizado
    FROM contratos c
    INNER JOIN clientes cl ON cl.id = c.cliente_id
    WHERE c.status = 'ativo'
  `).all();
  const out = rows.map((r) => {
    const dias = diffDias(r.data_fim);
    const cmRestante = r.cm_total_contratado - r.cm_total_utilizado;
    const pct = r.cm_total_contratado > 0 ? (r.cm_total_utilizado / r.cm_total_contratado) * 100 : 0;
    return {
      ...r,
      dias_para_vencer: dias,
      cm_restante: cmRestante,
      pct_usado: pct,
      alerta_saldo: cmRestante <= 0 ? 'sem_saldo' : pct >= 80 ? 'saldo_baixo' : null,
      alerta_vigencia: dias !== null && dias < 0 ? 'vencido' : dias !== null && dias <= 30 ? 'vencendo' : null,
    };
  });
  res.json({ data: out });
});

router.get('/:id', (req, res) => {
  const c = db.prepare(`
    SELECT c.*, cl.nome AS cliente_nome, cl.tipo AS cliente_tipo, cl.municipio AS cliente_municipio, cl.estado AS cliente_estado
    FROM contratos c INNER JOIN clientes cl ON cl.id = c.cliente_id WHERE c.id = ?
  `).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrato nao encontrado' });

  const itens = db.prepare(`
    SELECT ci.*, v.nome AS veiculo_nome, v.tipo AS veiculo_tipo
    FROM contrato_itens ci
    INNER JOIN veiculos v ON v.id = ci.veiculo_id
    WHERE ci.contrato_id = ?
    ORDER BY v.tipo, v.nome
  `).all(req.params.id);

  // histórico de pedidos relacionados
  const pedidos = db.prepare(`
    SELECT id, data_solicitacao, categoria, status, descricao
    FROM pedidos WHERE contrato_id = ? ORDER BY data_solicitacao DESC
  `).all(req.params.id);

  res.json({ data: { ...c, dias_para_vencer: diffDias(c.data_fim), itens, pedidos } });
});

// (a rota /alertas foi movida para ANTES de /:id — ver logo apos a rota GET /)

router.post(
  '/',
  requirePapel('admin'),
  [
    body('cliente_id').isInt().withMessage('Cliente obrigatorio'),
    body('data_inicio').isISO8601().withMessage('Data inicio invalida'),
    body('data_fim').isISO8601().withMessage('Data fim invalida'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { cliente_id, numero, objeto, data_inicio, data_fim, modalidade, processo, observacoes, itens } = req.body;
    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({ error: 'Contrato precisa ter ao menos 1 item' });
    }

    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO contratos (cliente_id, numero, objeto, data_inicio, data_fim, modalidade, processo, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(cliente_id, numero || null, objeto || null, data_inicio, data_fim, modalidade || null, processo || null, observacoes || null);

      const itemStmt = db.prepare(`
        INSERT INTO contrato_itens (contrato_id, veiculo_id, descricao, cm_contratado, valor_unitario_venda, valor_unitario_custo)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const it of itens) {
        itemStmt.run(info.lastInsertRowid, it.veiculo_id, it.descricao, Number(it.cm_contratado) || 0, Number(it.valor_unitario_venda) || 0, Number(it.valor_unitario_custo) || 0);
      }
      return info.lastInsertRowid;
    });

    const id = tx();
    res.status(201).json({ data: db.prepare('SELECT * FROM contratos WHERE id = ?').get(id) });
  }
);

router.put('/:id',
  requirePapel('admin'),
  [
    body('data_inicio').optional().isISO8601(),
    body('data_fim').optional().isISO8601(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const exists = db.prepare('SELECT id FROM contratos WHERE id = ?').get(req.params.id);
    if (!exists) return res.status(404).json({ error: 'Contrato nao encontrado' });

    const fields = ['cliente_id', 'numero', 'objeto', 'data_inicio', 'data_fim', 'modalidade', 'processo', 'status', 'observacoes'];
    const sets = [];
    const params = [];
    for (const f of fields) {
      if (req.body[f] !== undefined) { sets.push(`${f} = ?`); params.push(req.body[f]); }
    }
    if (sets.length > 0) {
      params.push(req.params.id);
      db.prepare(`UPDATE contratos SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }

    // se veio itens, recriar
    if (Array.isArray(req.body.itens) && req.body.itens.length > 0) {
      const tx = db.transaction(() => {
        db.prepare('DELETE FROM contrato_itens WHERE contrato_id = ?').run(req.params.id);
        const itemStmt = db.prepare(`
          INSERT INTO contrato_itens (contrato_id, veiculo_id, descricao, cm_contratado, valor_unitario_venda, valor_unitario_custo)
          VALUES (?, ?, ?, ?, ?, ?)
        `);
        for (const it of req.body.itens) {
          itemStmt.run(req.params.id, it.veiculo_id, it.descricao, Number(it.cm_contratado) || 0, Number(it.valor_unitario_venda) || 0, Number(it.valor_unitario_custo) || 0);
        }
      });
      tx();
    }

    res.json({ data: db.prepare('SELECT * FROM contratos WHERE id = ?').get(req.params.id) });
  }
);

router.delete('/:id', requirePapel('admin'), (req, res) => {
  const exists = db.prepare('SELECT id FROM contratos WHERE id = ?').get(req.params.id);
  if (!exists) return res.status(404).json({ error: 'Contrato nao encontrado' });
  db.prepare('UPDATE contratos SET status = ? WHERE id = ?').run('encerrado', req.params.id);
  res.json({ ok: true });
});

// ============== Sprint 4: Saldo contratual ==============

// GET /api/contratos/:id/saldo - saldo detalhado por item + totais
router.get('/:id/saldo', (req, res) => {
  const c = db.prepare(`
    SELECT c.id, c.numero, c.data_inicio, c.data_fim, c.status, c.cliente_id,
      cl.nome AS cliente_nome, cl.municipio AS cliente_municipio, cl.estado AS cliente_estado
    FROM contratos c INNER JOIN clientes cl ON cl.id = c.cliente_id
    WHERE c.id = ?
  `).get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contrato nao encontrado' });

  const itens = db.prepare(`
    SELECT ci.id, ci.descricao, ci.cm_contratado, ci.cm_utilizado,
      (ci.cm_contratado - ci.cm_utilizado) AS cm_restante,
      ci.valor_unitario_venda,
      v.nome AS veiculo_nome, v.tipo AS veiculo_tipo
    FROM contrato_itens ci
    INNER JOIN veiculos v ON v.id = ci.veiculo_id
    WHERE ci.contrato_id = ?
    ORDER BY v.tipo, v.nome
  `).all(req.params.id);

  const totais = itens.reduce((acc, it) => {
    acc.cm_contratado += Number(it.cm_contratado || 0);
    acc.cm_utilizado += Number(it.cm_utilizado || 0);
    acc.cm_restante += Number(it.cm_restante || 0);
    acc.valor_contratado += Number(it.cm_contratado || 0) * Number(it.valor_unitario_venda || 0);
    acc.valor_utilizado += Number(it.cm_utilizado || 0) * Number(it.valor_unitario_venda || 0);
    return acc;
  }, { cm_contratado: 0, cm_utilizado: 0, cm_restante: 0, valor_contratado: 0, valor_utilizado: 0 });
  totais.valor_restante = totais.valor_contratado - totais.valor_utilizado;
  totais.pct_usado = totais.cm_contratado > 0 ? (totais.cm_utilizado / totais.cm_contratado) * 100 : 0;

  // ultimas NFs que compuseram o utilizado
  const nfs = db.prepare(`
    SELECT nf.id, nf.numero, nf.data_emissao, nf.valor, nf.status,
      pi.cm_publicado, pi.id AS pedido_item_id
    FROM notas_fiscais nf
    INNER JOIN pedido_itens pi ON pi.pedido_id = nf.pedido_id
    WHERE nf.pedido_id IN (SELECT id FROM pedidos WHERE contrato_id = ?)
    ORDER BY nf.data_emissao DESC
  `).all(req.params.id);

  res.json({
    data: {
      contrato: c,
      dias_para_vencer: diffDias(c.data_fim),
      itens,
      totais,
      nfs_recentes: nfs.slice(0, 10),
      alertas: {
        saldo_baixo: totais.cm_restante > 0 && totais.pct_usado >= 80,
        sem_saldo: totais.cm_restante <= 0,
        vencendo: diffDias(c.data_fim) !== null && diffDias(c.data_fim) <= 30 && diffDias(c.data_fim) >= 0,
        vencido: diffDias(c.data_fim) !== null && diffDias(c.data_fim) < 0,
      },
    },
  });
});

export default router;
