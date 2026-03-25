// api/messages.js — Histórico de mensagens por lead
import { getPool, setCors, handleOptions, verifyToken } from './lib/helpers.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  let decoded;
  try {
    decoded = verifyToken(req);
  } catch {
    return res.status(401).json({ error: 'Não autorizado' });
  }

  const pool = getPool();

  // ── GET /api/messages?user_id=XXX ───────────────────────────
  if (req.method === 'GET') {
    const { user_id, limit = 50 } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'user_id é obrigatório' });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM messages
         WHERE company_id = $1 AND user_id = $2
         ORDER BY criado_em ASC
         LIMIT $3`,
        [decoded.company_id, user_id, Math.min(Number(limit), 200)]
      );

      return res.status(200).json(result.rows);

    } catch (err) {
      console.error('[messages GET] Erro:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar mensagens' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
