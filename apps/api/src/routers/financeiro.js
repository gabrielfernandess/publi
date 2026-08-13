import { Router } from 'express';
import db from '../db.js';

const router = Router();

// =================== DASHBOARD FINANCEIRO ===================
router.get('/dashboard', (_req, res) => {
  // Caixa por mês (últimos 12 meses): faturado (data_emissao) vs recebido (data_pagamento)
  const caixaPorMes = db.prepare(`
    WITH meses AS (
      SELECT DISTINCT strftime('%Y-%m', data_emissao) AS mes FROM notas_fiscais WHERE data_emissao IS NOT NULL
      UNION
      SELECT DISTINCT strftime('%Y-%m', data_pagamento) AS mes FROM notas_fiscais WHERE data_pagamento IS NOT NULL
    )
    SELECT
      m.mes,
      COALESCE(fat.faturado, 0) AS faturado,
      COALESCE(rec.recebido, 0) AS recebido,
      (COALESCE(fat.faturado, 0) - COALESCE(rec.recebido, 0)) AS a_receber
    FROM meses m
    LEFT JOIN (
      SELECT strftime('%Y-%m', data_emissao) AS mes, SUM(valor) AS faturado
      FROM notas_fiscais WHERE status != 'cancelada' GROUP BY mes
    ) fat ON fat.mes = m.mes
    LEFT JOIN (
      SELECT strftime('%Y-%m', data_pagamento) AS mes, SUM(valor) AS recebido
      FROM notas_fiscais WHERE status = 'paga' GROUP BY mes
    ) rec ON rec.mes = m.mes
    WHERE m.mes IS NOT NULL
    ORDER BY m.mes DESC
    LIMIT 12
  `).all().reverse(); // mais antigo primeiro

  // KPIs do mês atual
  const hoje = new Date();
  const mesAtual = hoje.toISOString().slice(0, 7); // YYYY-MM

  const kpis = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', data_emissao) = ? AND status != 'cancelada' THEN valor ELSE 0 END), 0) AS faturado_mes,
      COALESCE(SUM(CASE WHEN strftime('%Y-%m', data_pagamento) = ? AND status = 'paga' THEN valor ELSE 0 END), 0) AS recebido_mes,
      COALESCE(SUM(CASE WHEN status = 'paga' THEN valor ELSE 0 END), 0) AS total_recebido,
      COALESCE(SUM(CASE WHEN status IN ('emitida','enviada') THEN valor ELSE 0 END), 0) AS total_a_receber,
      COALESCE(SUM(CASE WHEN status = 'cancelada' THEN valor ELSE 0 END), 0) AS total_cancelado
    FROM notas_fiscais
  `).get(mesAtual, mesAtual);

  // Top NFs pendentes (emitidas/enviadas, mais antigas)
  const pendentes = db.prepare(`
    SELECT nf.id, nf.numero, nf.data_emissao, nf.valor, nf.status,
           c.nome AS cliente_nome, c.municipio
    FROM notas_fiscais nf
    INNER JOIN clientes c ON c.id = nf.cliente_id
    WHERE nf.status IN ('emitida', 'enviada')
    ORDER BY nf.data_emissao ASC
    LIMIT 10
  `).all();

  // NFs atrasadas (data_emissao > 60 dias e ainda não paga)
  const atrasadas = db.prepare(`
    SELECT
      COUNT(*) AS qtd,
      COALESCE(SUM(valor), 0) AS valor_total
    FROM notas_fiscais
    WHERE status IN ('emitida', 'enviada')
      AND julianday('now') - julianday(data_emissao) > 60
  `).get();

  // Top clientes por valor faturado
  const topClientes = db.prepare(`
    SELECT c.nome AS cliente_nome, c.municipio,
           COALESCE(SUM(nf.valor), 0) AS total_faturado,
           COUNT(nf.id) AS total_nfs
    FROM notas_fiscais nf
    INNER JOIN clientes c ON c.id = nf.cliente_id
    WHERE nf.status != 'cancelada'
    GROUP BY c.id
    ORDER BY total_faturado DESC
    LIMIT 5
  `).all();

  // Aging de NFs a receber (0-30, 31-60, 61-90, 90+ dias)
  const aging = db.prepare(`
    SELECT
      SUM(CASE WHEN dias >= 0  AND dias <= 30 THEN 1 ELSE 0 END) AS ate_30_qtd,
      SUM(CASE WHEN dias >= 0  AND dias <= 30 THEN valor ELSE 0 END) AS ate_30_valor,
      SUM(CASE WHEN dias > 30 AND dias <= 60 THEN 1 ELSE 0 END) AS de_31_60_qtd,
      SUM(CASE WHEN dias > 30 AND dias <= 60 THEN valor ELSE 0 END) AS de_31_60_valor,
      SUM(CASE WHEN dias > 60 AND dias <= 90 THEN 1 ELSE 0 END) AS de_61_90_qtd,
      SUM(CASE WHEN dias > 60 AND dias <= 90 THEN valor ELSE 0 END) AS de_61_90_valor,
      SUM(CASE WHEN dias > 90 THEN 1 ELSE 0 END) AS mais_90_qtd,
      SUM(CASE WHEN dias > 90 THEN valor ELSE 0 END) AS mais_90_valor
    FROM (
      SELECT
        CAST(julianday('now') - julianday(data_emissao) AS INTEGER) AS dias,
        valor
      FROM notas_fiscais
      WHERE status IN ('emitida', 'enviada')
    )
  `).get();

  // Distribuicao por veiculo: soma cm_publicado e valor por veiculo_tipo dos pedidos
  const distVeiculo = db.prepare(`
    SELECT
      v.tipo AS veiculo_tipo,
      COUNT(DISTINCT pi.pedido_id) AS qtd_pedidos,
      COALESCE(SUM(pi.cm_publicado), 0) AS total_cm,
      COALESCE(SUM(pi.cm_publicado * ci.valor_unitario_venda), 0) AS total_valor
    FROM pedido_itens pi
    INNER JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
    INNER JOIN veiculos v ON v.id = ci.veiculo_id
    GROUP BY v.tipo
    ORDER BY total_valor DESC
  `).all();

  res.json({
    data: {
      caixa_por_mes: caixaPorMes,
      kpis_mes: {
        mes: mesAtual,
        ...kpis,
        // diferença entre faturado e recebido no mês (saldo a receber do mês)
        saldo_mes: kpis.faturado_mes - kpis.recebido_mes,
      },
      nfs_pendentes: pendentes,
      nfs_atrasadas: atrasadas,
      top_clientes: topClientes,
      aging,
      dist_veiculo: distVeiculo,
      gerado_em: new Date().toISOString(),
    },
  });
});

export default router;
