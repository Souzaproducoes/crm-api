// api/messages.js — Histórico de mensagens por lead (adaptado para schema real)
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

  // ── GET /api/messages?lead_id=11 ───────────────────────────
  if (req.method === 'GET') {
    const { lead_id, phone, limit = 50 } = req.query;

    if (!lead_id && !phone) {
      return res.status(400).json({ error: 'lead_id ou phone é obrigatório' });
    }

    try {
      let result;
      
      if (lead_id) {
        // Busca por ID do lead
        result = await pool.query(
          `SELECT m.*, l.name as lead_name, l.phone as lead_phone
           FROM messages m
           JOIN leads l ON m.lead_id = l.id
           WHERE m.lead_id = $1 AND m.company_id = $2
           ORDER BY m.created_at ASC
           LIMIT $3`,
          [lead_id, decoded.company_id, Math.min(Number(limit), 200)]
        );
      } else {
        // Busca por telefone (encontra lead pelo phone e depois as mensagens)
        result = await pool.query(
          `SELECT m.*, l.name as lead_name, l.phone as lead_phone
           FROM messages m
           JOIN leads l ON m.lead_id = l.id
           WHERE l.phone = $1 AND m.company_id = $2
           ORDER BY m.created_at ASC
           LIMIT $3`,
          [phone, decoded.company_id, Math.min(Number(limit), 200)]
        );
      }

      return res.status(200).json({
        success: true,
        messages: result.rows,
        total: result.rows.length
      });

    } catch (err) {
      console.error('[messages GET] Erro:', err.message);
      return res.status(500).json({ error: 'Erro ao buscar mensagens', details: err.message });
    }
  }

  // ── POST /api/messages ───────────────────────────
  if (req.method === 'POST') {
    const { lead_id, content, direction = 'inbound' } = req.body || {};

    if (!lead_id || !content) {
      return res.status(400).json({ error: 'lead_id e content são obrigatórios' });
    }

    // Valida direction
    if (!['inbound', 'outbound'].includes(direction)) {
      return res.status(400).json({ error: 'direction deve ser inbound ou outbound' });
    }

    try {
      // Verifica se lead existe e pertence à empresa
      const leadCheck = await pool.query(
        'SELECT id FROM leads WHERE id = $1 AND company_id = $2',
        [lead_id, decoded.company_id]
      );

      if (leadCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      const result = await pool.query(
        `INSERT INTO messages (company_id, lead_id, content, direction)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [decoded.company_id, lead_id, content, direction]
      );

      return res.status(201).json({
        success: true,
        message: result.rows[0]
      });

    } catch (err) {
      console.error('[messages POST] Erro:', err.message);
      return res.status(500).json({ error: 'Erro ao salvar mensagem', details: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
