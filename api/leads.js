// api/leads.js — Gerenciamento completo de leads com nome
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
        `SELECT id, company_id, user_id, name, status, interesse, canal, criado_em, atualizado_em
         FROM leads 
         WHERE company_id = $1 
         ORDER BY criado_em DESC`,
        [companyId]
      );
      return res.status(200).json({ 
        success: true, 
        leads: result.rows, 
        total: result.rows.length 
      });
    }

    // POST - Criar ou atualizar lead
    if (req.method === 'POST') {
      const { user_id, name, status, interesse, canal } = req.body || {};

      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'user_id (telefone/email) é obrigatório' 
        });
      }

      // Se não informar nome, usa parte do user_id
      const leadName = name || `Lead ${user_id.slice(-4)}`;

      const result = await pool.query(
        `INSERT INTO leads (company_id, user_id, name, status, interesse, canal)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (company_id, user_id) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           status = EXCLUDED.status, 
           interesse = EXCLUDED.interesse,
           canal = EXCLUDED.canal,
           atualizado_em = NOW()
         RETURNING *`,
        [companyId, user_id, leadName, status || 'novo', interesse || null, canal || 'whatsapp']
      );

      return res.status(201).json({
        success: true,
        lead: result.rows[0]
      });
    }

    // PATCH - Atualizar status/nome especificamente
    if (req.method === 'PATCH') {
      const { user_id, name, status, interesse } = req.body || {};
      
      if (!user_id) {
        return res.status(400).json({ error: 'user_id é obrigatório' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`);
        values.push(name);
      }
      
      if (status !== undefined) {
        updates.push(`status = $${paramCount++}`);
        values.push(status);
      }

      if (interesse !== undefined) {
        updates.push(`interesse = $${paramCount++}`);
        values.push(interesse);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo para atualizar' });
      }

      values.push(companyId, user_id);

      const result = await pool.query(
        `UPDATE leads 
         SET ${updates.join(', ')}, atualizado_em = NOW()
         WHERE company_id = $${paramCount++} AND user_id = $${paramCount}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      return res.status(200).json({
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
