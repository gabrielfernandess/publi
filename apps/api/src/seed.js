import 'dotenv/config';
import bcrypt from 'bcryptjs';
import db, { ensureSchema } from './db.js';

console.log('[seed] iniciando seed do banco Publi Legal...');

// DROP tabelas pra garantir schema novo (CHECK constraints, etc)
db.exec(`
  DROP TABLE IF EXISTS pedido_itens;
  DROP TABLE IF EXISTS pedidos;
  DROP TABLE IF EXISTS contrato_itens;
  DROP TABLE IF EXISTS contratos;
  DROP TABLE IF EXISTS clientes;
  DROP TABLE IF EXISTS veiculos;
  DROP TABLE IF EXISTS notas_fiscais;
  DROP TABLE IF EXISTS users;
`);

// Recria com o schema novo
ensureSchema();

// 1) Users (2 papéis: admin = tudo, user = operacional sem faturamento/NF)
const userInsert = db.prepare(`INSERT INTO users (email, nome, senha_hash, papel) VALUES (?, ?, ?, ?)`);
const usersSeed = [
  ['admin@publilegal.com.br', 'Admin (Maria)',     'admin123', 'admin'],
  ['user@publilegal.com.br',  'Usuário (Joana)',   'user123',  'user'],
];
for (const [email, nome, senha, papel] of usersSeed) {
  userInsert.run(email, nome, bcrypt.hashSync(senha, 10), papel);
}
console.log('[seed] 2 users criados (admin + user)');

// 2) Veiculos
const veicInsert = db.prepare(`INSERT INTO veiculos (nome, tipo, estado, custo_cm) VALUES (?, ?, ?, ?)`);
veicInsert.run('Diário Oficial da União', 'dou', 'DF', 32);
veicInsert.run('Diário Oficial do Estado do Maranhão', 'doe', 'MA', 9);
veicInsert.run('Diário Oficial do Estado do Tocantins', 'doe', 'TO', 9);
veicInsert.run('Diário Oficial do Estado do Paraná', 'doe', 'PR', 9);
veicInsert.run('O Imparcial', 'jornal', 'MA', 23);
veicInsert.run('Jornal Pequeno', 'jornal', 'MA', 23);
veicInsert.run('O Pará', 'jornal', 'PA', 23);
veicInsert.run('Primeira Página', 'jornal', 'TO', 23);
veicInsert.run('Jornal Impacto Paraná', 'jornal', 'PR', 23);
console.log('[seed] 9 veículos criados');

// 3) Clientes
const cliInsert = db.prepare(`INSERT INTO clientes (nome, tipo, cnpj, municipio, estado, contato_nome, contato_email, contato_telefone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
cliInsert.run('Prefeitura Municipal de Cidelândia', 'prefeitura', '01.612.345/0001-90', 'Cidelândia', 'MA', 'Maria Silva', 'compras@cidelandia.ma.gov.br', '(99) 98123-4567');
cliInsert.run('Prefeitura Municipal de Montes Altos', 'prefeitura', '01.612.345/0002-71', 'Montes Altos', 'MA', 'João Souza', 'licitacao@montesaltos.ma.gov.br', '(99) 98123-4568');
cliInsert.run('Prefeitura Municipal de Itaguatins', 'prefeitura', '01.612.345/0003-52', 'Itaguatins', 'TO', 'Carlos Lima', 'licitacao@itaguatins.to.gov.br', '(63) 98123-4569');
cliInsert.run('Prefeitura Municipal de Tibagi', 'prefeitura', '01.612.345/0004-33', 'Tibagi', 'PR', 'Ana Pereira', 'compras@tibagi.pr.gov.br', '(42) 98123-4570');
cliInsert.run('Prefeitura Municipal de Campestre', 'prefeitura', '01.612.345/0005-14', 'Campestre', 'MA', 'Paulo Henrique', 'licitacao@campestre.ma.gov.br', '(99) 98123-4571');
cliInsert.run('Prefeitura Municipal de Carrasco Bonito', 'prefeitura', '01.612.345/0006-95', 'Carrasco Bonito', 'TO', 'Raimundo Alves', 'compras@carrascobonito.to.gov.br', '(63) 98123-4572');
cliInsert.run('Câmara Municipal de Primavera do Leste', 'camara', '02.345.678/0001-10', 'Primavera do Leste', 'MT', 'Roberto Costa', 'camara@primaveradoleste.mt.leg.br', '(66) 98123-4573');
cliInsert.run('Prefeitura Municipal de Paço do Lumiar', 'prefeitura', '01.612.345/0007-76', 'Paço do Lumiar', 'MA', 'Simone Reis', 'licitacao@pacodolumiar.ma.gov.br', '(98) 98123-4574');
console.log('[seed] 8 clientes criados');

// 4) Contratos com itens
const contInsert = db.prepare(`
  INSERT INTO contratos (cliente_id, numero, objeto, data_inicio, data_fim, modalidade, processo)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);
const itemInsert = db.prepare(`
  INSERT INTO contrato_itens (contrato_id, veiculo_id, descricao, cm_contratado, cm_utilizado, valor_unitario_venda, valor_unitario_custo)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

// helpers
function novoContrato(cliente_id, numero, objeto, inicio, fim, modalidade, processo) {
  return contInsert.run(cliente_id, numero, objeto, inicio, fim, modalidade, processo).lastInsertRowid;
}
function addItem(contrato_id, veiculo_id, descricao, cm_contratado, cm_utilizado, venda, custo) {
  itemInsert.run(contrato_id, veiculo_id, descricao, cm_contratado, cm_utilizado, venda, custo);
}

// Cidelândia
let id = novoContrato(1, '063/2025', 'Publicidade legal em DOU, DOE/MA e Jornal', '2025-12-18', '2026-12-18', 'licitacao', '091/2025');
addItem(id, 1, 'DOU - Diário Oficial da União', 600, 178, 47.9, 32);
addItem(id, 2, 'DOE - Diário Oficial do Estado MA', 500, 362, 14, 9);
addItem(id, 5, 'Jornal de Grande Circulação - O Imparcial', 500, 344, 35.2, 23);

// Montes Altos (vigência antiga + nova)
id = novoContrato(2, '045/2025', 'Publicidade legal Montes Altos', '2025-12-16', '2026-12-16', 'licitacao', '087/2025');
addItem(id, 1, 'DOU', 225, 208, 48, 32);
addItem(id, 2, 'DOE/MA', 170, 170, 13, 9);
addItem(id, 5, 'Jornal O Imparcial', 43, 43, 350, 23);

id = novoContrato(2, '061/2026', 'Aditivo Montes Altos 2026/2027', '2026-04-27', '2027-04-27', 'contrato_direto', null);
addItem(id, 1, 'DOU', 1300, 176, 49, 32);
addItem(id, 2, 'DOE/MA', 1500, 229, 16, 9);
addItem(id, 5, 'Jornal O Imparcial', 75, 16, 149, 23);

// Itaguatins
id = novoContrato(3, '022/2025', 'Publicidade legal Itaguatins', '2025-02-17', '2025-12-31', 'licitacao', '014/2025');
addItem(id, 1, 'DOU', 400, 357.5, 52, 32);
addItem(id, 2, 'DOE/MA', 400, 29, 22, 9);
addItem(id, 8, 'Jornal Primeira Página', 80, 28, 350, 23);

// Tibagi - PR
id = novoContrato(4, '030/2025', 'Publicidade legal Tibagi/PR', '2025-10-01', '2026-10-01', 'licitacao', '045/2025');
addItem(id, 1, 'DOU', 300, 76, 41.2, 32);
addItem(id, 4, 'DOE/PR', 500, 288, 32.5, 9);
addItem(id, 9, 'Jornal Impacto Paraná', 2500, 2276, 15.15, 23);

// Campestre
id = novoContrato(5, '032/2025', 'Publicidade legal Campestre', '2025-04-24', '2026-04-24', 'licitacao', '032/2025');
addItem(id, 5, 'Jornal O Imparcial', 880, 706, 36, 23);
addItem(id, 2, 'DOE/MA', 600, 0, 20, 9);
addItem(id, 1, 'DOU', 300, 300, 45, 32);

// Carrasco Bonito
id = novoContrato(6, '048/2025', 'Publicidade legal Carrasco Bonito', '2025-11-05', '2026-11-05', 'licitacao', '088/2025');
addItem(id, 1, 'DOU', 376, 152, 85, 32);
addItem(id, 2, 'DOE/MA', 370, 419, 22, 9);
addItem(id, 8, 'Jornal Primeira Página', 22, 10, 350, 23);

// Câmara Primavera do Leste
id = novoContrato(7, 'CAM-005/2025', 'Publicidade legal Câmara', '2025-09-01', '2026-09-01', 'licitacao', '012/2025');
addItem(id, 1, 'DOU', 550, 52, 47.44, 32);
addItem(id, 2, 'DOE/MA', 500, 141, 10.78, 9);
addItem(id, 5, 'Jornal O Imparcial', 1000, 166, 20.29, 23);

// Paço do Lumiar
id = novoContrato(8, '025/2025', 'Publicidade legal Paço do Lumiar', '2025-03-25', '2026-03-25', 'licitacao', '030/2025');
addItem(id, 1, 'DOU', 350, 110, 45.5, 32);
addItem(id, 2, 'DOE/MA', 400, 180, 12, 9);
addItem(id, 6, 'Jornal Pequeno', 200, 75, 25, 23);

console.log('[seed] 9 contratos com 25 itens criados');

// 5) Pedidos em diferentes status (simulando o kanban)
const pedInsert = db.prepare(`
  INSERT INTO pedidos (cliente_id, contrato_id, data_solicitacao, data_desejada_publicacao, categoria, descricao, status, responsavel_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
const pedItemInsert = db.prepare(`
  INSERT INTO pedido_itens (pedido_id, contrato_item_id, cm_publicado, protocolo_envio, data_envio)
  VALUES (?, ?, ?, ?, ?)
`);

const adminId = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@publilegal.com.br').id;
const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('user@publilegal.com.br').id;
const opId = adminId; // legado: alguns pedidos antigos usam "responsavel_id" generico

function novoPedido(cliente_id, contrato_id, data_sol, data_desejada, cat, desc, status, resp, itens) {
  const info = pedInsert.run(cliente_id, contrato_id, data_sol, data_desejada, cat, desc, status, resp);
  for (const it of itens) pedItemInsert.run(info.lastInsertRowid, it.ci_id, it.cm, it.proto || null, it.data_envio || null);
  return info.lastInsertRowid;
}

const ci = (cid, desc) => db.prepare('SELECT id FROM contrato_itens WHERE contrato_id = ? AND descricao LIKE ?').get(cid, desc + '%')?.id;

// Pedido em "solicitada"
novoPedido(1, 1, '2026-08-05', '2026-08-10', 'aviso_licitacao', 'Aviso de Licitacao PE 005/2026 - Cidelândia', 'solicitada', null, [
  { ci_id: ci(1, 'DOU'), cm: 12 },
  { ci_id: ci(1, 'DOE'), cm: 8 },
  { ci_id: ci(1, 'Jornal'), cm: 24 },
]);

// Pedido em "em_preparacao"
novoPedido(2, 3, '2026-08-04', '2026-08-09', 'extrato_contrato', 'Extrato de Contrato 001/2026-04 - Montes Altos', 'em_preparacao', opId, [
  { ci_id: ci(3, 'DOU'), cm: 28 },
  { ci_id: ci(3, 'DOE'), cm: 15 },
]);

// Pedido em "aguardando_envio"
novoPedido(4, 5, '2026-08-04', '2026-08-08', 'homologacao', 'Extrato de Homologacao PE 022/2025 - Tibagi', 'aguardando_envio', opId, [
  { ci_id: ci(5, 'DOU'), cm: 15 },
  { ci_id: ci(5, 'DOE'), cm: 22 },
  { ci_id: ci(5, 'Jornal'), cm: 35 },
]);

// Pedido em "enviada"
novoPedido(3, 4, '2026-08-03', '2026-08-07', 'aviso_licitacao', 'Aviso de Licitacao PE 01.2026 - Itaguatins', 'enviada', opId, [
  { ci_id: ci(4, 'DOU'), cm: 12, proto: 'DOU-2026-001245', data_envio: '2026-08-05' },
  { ci_id: ci(4, 'Jornal'), cm: 8, proto: 'PP-2026-00789', data_envio: '2026-08-05' },
]);

// Pedido em "cust_pgtos"
novoPedido(5, 6, '2026-08-02', '2026-08-06', 'aviso_licitacao', 'Aviso PE 009/2025 - Campestre', 'cust_pgtos', opId, [
  { ci_id: ci(6, 'DOU'), cm: 18, proto: 'DOU-2026-001240', data_envio: '2026-08-04' },
  { ci_id: ci(6, 'DOE'), cm: 14, proto: 'DOE-2026-00891', data_envio: '2026-08-04' },
]);

// Pedido em "aguardando_publicacao"
novoPedido(6, 7, '2026-08-01', '2026-08-05', 'extrato_contrato', 'Extrato de Contrato 048/2025 - Carrasco Bonito', 'aguardando_publicacao', opId, [
  { ci_id: ci(7, 'DOU'), cm: 24, proto: 'DOU-2026-001232', data_envio: '2026-08-03' },
  { ci_id: ci(7, 'Jornal'), cm: 12, proto: 'PP-2026-00782', data_envio: '2026-08-03' },
]);

// Pedido em "publicacao_recebida"
novoPedido(7, 8, '2026-07-30', '2026-08-04', 'aviso_licitacao', 'Aviso PE 09.2025 - Camara Primavera do Leste', 'publicacao_recebida', opId, [
  { ci_id: ci(8, 'DOU'), cm: 9, proto: 'DOU-2026-001220', data_envio: '2026-08-01' },
  { ci_id: ci(8, 'DOE'), cm: 18, proto: 'DOE-2026-00885', data_envio: '2026-08-01' },
]);

// Pedido em "cliente_atendido" (Paco do Lumiar - contrato 9)
novoPedido(8, 9, '2026-07-28', '2026-08-02', 'homologacao', 'Homologacao CE 002/2025 - Paco do Lumiar', 'cliente_atendido', opId, [
  { ci_id: ci(9, 'DOU'), cm: 14, proto: 'DOU-2026-001210', data_envio: '2026-07-30' },
]);

// Pedido em "aprovacao_faturamento"
novoPedido(1, 1, '2026-07-25', '2026-07-30', 'aviso_licitacao', 'Aviso CE 003/2026 - Cidelândia', 'aprovacao_faturamento', opId, [
  { ci_id: ci(1, 'DOU'), cm: 18, proto: 'DOU-2026-001205', data_envio: '2026-07-27' },
  { ci_id: ci(1, 'DOE'), cm: 22, proto: 'DOE-2026-00870', data_envio: '2026-07-27' },
]);

// Pedido em "nf_emitida"
novoPedido(2, 3, '2026-07-20', '2026-07-25', 'extrato_contrato', 'Extrato 001/2025-004 - Montes Altos', 'nf_emitida', opId, [
  { ci_id: ci(3, 'DOE'), cm: 16, proto: 'DOE-2026-00855', data_envio: '2026-07-22' },
]);

// Pedido em "recebido"
novoPedido(4, 5, '2026-07-15', '2026-07-20', 'aviso_licitacao', 'Aviso PE 43.2025 - Tibagi', 'recebido', opId, [
  { ci_id: ci(5, 'DOU'), cm: 11, proto: 'DOU-2026-001190', data_envio: '2026-07-17' },
  { ci_id: ci(5, 'DOE'), cm: 19, proto: 'DOE-2026-00850', data_envio: '2026-07-17' },
]);

console.log('[seed] 11 pedidos em diferentes status criados');

// 6) Notas Fiscais de exemplo (NÃO emitidas pelo sistema — importadas de fora)
const nfInsert = db.prepare(`
  INSERT INTO notas_fiscais (pedido_id, cliente_id, numero, data_emissao, data_pagamento, valor, status, observacoes)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);
// Pagas (recebidas) — 2 meses atrás
nfInsert.run(8, 4, '20260011', '2026-05-20', '2026-06-15', 1186, 'paga', 'Aviso PE 09.2025 - Camara');
nfInsert.run(7, 1, '20260012', '2026-05-22', '2026-06-18', 880, 'paga', '2 avisos CE 001/002 - Cidelândia');
// Pagas (recebidas) — 1 mês atrás
nfInsert.run(7, 1, '20260017', '2026-06-10', '2026-07-08', 422, 'paga', 'Aviso PE 003 - Cidelândia');
nfInsert.run(11, 4, '20260023', '2026-06-15', '2026-07-12', 439, 'paga', 'Aviso PE 43.2025 - Tibagi');
// Emitidas mas ainda não pagas (a receber)
nfInsert.run(10, 7, '20260030', '2026-07-05', null, 1100, 'emitida', 'Aviso PE 09.2025 - Camara (enviada 06/07)');
nfInsert.run(9, 6, '20260031', '2026-07-08', null, 840, 'emitida', 'Extrato 048/2025 - Carrasco (em cobrança)');
// Atrasada (>60 dias sem pagar)
nfInsert.run(7, 1, '20260042', '2026-05-02', null, 650, 'emitida', 'Aviso PE 03.2026 - Cidelândia (atrasada!)');
// Enviada (NF emitida e enviada pra prefeitura, aguardando confirmação/pgto)
nfInsert.run(8, 4, '20260045', '2026-07-20', null, 1250, 'enviada', 'Aviso 43.2025 - Tibagi (enviada 22/07)');
// Cancelada
nfInsert.run(7, 1, '20260099', '2026-06-01', null, 200, 'cancelada', 'NF cancelada - erro de valor');

console.log('[seed] 9 notas fiscais importadas (2 a receber, 1 atrasada, 1 enviada, 4 pagas, 1 cancelada)');

// 7) Baixa automática do saldo contratual (simula o que a rota faz ao importar NF)
// Para cada NF com pedido_id, soma os cm_publicado do pedido nos contrato_itens correspondentes
const allNfs = db.prepare("SELECT id, pedido_id FROM notas_fiscais WHERE pedido_id IS NOT NULL AND status != 'cancelada'").all();
const itemSum = db.prepare(`
  SELECT pi.contrato_item_id, SUM(pi.cm_publicado) AS total
  FROM pedido_itens pi
  WHERE pi.pedido_id = ?
  GROUP BY pi.contrato_item_id
`);
const updItem = db.prepare('UPDATE contrato_itens SET cm_utilizado = cm_utilizado + ? WHERE id = ?');
for (const nf of allNfs) {
  const itens = itemSum.all(nf.pedido_id);
  for (const it of itens) {
    updItem.run(it.total, it.contrato_item_id);
  }
}
console.log(`[seed] baixa automatica aplicada em ${allNfs.length} NF(s)`);

console.log('\n[seed] PRONTO! Credenciais demo:');
console.log('  admin@publilegal.com.br / admin123 (Admin — acesso total)');
console.log('  user@publilegal.com.br  / user123  (Usuário — sem aprovação de faturamento, sem financeiro)');
