// Cria 1 faturamento de exemplo por cliente/contrato (agosto/2026)
const db = require('better-sqlite3')('data/publi-legal.sqlite');

const insertFat = db.prepare(`
  INSERT INTO faturamentos (cliente_id, contrato_id, periodo_inicio, periodo_fim, valor_total, cm_total, status, observacoes, data_aprovacao, data_emissao_nf, numero_nf, data_pagamento, forma_cobranca)
  VALUES (?, ?, '2026-08-01', '2026-08-31', ?, ?, ?, 'Faturamento referente as publicacoes entregues e conferidas no periodo.', ?, ?, ?, ?, ?)
`);

// Dados demo: cliente_id -> { valor, cm, status, nf, data_pagamento, forma_cobranca }
const demos = {
  1: { valor: 4800, cm: 800, status: 'em_aprovacao', nf: null, data_pagamento: null, forma_cobranca: 'Mensal' },
  2: { valor: 3000, cm: 500, status: 'nf_emitida', nf: 'NF-3000', data_pagamento: null, forma_cobranca: 'Mensal' },
  3: { valor: 7620, cm: 1270, status: 'recebido', nf: 'NF-7620', data_pagamento: '2026-08-12', forma_cobranca: 'Mensal' },
  4: { valor: 2580, cm: 430, status: 'em_cobranca', nf: 'NF-2580', data_pagamento: null, forma_cobranca: 'Trimestral' },
  5: { valor: 1260, cm: 210, status: 'recebido', nf: 'NF-1260', data_pagamento: '2026-08-08', forma_cobranca: 'Mensal' },
  6: { valor: 3200, cm: 480, status: 'nf_emitida', nf: 'NF-3200', data_pagamento: null, forma_cobranca: 'Mensal' },
  7: { valor: 1850, cm: 280, status: 'em_aprovacao', nf: null, data_pagamento: null, forma_cobranca: 'Mensal' },
  8: { valor: 4100, cm: 720, status: 'em_cobranca', nf: 'NF-4100', data_pagamento: null, forma_cobranca: 'Mensal' },
};

const contratos = db.prepare("SELECT id, cliente_id FROM contratos WHERE status='ativo'").all();
let criados = 0;
for (const ct of contratos) {
  const demo = demos[ct.cliente_id];
  if (!demo) continue;
  const dataAprovacao = demo.status !== 'em_aprovacao' ? '2026-08-01' : null;
  const dataEmissao = (demo.status === 'nf_emitida' || demo.status === 'em_cobranca' || demo.status === 'recebido') ? '2026-08-15' : null;
  const info = insertFat.run(ct.cliente_id, ct.id, demo.valor, demo.cm, demo.status, dataAprovacao, dataEmissao, demo.nf, demo.data_pagamento, demo.forma_cobranca);
  console.log('fat', info.lastInsertRowid, ':', db.prepare('SELECT nome FROM clientes WHERE id = ?').get(ct.cliente_id).nome, 'R$', demo.valor, demo.status);
  criados++;
}
console.log('criados:', criados);
console.log('total faturamentos:', db.prepare('SELECT COUNT(*) AS c FROM faturamentos').get().c);
