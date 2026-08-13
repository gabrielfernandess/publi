const db = require('better-sqlite3')('data/publi-legal.sqlite');
const fat = db.prepare("SELECT id, data_emissao_nf FROM faturamentos WHERE status='em_cobranca' LIMIT 1").get();
if (fat) {
  const dt = new Date(); dt.setDate(dt.getDate() - 90);
  const iso = dt.toISOString().slice(0, 10);
  db.prepare('UPDATE faturamentos SET data_emissao_nf = ? WHERE id = ?').run(iso, fat.id);
  console.log('fat', fat.id, 'data_emissao_nf mudado para', iso);
}
