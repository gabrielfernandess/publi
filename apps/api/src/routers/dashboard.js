import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/stats', (_req, res) => {
  const hoje = new Date().toISOString().slice(0, 10);

  // KPIs gerais
  const totais = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM clientes WHERE ativo = 1) AS clientes_ativos,
      (SELECT COUNT(*) FROM contratos WHERE status = 'ativo') AS contratos_ativos,
      (SELECT COUNT(*) FROM pedidos WHERE status NOT IN ('recebido', 'cliente_atendido')) AS pedidos_andamento,
      (SELECT COUNT(*) FROM pedidos WHERE status = 'recebido') AS pedidos_concluidos,
      (SELECT COALESCE(SUM(ci.cm_contratado - ci.cm_utilizado) * SUM(ci.valor_unitario_venda) / NULLIF(COUNT(ci.id), 0), 0)
        FROM contrato_itens ci
        INNER JOIN contratos c ON c.id = ci.contrato_id
        WHERE c.status = 'ativo') AS saldo_a_faturar_estimado
  `).get();

  // Alertas de vigência (contratos vencendo em 60 dias ou já vencidos)
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

  // Saldo por contrato ativo (top 5 que mais tem saldo a faturar)
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

  // Pedidos por status (para mini-resumo do kanban)
  const pedidosPorStatus = db.prepare(`
    SELECT status, COUNT(*) AS total FROM pedidos GROUP BY status
  `).all();
  const mapaStatus = Object.fromEntries(pedidosPorStatus.map((r) => [r.status, r.total]));

  // Pedidos recentes (últimos 8)
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
      alertas_vigencia: alertasVigencia,
      top_contratos_saldo: topContratosSaldo,
      pedidos_por_status: mapaStatus,
      pedidos_recentes: pedidosRecentes,
      gerado_em: new Date().toISOString(),
    },
  });
});

export default router;
