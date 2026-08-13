import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import db from '../db.js';
import { requirePapel } from './_middleware.js';

const router = Router();

// =================== HELPERS ===================

// Status do faturamento (Print 1 do cliente) - 5 etapas do stepper
export const FATURAMENTO_STATUS = {
  em_aprovacao:  { step: 1, label: 'Em aprovação',  cor: 'bg-amber-100 text-amber-700' },
  aprovado:      { step: 1, label: 'Aprovado',       cor: 'bg-emerald-100 text-emerald-700' },
  nf_emitida:    { step: 3, label: 'NF emitida',     cor: 'bg-sky-100 text-sky-700' },
  em_cobranca:   { step: 4, label: 'Em cobrança',    cor: 'bg-indigo-100 text-indigo-700' },
  recebido:      { step: 5, label: 'Recebido',       cor: 'bg-emerald-100 text-emerald-700' },
  cancelado:     { step: 0, label: 'Cancelado',      cor: 'bg-red-100 text-red-700' },
};

function loadFaturamento(id) {
  return db.prepare(`
    SELECT f.*,
      c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio, c.estado AS cliente_estado,
      ct.numero AS contrato_numero,
      (SELECT COUNT(*) FROM pedidos p WHERE p.faturamento_id = f.id) AS qtd_publicacoes
    FROM faturamentos f
    INNER JOIN clientes c ON c.id = f.cliente_id
    LEFT JOIN contratos ct ON ct.id = f.contrato_id
    WHERE f.id = ?
  `).get(id);
}

// Retorna o agregado de cm + valor por veículo do faturamento
function getFaturamentoPorVeiculo(faturamentoId) {
  return db.prepare(`
    SELECT
      v.tipo AS veiculo_tipo,
      v.nome AS veiculo_nome,
      COALESCE(SUM(pi.cm_publicado), 0) AS total_cm,
      COALESCE(SUM(pi.cm_publicado * ci.valor_unitario_venda), 0) AS total_valor
    FROM pedido_itens pi
    INNER JOIN pedidos p ON p.id = pi.pedido_id
    INNER JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
    INNER JOIN veiculos v ON v.id = ci.veiculo_id
    WHERE p.faturamento_id = ?
    GROUP BY v.tipo
    ORDER BY v.tipo
  `).all(faturamentoId);
}

// Retorna as publicações (pedidos) inclusas no faturamento
function getPublicacoes(faturamentoId) {
  return db.prepare(`
    SELECT
      p.id AS pedido_id,
      p.data_solicitacao,
      p.data_desejada_publicacao,
      p.categoria,
      p.descricao,
      p.status,
      COALESCE(SUM(pi.cm_publicado), 0) AS total_cm,
      u.nome AS responsavel_nome
    FROM pedidos p
    LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
    LEFT JOIN users u ON u.id = p.responsavel_id
    WHERE p.faturamento_id = ?
    GROUP BY p.id
    ORDER BY COALESCE(p.data_desejada_publicacao, p.data_solicitacao) ASC, p.id ASC
  `).all(faturamentoId);
}

// =================== ROTAS ===================

// 6 KPIs da tela Faturamento (Print 1 do cliente)
router.get('/kpis', (_req, res) => {
  const k = (statusClause) => db.prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(valor_total), 0) AS v FROM faturamentos WHERE ${statusClause}`).get();

  const aFaturar     = k("status = 'em_aprovacao'");
  const emAprovacao  = k("status = 'em_aprovacao'"); // mesmo bucket por enquanto (ver Sprint 13+)
  const nfEmitidas   = k("status IN ('nf_emitida','em_cobranca','recebido')");
  const aReceber     = k("status IN ('nf_emitida','em_cobranca')");
  const emAtraso     = db.prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(valor_total), 0) AS v FROM faturamentos WHERE status IN ('nf_emitida','em_cobranca') AND date(data_emissao_nf) < date('now','-60 days')`).get();
  const inicioMes = new Date(); inicioMes.setDate(1);
  const recebidosMes = db.prepare(`SELECT COUNT(*) AS c, COALESCE(SUM(valor_total), 0) AS v FROM faturamentos WHERE status = 'recebido' AND date(data_pagamento) >= date(?)`).get(inicioMes.toISOString().slice(0, 10));

  res.json({ data: {
    a_faturar:      { count: aFaturar.c,    valor: aFaturar.v },
    em_aprovacao:   { count: emAprovacao.c, valor: emAprovacao.v },
    nf_emitidas:    { count: nfEmitidas.c,  valor: nfEmitidas.v },
    a_receber:      { count: aReceber.c,    valor: aReceber.v },
    em_atraso:      { count: emAtraso.c,    valor: emAtraso.v },
    recebidas_mes:  { count: recebidosMes.c, valor: recebidosMes.v },
  }});
});

// LISTAR com filtros (cliente, contrato, veículo, status, período, busca)
router.get('/', (req, res) => {
  const { search, status, cliente_id, contrato_id, veiculo, data_inicio, data_fim } = req.query;
  let sql = `
    SELECT
      f.*,
      c.nome AS cliente_nome, c.tipo AS cliente_tipo, c.municipio AS cliente_municipio, c.estado AS cliente_estado,
      ct.numero AS contrato_numero,
      (SELECT COUNT(*) FROM pedidos p WHERE p.faturamento_id = f.id) AS qtd_publicacoes
    FROM faturamentos f
    INNER JOIN clientes c ON c.id = f.cliente_id
    LEFT JOIN contratos ct ON ct.id = f.contrato_id
    WHERE 1=1
  `;
  const params = [];
  if (search) {
    sql += ' AND (LOWER(c.nome) LIKE ? OR LOWER(c.municipio) LIKE ? OR LOWER(ct.numero) LIKE ? OR LOWER(f.numero_nf) LIKE ? OR LOWER(f.observacoes) LIKE ?)';
    const s = `%${search.toLowerCase()}%`;
    params.push(s, s, s, s, s);
  }
  if (status) { sql += ' AND f.status = ?'; params.push(status); }
  if (cliente_id) { sql += ' AND f.cliente_id = ?'; params.push(cliente_id); }
  if (contrato_id) { sql += ' AND f.contrato_id = ?'; params.push(contrato_id); }
  if (data_inicio) { sql += ' AND f.periodo_fim >= ?'; params.push(data_inicio); }
  if (data_fim) { sql += ' AND f.periodo_inicio <= ?'; params.push(data_fim); }
  if (veiculo) {
    sql += ` AND EXISTS (
      SELECT 1 FROM pedido_itens pi
      INNER JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
      INNER JOIN veiculos v ON v.id = ci.veiculo_id
      WHERE pi.pedido_id IN (SELECT id FROM pedidos WHERE faturamento_id = f.id)
        AND v.tipo = ?
    )`;
    params.push(veiculo);
  }
  sql += ' ORDER BY f.periodo_fim DESC, f.id DESC';
  res.json({ data: db.prepare(sql).all(...params) });
});

// DETALHE
router.get('/:id', (req, res) => {
  const f = loadFaturamento(Number(req.params.id));
  if (!f) return res.status(404).json({ error: 'Faturamento nao encontrado' });

  const publicacoes = getPublicacoes(f.id);
  const porVeiculo = getFaturamentoPorVeiculo(f.id);

  // info do contrato pro resumo
  let infoContrato = null;
  if (f.contrato_id) {
    infoContrato = db.prepare(`
      SELECT ci.descricao, ci.cm_contratado, ci.cm_utilizado, ci.valor_unitario_venda,
        v.tipo AS veiculo_tipo, v.nome AS veiculo_nome
      FROM contrato_itens ci
      INNER JOIN veiculos v ON v.id = ci.veiculo_id
      WHERE ci.contrato_id = ?
      ORDER BY v.tipo
    `).all(f.contrato_id);
  }

  // saldo contratual antes e depois do faturamento
  let saldoAnterior = 0, saldoApos = 0;
  if (f.contrato_id) {
    const totais = db.prepare(`SELECT COALESCE(SUM(cm_contratado), 0) AS c, COALESCE(SUM(cm_utilizado), 0) AS u FROM contrato_itens WHERE contrato_id = ?`).get(f.contrato_id);
    saldoAnterior = totais.c - totais.u + f.cm_total; // cm_total eh o que esse fatura baixa
    saldoApos = totais.c - totais.u;
  }

  res.json({
    data: {
      ...f,
      publicacoes,
      por_veiculo: porVeiculo,
      info_contrato: infoContrato,
      saldo_anterior_cm: saldoAnterior,
      saldo_apos_cm: saldoApos,
    },
  });
});

// CRIAR a partir de N pedidos (admin)
router.post(
  '/',
  requirePapel('admin'),
  [
    body('cliente_id').isInt().withMessage('Cliente obrigatorio'),
    body('periodo_inicio').isISO8601().withMessage('Periodo inicio invalido'),
    body('periodo_fim').isISO8601().withMessage('Periodo fim invalido'),
    body('pedido_ids').isArray({ min: 1 }).withMessage('Selecione ao menos 1 pedido'),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { cliente_id, contrato_id, periodo_inicio, periodo_fim, pedido_ids, forma_cobranca, observacoes } = req.body;

    // valida que todos os pedidos são do mesmo cliente e nao estao em outro faturamento
    const placeholders = pedido_ids.map(() => '?').join(',');
    const pedidos = db.prepare(`
      SELECT p.id, p.cliente_id, p.faturamento_id, p.contrato_id,
        COALESCE(SUM(pi.cm_publicado), 0) AS total_cm,
        COALESCE(SUM(pi.cm_publicado * ci.valor_unitario_venda), 0) AS total_valor
      FROM pedidos p
      LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
      LEFT JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
      WHERE p.id IN (${placeholders})
      GROUP BY p.id
    `).all(...pedido_ids);

    if (pedidos.length !== pedido_ids.length) return res.status(400).json({ error: 'Algum pedido nao existe' });
    const wrongCliente = pedidos.filter((p) => p.cliente_id !== Number(cliente_id));
    if (wrongCliente.length) return res.status(400).json({ error: 'Todos os pedidos precisam ser do mesmo cliente' });
    const alreadyFaturado = pedidos.filter((p) => p.faturamento_id);
    if (alreadyFaturado.length) return res.status(400).json({ error: `Pedido(s) ja em outro faturamento: ${alreadyFaturado.map((p) => p.id).join(', ')}` });

    const cmTotal = pedidos.reduce((acc, p) => acc + Number(p.total_cm || 0), 0);
    const valorTotal = pedidos.reduce((acc, p) => acc + Number(p.total_valor || 0), 0);
    // contrato_id inferido se todos os pedidos tem o mesmo
    const contratoIdFinal = contrato_id || pedidos[0].contrato_id || null;

    const tx = db.transaction(() => {
      const info = db.prepare(`
        INSERT INTO faturamentos (cliente_id, contrato_id, periodo_inicio, periodo_fim, valor_total, cm_total, status, forma_cobranca, observacoes)
        VALUES (?, ?, ?, ?, ?, ?, 'em_aprovacao', ?, ?)
      `).run(cliente_id, contratoIdFinal, periodo_inicio, periodo_fim, valorTotal, cmTotal, forma_cobranca || null, observacoes || null);

      const upStmt = db.prepare('UPDATE pedidos SET faturamento_id = ? WHERE id = ?');
      for (const id of pedido_ids) upStmt.run(info.lastInsertRowid, id);

      return info.lastInsertRowid;
    });
    const id = tx();
    res.status(201).json({ data: loadFaturamento(id) });
  }
);

// ATUALIZAR status / observacoes (aprovar, cancelar, marcar pago, etc)
router.patch(
  '/:id',
  requirePapel('admin'),
  [
    body('status').optional().isIn(['em_aprovacao', 'aprovado', 'nf_emitida', 'em_cobranca', 'recebido', 'cancelado']),
    body('data_aprovacao').optional({ values: 'falsy' }).isISO8601(),
    body('data_emissao_nf').optional({ values: 'falsy' }).isISO8601(),
    body('data_pagamento').optional({ values: 'falsy' }).isISO8601(),
    body('numero_nf').optional({ values: 'falsy' }).isString(),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const f = loadFaturamento(Number(req.params.id));
    if (!f) return res.status(404).json({ error: 'Faturamento nao encontrado' });

    const fields = [];
    const params = [];
    for (const campo of ['status', 'data_aprovacao', 'data_emissao_nf', 'numero_nf', 'data_pagamento', 'forma_cobranca', 'observacoes', 'periodo_inicio', 'periodo_fim', 'contrato_id']) {
      if (req.body[campo] !== undefined) { fields.push(`${campo} = ?`); params.push(req.body[campo]); }
    }
    if (fields.length === 0) return res.json({ data: f });
    fields.push('updated_at = datetime(\'now\')');
    params.push(req.params.id);
    db.prepare(`UPDATE faturamentos SET ${fields.join(', ')} WHERE id = ?`).run(...params);

    // se virou "recebido", marcar os pedidos como finalizados
    if (req.body.status === 'recebido') {
      db.prepare("UPDATE pedidos SET status = 'recebido', updated_at = datetime('now') WHERE faturamento_id = ? AND status != 'recebido'").run(req.params.id);
    }
    // se virou "cancelado", desvincular os pedidos (voltam pra aprovacao_faturamento)
    if (req.body.status === 'cancelado') {
      db.prepare("UPDATE pedidos SET faturamento_id = NULL WHERE faturamento_id = ?").run(req.params.id);
    }

    res.json({ data: loadFaturamento(Number(req.params.id)) });
  }
);

// CANCELAR (soft = desvincular pedidos)
router.delete('/:id', requirePapel('admin'), (req, res) => {
  const f = loadFaturamento(Number(req.params.id));
  if (!f) return res.status(404).json({ error: 'Faturamento nao encontrado' });
  const tx = db.transaction(() => {
    db.prepare('UPDATE pedidos SET faturamento_id = NULL WHERE faturamento_id = ?').run(req.params.id);
    db.prepare('UPDATE notas_fiscais SET faturamento_id = NULL WHERE faturamento_id = ?').run(req.params.id);
    db.prepare('DELETE FROM faturamentos WHERE id = ?').run(req.params.id);
  });
  tx();
  res.json({ ok: true });
});

export default router;
