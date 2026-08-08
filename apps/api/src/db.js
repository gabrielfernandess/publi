import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH
  ? path.resolve(process.env.DATABASE_PATH)
  : path.resolve(__dirname, '../data/publi-legal.sqlite');

// garante pasta
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// =================== SCHEMA ===================
export const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    senha_hash TEXT NOT NULL,
    papel TEXT NOT NULL CHECK(papel IN ('admin','user')),
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('prefeitura','camara','autarquia','outros')),
    cnpj TEXT,
    municipio TEXT,
    estado TEXT,
    contato_nome TEXT,
    contato_email TEXT,
    contato_telefone TEXT,
    observacoes TEXT,
    ativo INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS veiculos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN ('dou','doe','jornal')),
    estado TEXT,
    custo_cm REAL NOT NULL DEFAULT 0,
    ativo INTEGER NOT NULL DEFAULT 1,
    observacoes TEXT
  );

  CREATE TABLE IF NOT EXISTS contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    numero TEXT,
    objeto TEXT,
    data_inicio TEXT NOT NULL,
    data_fim TEXT NOT NULL,
    modalidade TEXT,
    processo TEXT,
    status TEXT NOT NULL DEFAULT 'ativo' CHECK(status IN ('ativo','encerrado','suspenso')),
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS contrato_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contrato_id INTEGER NOT NULL,
    veiculo_id INTEGER NOT NULL,
    descricao TEXT NOT NULL,
    cm_contratado REAL NOT NULL DEFAULT 0,
    cm_utilizado REAL NOT NULL DEFAULT 0,
    valor_unitario_venda REAL NOT NULL DEFAULT 0,
    valor_unitario_custo REAL NOT NULL DEFAULT 0,
    FOREIGN KEY (contrato_id) REFERENCES contratos(id) ON DELETE CASCADE,
    FOREIGN KEY (veiculo_id) REFERENCES veiculos(id)
  );

  CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    contrato_id INTEGER,
    data_solicitacao TEXT NOT NULL,
    data_desejada_publicacao TEXT,
    categoria TEXT NOT NULL,
    descricao TEXT,
    arquivo_recebido TEXT,
    status TEXT NOT NULL DEFAULT 'solicitada',
    responsavel_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id),
    FOREIGN KEY (contrato_id) REFERENCES contratos(id),
    FOREIGN KEY (responsavel_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS pedido_itens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    contrato_item_id INTEGER NOT NULL,
    cm_publicado REAL NOT NULL DEFAULT 0,
    protocolo_envio TEXT,
    data_envio TEXT,
    data_publicacao TEXT,
    pdf_path TEXT,
    observacoes TEXT,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (contrato_item_id) REFERENCES contrato_itens(id)
  );

  CREATE TABLE IF NOT EXISTS notas_fiscais (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER,
    cliente_id INTEGER NOT NULL,
    numero TEXT NOT NULL,
    data_emissao TEXT NOT NULL,
    valor REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'emitida' CHECK(status IN ('emitida','enviada','cancelada','paga')),
    data_pagamento TEXT,
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id),
    FOREIGN KEY (cliente_id) REFERENCES clientes(id)
  );

  CREATE TABLE IF NOT EXISTS pedido_boletos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    veiculo_tipo TEXT NOT NULL CHECK(veiculo_tipo IN ('dou','doe','jornal')),
    valor REAL NOT NULL DEFAULT 0,
    data_vencimento TEXT,
    data_pagamento TEXT,
    arquivo_path TEXT,
    observacoes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pedido_historico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    user_id INTEGER,
    evento TEXT NOT NULL,
    status_anterior TEXT,
    status_novo TEXT,
    detalhes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS pedido_arquivos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pedido_id INTEGER NOT NULL,
    user_id INTEGER,
    nome_original TEXT NOT NULL,
    nome_arquivo TEXT NOT NULL,
    mimetype TEXT,
    tamanho INTEGER,
    categoria TEXT,
    uploaded_em TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_pedidos_status ON pedidos(status);
  CREATE INDEX IF NOT EXISTS idx_pedidos_cliente ON pedidos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_pedidos_contrato ON pedidos(contrato_id);
  CREATE INDEX IF NOT EXISTS idx_contrato_itens_contrato ON contrato_itens(contrato_id);
  CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_pedido_itens_pedido ON pedido_itens(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_nfs_cliente ON notas_fiscais(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_nfs_status ON notas_fiscais(status);
  CREATE INDEX IF NOT EXISTS idx_nfs_pedido ON notas_fiscais(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_pedido_boletos_pedido ON pedido_boletos(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_pedido_historico_pedido ON pedido_historico(pedido_id);
  CREATE INDEX IF NOT EXISTS idx_pedido_arquivos_pedido ON pedido_arquivos(pedido_id);
`;

// Migrations incrementais (idempotentes via try/catch em "duplicate column")
function migrate() {
  const alters = [
    // Sprint 4: campos novos no pedido
    "ALTER TABLE pedidos ADD COLUMN previsao_publicacao TEXT",
    "ALTER TABLE pedidos ADD COLUMN pdf_publicacao_path TEXT",
    "ALTER TABLE pedidos ADD COLUMN data_publicacao_recebida TEXT",
    "ALTER TABLE pedidos ADD COLUMN data_envio_pdf_cliente TEXT",
    "ALTER TABLE pedidos ADD COLUMN data_aprovacao_faturamento TEXT",
    "ALTER TABLE pedidos ADD COLUMN aprovado_por_id INTEGER REFERENCES users(id)",
    "ALTER TABLE pedidos ADD COLUMN cm_faturado REAL DEFAULT 0",
    "ALTER TABLE pedidos ADD COLUMN observacoes_internas TEXT",
    "ALTER TABLE pedidos ADD COLUMN categoria_publicacao TEXT",
    // Sprint 5: campos detalhados do fluxo operacional
    "ALTER TABLE pedidos ADD COLUMN canal_recebimento TEXT",
    "ALTER TABLE pedidos ADD COLUMN veiculos_solicitados TEXT",
    "ALTER TABLE pedidos ADD COLUMN arquivo_word_path TEXT",
    "ALTER TABLE pedidos ADD COLUMN pasta_cliente_path TEXT",
    "ALTER TABLE pedidos ADD COLUMN formatado_dou INTEGER DEFAULT 0",
    "ALTER TABLE pedidos ADD COLUMN formatado_doe INTEGER DEFAULT 0",
    "ALTER TABLE pedidos ADD COLUMN formatado_jornal INTEGER DEFAULT 0",
    "ALTER TABLE pedidos ADD COLUMN revisao_ortografica INTEGER DEFAULT 0",
    "ALTER TABLE pedidos ADD COLUMN previsao_envio TEXT",
    "ALTER TABLE pedidos ADD COLUMN janela_envio TEXT",
    "ALTER TABLE pedidos ADD COLUMN data_download_pdf TEXT",
    "ALTER TABLE pedidos ADD COLUMN confirmacao_cliente_em TEXT",
    "ALTER TABLE pedidos ADD COLUMN observacoes_preparacao TEXT",
    "ALTER TABLE pedidos ADD COLUMN arquivo_word_recebido_em TEXT",
    "ALTER TABLE pedidos ADD COLUMN cliente_contato TEXT",
    // Sprint 7: refatoracao dos campos do cliente_contato
    "ALTER TABLE pedidos ADD COLUMN cliente_contato_nome TEXT",
    "ALTER TABLE pedidos ADD COLUMN cliente_contato_telefone TEXT",
    "ALTER TABLE pedidos ADD COLUMN cliente_contato_email TEXT",
    "ALTER TABLE pedidos ADD COLUMN veiculo_unico TEXT",  // dou | doe | jornal (radio, nao mais checkboxes multiplos)
    "ALTER TABLE pedidos ADD COLUMN processado_em TEXT",
    "ALTER TABLE pedidos ADD COLUMN qtd_correcoes INTEGER DEFAULT 0",
    "ALTER TABLE pedidos ADD COLUMN preview_revisao TEXT",  // JSON com antes/depois
  ];
  for (const sql of alters) {
    try { db.exec(sql); } catch (e) { /* coluna já existe, ignora */ }
  }
}

// Cria as tabelas (idempotente) e roda migrations incrementais
function ensureSchema() {
  db.exec(SCHEMA_SQL);
  migrate();
  migrateRolesParaDois();
}

// Sprint 8: reduz 7 papéis para 2 (admin e user)
function migrateRolesParaDois() {
  // Detecta se ainda tem os 7 papéis antigos
  const checkRow = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'").get();
  if (!checkRow) return;
  const sql = checkRow.sql || '';
  if (sql.includes("'atendimento'") || sql.includes("'user'")) {
    // Se tem 'user' novo, já migrou. Se tem 'atendimento', ainda é antigo.
    if (sql.includes("'atendimento'")) {
      // desabilitar FK pq outras tabelas referenciam users(id)
      db.pragma('foreign_keys = OFF');
      try {
        db.exec(`
          DROP TABLE IF EXISTS users_new;
          CREATE TABLE users_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            nome TEXT NOT NULL,
            senha_hash TEXT NOT NULL,
            papel TEXT NOT NULL CHECK(papel IN ('admin','user')),
            ativo INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
          INSERT INTO users_new (id, email, nome, senha_hash, papel, ativo, created_at)
            SELECT id, email, nome, senha_hash,
              CASE WHEN papel = 'admin' THEN 'admin' ELSE 'user' END,
              ativo, created_at
            FROM users;
          DROP TABLE users;
          ALTER TABLE users_new RENAME TO users;
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        `);
        console.log('[publi-legal/api] migrado: 7 papéis -> 2 (admin, user)');
      } finally {
        db.pragma('foreign_keys = ON');
      }
    }
  }
}
ensureSchema();

// =================== HELPERS ===================
// Status do kanban (13 etapas)
export const STATUS_PEDIDO = [
  { id: 'solicitada', label: 'Solicitada', emoji: '📥', cor: 'bg-slate-100 text-slate-700 border-slate-300' },
  { id: 'em_preparacao', label: 'Em preparação', emoji: '📋', cor: 'bg-blue-100 text-blue-700 border-blue-300' },
  { id: 'aguardando_envio', label: 'Aguardando envio', emoji: '⏳', cor: 'bg-amber-100 text-amber-700 border-amber-300' },
  { id: 'enviada', label: 'Enviada', emoji: '📤', cor: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
  { id: 'cust_pgtos', label: 'Custos operacionais', emoji: '💳', cor: 'bg-orange-100 text-orange-700 border-orange-300' },
  { id: 'aguardando_publicacao', label: 'Aguardando publicação', emoji: '📰', cor: 'bg-purple-100 text-purple-700 border-purple-300' },
  { id: 'publicacao_recebida', label: 'Publicação recebida', emoji: '📄', cor: 'bg-teal-100 text-teal-700 border-teal-300' },
  { id: 'cliente_atendido', label: 'Cliente atendido', emoji: '📲', cor: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { id: 'aprovacao_faturamento', label: 'Aprovação faturamento', emoji: '👩‍💼', cor: 'bg-pink-100 text-pink-700 border-pink-300' },
  { id: 'aguardando_nf', label: 'Aguardando NF', emoji: '🧾', cor: 'bg-rose-100 text-rose-700 border-rose-300' },
  { id: 'nf_emitida', label: 'NF emitida', emoji: '💰', cor: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { id: 'aguardando_pagamento', label: 'Aguardando pgto', emoji: '💵', cor: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
  { id: 'recebido', label: 'Recebido', emoji: '✅', cor: 'bg-green-200 text-green-800 border-green-400' },
];

export const STATUS_BY_ID = Object.fromEntries(STATUS_PEDIDO.map((s) => [s.id, s]));

export { ensureSchema };

export default db;
