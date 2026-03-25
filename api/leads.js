// api/leads.js
import { getPool, setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  try {
    const pool = getPool();
    
    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }

    const companyId = decoded.company_id;

    // GET - Listar leads
    if (req.method === 'GET') {
      const result = await pool.query(
        `SELECT id, company_id, user_id, status, interesse, canal, criado_em 
         FROM leads WHERE company_id = $1 ORDER BY criado_em DESC`,
        [companyId]
      );
      return res.status(200).json({ 
        success: true, 
        leads: result.rows, 
        total: result.rows.length 
      });
    }

    // POST - Criar lead
    if (req.method === 'POST') {
      const { user_id, status, interesse, canal } = req.body || {};

      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'user_id é obrigatório' 
        });
      }

      const result = await pool.query(
        `INSERT INTO leads (company_id, user_id, status, interesse, canal)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (company_id, user_id) 
         DO UPDATE SET status = EXCLUDED.status, interesse = EXCLUDED.interesse
         RETURNING *`,
        [companyId, user_id, status || 'novo', interesse || null, canal || 'whatsapp']
      );

      return res.status(201).json({
        success: true,
        lead: result.rows[0]
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    console.error('[leads] Erro:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
