import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Parse ?dias=7|30|90 (default 30)
function parsePeriodo(req) {
  const allowed = [7, 30, 90];
  const d = parseInt(req.query.dias, 10);
  return allowed.includes(d) ? d : 30;
}

// Calcula datas no fuso BRT pro SQLite (que retorna UTC)
function datasPeriodo(dias) {
  const hoje = new Date();
  const fim = new Date(hoje);
  fim.setHours(23, 59, 59, 999);
  const inicio = new Date(hoje);
  inicio.setDate(inicio.getDate() - (dias - 1));
  inicio.setHours(0, 0, 0, 0);

  const fimAnt = new Date(inicio);
  fimAnt.setMilliseconds(-1);
  const inicioAnt = new Date(inicio);
  inicioAnt.setDate(inicioAnt.getDate() - dias);

  return {
    inicio: inicio.toISOString(),
    fim: fim.toISOString(),
    inicioAnt: inicioAnt.toISOString(),
    fimAnt: fimAnt.toISOString(),
    dias,
  };
}

router.get('/stats', (req, res) => {
  const p = datasPeriodo(parsePeriodo(req));

  // ===== TOTAIS (snapshot atual) =====
  const totais = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM clientes WHERE ativo = 1) AS clientes_ativos,
      (SELECT COUNT(*) FROM contratos WHERE status = 'ativo') AS contratos_ativos,
      (SELECT COUNT(*) FROM pedidos WHERE status NOT IN ('recebido', 'cliente_atendido')) AS pedidos_andamento,
      (SELECT COUNT(*) FROM pedidos WHERE status = 'recebido') AS pedidos_concluidos,
      (SELECT COALESCE(SUM((ci.cm_contratado - ci.cm_utilizado) * ci.valor_unitario_venda), 0)
        FROM contrato_itens ci
        INNER JOIN contratos c ON c.id = ci.contrato_id
        WHERE c.status = 'ativo') AS saldo_a_faturar_estimado
  `).get();

  // ===== DELTAS (periodo atual vs anterior) =====
  // Clientes novos no periodo
  const clientesNovos = db.prepare(`
    SELECT COUNT(*) AS n FROM clientes
    WHERE ativo = 1 AND created_at >= ? AND created_at <= ?
  `).get(p.inicio, p.fim);
  const clientesNovosAnt = db.prepare(`
    SELECT COUNT(*) AS n FROM clientes
    WHERE ativo = 1 AND created_at >= ? AND created_at <= ?
  `).get(p.inicioAnt, p.fimAnt);

  // Contratos ativos no periodo (snapshot da data passada)
  const contratosAtivosAnt = db.prepare(`
    SELECT COUNT(*) AS n FROM contratos
    WHERE status = 'ativo' AND created_at <= ?
  `).get(p.fimAnt);

  // Pedidos criados no periodo
  const pedidosCriados = db.prepare(`
    SELECT COUNT(*) AS n FROM pedidos
    WHERE data_solicitacao >= ? AND data_solicitacao <= ?
  `).get(p.inicio, p.fim);
  const pedidosCriadosAnt = db.prepare(`
    SELECT COUNT(*) AS n FROM pedidos
    WHERE data_solicitacao >= ? AND data_solicitacao <= ?
  `).get(p.inicioAnt, p.fimAnt);

  // Concluidos no periodo (status = recebido)
  const pedidosConcluidosP = db.prepare(`
    SELECT COUNT(*) AS n FROM pedidos
    WHERE status = 'recebido' AND updated_at >= ? AND updated_at <= ?
  `).get(p.inicio, p.fim);
  const pedidosConcluidosAnt = db.prepare(`
    SELECT COUNT(*) AS n FROM pedidos
    WHERE status = 'recebido' AND updated_at >= ? AND updated_at <= ?
  `).get(p.inicioAnt, p.fimAnt);

  // Receita do periodo (NFs pagas) = valor de notas_fiscais com status = paga
  const receitaP = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS v FROM notas_fiscais
    WHERE status = 'paga' AND data_pagamento >= ? AND data_pagamento <= ?
  `).get(p.inicio, p.fim);
  const receitaAnt = db.prepare(`
    SELECT COALESCE(SUM(valor), 0) AS v FROM notas_fiscais
    WHERE status = 'paga' AND data_pagamento >= ? AND data_pagamento <= ?
  `).get(p.inicioAnt, p.fimAnt);

  function delta(atual, anterior) {
    if (!anterior || anterior === 0) return atual > 0 ? 100 : 0;
    return Math.round(((atual - anterior) / anterior) * 1000) / 10;
  }

  const deltas = {
    clientes: {
      valor: clientesNovos.n,
      anterior: clientesNovosAnt.n,
      pct: delta(clientesNovos.n, clientesNovosAnt.n),
    },
    contratos: {
      valor: totais.contratos_ativos,
      anterior: contratosAtivosAnt.n,
      pct: delta(totais.contratos_ativos, contratosAtivosAnt.n),
    },
    pedidos: {
      valor: pedidosCriados.n,
      anterior: pedidosCriadosAnt.n,
      pct: delta(pedidosCriados.n, pedidosCriadosAnt.n),
    },
    receita: {
      valor: receitaP.v,
      anterior: receitaAnt.v,
      pct: delta(receitaP.v, receitaAnt.v),
    },
    concluidos: {
      valor: pedidosConcluidosP.n,
      anterior: pedidosConcluidosAnt.n,
      pct: delta(pedidosConcluidosP.n, pedidosConcluidosAnt.n),
    },
  };

  // ===== SERIE TEMPORAL DE PEDIDOS (por dia, no periodo) =====
  const seriePedidos = db.prepare(`
    SELECT
      date(data_solicitacao) AS dia,
      COUNT(*) AS total
    FROM pedidos
    WHERE data_solicitacao >= ? AND data_solicitacao <= ?
    GROUP BY date(data_solicitacao)
  `).all(p.inicio, p.fim);

  const serieConcluidos = db.prepare(`
    SELECT
      date(updated_at) AS dia,
      COUNT(*) AS total
    FROM pedidos
    WHERE status = 'recebido' AND updated_at >= ? AND updated_at <= ?
    GROUP BY date(updated_at)
  `).all(p.inicio, p.fim);

  const serieEmAndamento = db.prepare(`
    SELECT date(data_solicitacao) AS dia, COUNT(*) AS total
    FROM pedidos
    WHERE data_solicitacao >= ? AND data_solicitacao <= ?
      AND status NOT IN ('recebido', 'cliente_atendido')
    GROUP BY date(data_solicitacao)
  `).all(p.inicio, p.fim);

  // Monta serie completa (com dias zerados)
  const mapaSol = Object.fromEntries(seriePedidos.map((r) => [r.dia, r.total]));
  const mapaConc = Object.fromEntries(serieConcluidos.map((r) => [r.dia, r.total]));
  const mapaAnd = Object.fromEntries(serieEmAndamento.map((r) => [r.dia, r.total]));

  const serie = [];
  for (let i = 0; i < p.dias; i++) {
    const d = new Date(p.inicio);
    d.setDate(d.getDate() + i);
    const dia = d.toISOString().slice(0, 10);
    serie.push({
      dia,
      solicitados: mapaSol[dia] || 0,
      andamento: mapaAnd[dia] || 0,
      concluidos: mapaConc[dia] || 0,
    });
  }

  // ===== DISTRIBUICAO POR TIPO DE VEICULO (no periodo) =====
  const distVeiculo = db.prepare(`
    SELECT
      COALESCE(p.veiculo_unico, 'outros') AS tipo,
      COUNT(p.id) AS total
    FROM pedidos p
    WHERE p.data_solicitacao >= ? AND p.data_solicitacao <= ?
    GROUP BY COALESCE(p.veiculo_unico, 'outros')
    HAVING total > 0
    ORDER BY total DESC
  `).all(p.inicio, p.fim);
  const totalPedidosP = distVeiculo.reduce((s, r) => s + r.total, 0);
  const distribuicao = distVeiculo.map((r) => ({
    tipo: r.tipo,
    nome: r.tipo.toUpperCase(),
    total: r.total,
    pct: totalPedidosP > 0 ? Math.round((r.total / totalPedidosP) * 1000) / 10 : 0,
  }));

  // ===== RECEITA MENSAL (ultimos 6 meses) =====
  const receitaMensal = db.prepare(`
    SELECT
      strftime('%Y-%m', data_pagamento) AS mes,
      COALESCE(SUM(valor), 0) AS valor
    FROM notas_fiscais
    WHERE status = 'paga' AND data_pagamento >= date('now', '-6 months')
    GROUP BY strftime('%Y-%m', data_pagamento)
    ORDER BY mes ASC
  `).all();
  // Preenche meses faltantes com 0
  const mapaMes = Object.fromEntries(receitaMensal.map((r) => [r.mes, r.valor]));
  const meses = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const mes = d.toISOString().slice(0, 7);
    meses.push({ mes, valor: mapaMes[mes] || 0 });
  }

  // ===== ALERTAS DE VIGENCIA (mantido) =====
  const alertasVigencia = db.prepare(`
    SELECT
      c.id, c.numero, c.data_fim,
      cl.nome AS cliente_nome, cl.municipio,
      CAST(julianday(c.data_fim) - julianday('now') AS INTEGER) AS dias_para_vencer
    FROM contratos c
    INNER JOIN clientes cl ON cl.id = c.cliente_id
    WHERE c.status = 'ativo' AND julianday(c.data_fim) - julianday('now') <= 60
    ORDER BY c.data_fim ASC
  `).all();

  // ===== TOP CONTRATOS COM SALDO (mantido) =====
  const topContratosSaldo = db.prepare(`
    SELECT
      c.id, cl.nome AS cliente_nome, cl.municipio,
      COALESCE(SUM(ci.cm_contratado), 0) AS cm_contratado,
      COALESCE(SUM(ci.cm_utilizado), 0) AS cm_utilizado,
      COALESCE(SUM((ci.cm_contratado - ci.cm_utilizado) * ci.valor_unitario_venda), 0) AS saldo_valor
    FROM contratos c
    INNER JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN contrato_itens ci ON ci.contrato_id = c.id
    WHERE c.status = 'ativo'
    GROUP BY c.id
    ORDER BY saldo_valor DESC
    LIMIT 5
  `).all();

  // ===== PEDIDOS POR STATUS (mantido) =====
  const pedidosPorStatus = db.prepare(`
    SELECT status, COUNT(*) AS total FROM pedidos GROUP BY status
  `).all();
  const mapaStatus = Object.fromEntries(pedidosPorStatus.map((r) => [r.status, r.total]));

  // ===== PEDIDOS RECENTES (mantido) =====
  const pedidosRecentes = db.prepare(`
    SELECT
      p.id, p.status, p.categoria, p.data_solicitacao, p.updated_at,
      c.nome AS cliente_nome, c.municipio
    FROM pedidos p
    INNER JOIN clientes c ON c.id = p.cliente_id
    ORDER BY p.updated_at DESC
    LIMIT 8
  `).all();

  res.json({
    data: {
      totais,
      deltas,
      serie_pedidos: serie,
      distribuicao_veiculo: distribuicao,
      receita_mensal: meses,
      alertas_vigencia: alertasVigencia,
      top_contratos_saldo: topContratosSaldo,
      pedidos_por_status: mapaStatus,
      pedidos_recentes: pedidosRecentes,
      periodo: { dias: p.dias, inicio: p.inicio, fim: p.fim },
      gerado_em: new Date().toISOString(),
    },
  });
});

export default router;
