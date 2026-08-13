// Seed: agrupa pedidos em estagio de faturamento em 1 faturamento por cliente/mes
const db = require('better-sqlite3')('data/publi-legal.sqlite');

const pedidos = db.prepare(`
  SELECT p.id, p.cliente_id, p.contrato_id, p.status, p.data_solicitacao, p.data_aprovacao_faturamento,
    COALESCE(SUM(pi.cm_publicado), 0) AS total_cm,
    COALESCE(SUM(pi.cm_publicado * ci.valor_unitario_venda), 0) AS total_valor
  FROM pedidos p
  LEFT JOIN pedido_itens pi ON pi.pedido_id = p.id
  LEFT JOIN contrato_itens ci ON ci.id = pi.contrato_item_id
  WHERE p.status IN ('aprovacao_faturamento', 'aguardando_nf', 'nf_emitida', 'aguardando_pagamento', 'recebido')
  GROUP BY p.id
  ORDER BY p.cliente_id, p.data_solicitacao
`).all();

console.log('pedidos no escopo de faturamento:', pedidos.length);

const grupos = {};
for (const p of pedidos) {
  const data = p.data_aprovacao_faturamento || p.data_solicitacao;
  const mes = data.slice(0, 7);
  const key = p.cliente_id + '|' + mes;
  if (!grupos[key]) grupos[key] = { cliente_id: p.cliente_id, contrato_id: p.contrato_id, mes, pedidos: [], status_final: 'em_aprovacao', valor: 0, cm: 0 };
  grupos[key].pedidos.push(p);
  grupos[key].cm += p.total_cm;
  grupos[key].valor += p.total_valor;
  const mapa = { 'aprovacao_faturamento': 'em_aprovacao', 'aguardando_nf': 'em_aprovacao', 'nf_emitida': 'nf_emitida', 'aguardando_pagamento': 'em_cobranca', 'recebido': 'recebido' };
  const ordem = ['em_aprovacao', 'nf_emitida', 'em_cobranca', 'recebido'];
  const status = mapa[p.status] || 'em_aprovacao';
  if (ordem.indexOf(status) > ordem.indexOf(grupos[key].status_final)) grupos[key].status_final = status;
}

console.log('grupos a criar:', Object.keys(grupos).length);

const insertFat = db.prepare(`
  INSERT INTO faturamentos (cliente_id, contrato_id, periodo_inicio, periodo_fim, valor_total, cm_total, status, observacoes, data_aprovacao, data_emissao_nf, numero_nf, data_pagamento)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
const updatePedido = db.prepare('UPDATE pedidos SET faturamento_id = ? WHERE id = ?');
const updateNF = db.prepare('UPDATE notas_fiscais SET faturamento_id = ? WHERE pedido_id = ?');
const getNF = db.prepare('SELECT id, status, data_pagamento FROM notas_fiscais WHERE pedido_id = ?');

let criados = 0;
const tx = db.transaction(() => {
  for (const g of Object.values(grupos)) {
    const [ano, m] = g.mes.split('-');
    const periodo_inicio = g.mes + '-01';
    const ultimoDia = new Date(Number(ano), Number(m), 0).getDate();
    const periodo_fim = g.mes + '-' + String(ultimoDia).padStart(2, '0');
    const obs = 'Faturamento referente as publicacoes entregues e conferidas no periodo.';

    let data_aprovacao = null, data_emissao_nf = null, numero_nf = null, data_pagamento = null;
    if (g.status_final !== 'em_aprovacao') data_aprovacao = periodo_inicio;
    if (g.status_final === 'nf_emitida' || g.status_final === 'em_cobranca' || g.status_final === 'recebido') {
      data_emissao_nf = g.pedidos[0].data_solicitacao;
      for (const p of g.pedidos) {
        const nf = getNF.get(p.id);
        if (nf) { numero_nf = 'NF' + nf.id; break; }
      }
    }
    if (g.status_final === 'recebido') {
      for (const p of g.pedidos) {
        const nf = getNF.get(p.id);
        if (nf && nf.data_pagamento) { data_pagamento = nf.data_pagamento; break; }
      }
    }

    const info = insertFat.run(g.cliente_id, g.contrato_id, periodo_inicio, periodo_fim, g.valor, g.cm, g.status_final, obs, data_aprovacao, data_emissao_nf, numero_nf, data_pagamento);
    const fatId = info.lastInsertRowid;
    for (const p of g.pedidos) {
      updatePedido.run(fatId, p.id);
      updateNF.run(fatId, p.id);
    }
    criados++;
    console.log('  fat', fatId, 'cliente', g.cliente_id, 'periodo', g.mes, 'qtd_pedidos', g.pedidos.length, 'cm', g.cm, 'valor', g.valor.toFixed(2), 'status', g.status_final);
  }
});
tx();
console.log('criados:', criados);
