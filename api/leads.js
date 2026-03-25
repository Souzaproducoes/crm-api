// ============================================================
// API LEADS - CRUD Completo para CRM SaaS
// ============================================================

import { getPool, setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  try {
    const pool = getPool();
    
    // Verificar autenticação
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

    // ============================================================
    // GET - Listar leads da empresa
    // ============================================================
    if (req.method === 'GET') {
      const result = await pool.query(
        `SELECT id, company_id, user_id, status, interesse, 
                ultima_mensagem, canal, criado_em, atualizado_em
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

    // ============================================================
    // POST - Criar novo lead
    // ============================================================
    if (req.method === 'POST') {
      const { user_id, status, interesse, canal, ultima_mensagem } = req.body || {};

      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'user_id (telefone/identificador) é obrigatório' 
        });
      }

      const result = await pool.query(
        `INSERT INTO leads (
          company_id, user_id, status, interesse, canal, ultima_mensagem
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (company_id, user_id) 
        DO UPDATE SET 
          status = EXCLUDED.status,
          interesse = EXCLUDED.interesse,
          canal = EXCLUDED.canal,
          ultima_mensagem = EXCLUDED.ultima_mensagem,
          atualizado_em = NOW()
        RETURNING *`,
        [
          companyId,
          user_id,
          status || 'novo',
          interesse || null,
          canal || 'whatsapp',
          ultima_mensagem || null
        ]
      );

      return res.status(201).json({
        success: true,
        lead: result.rows[0],
        message: 'Lead criado/atualizado com sucesso'
      });
    }

    // ============================================================
    // PATCH - Atualizar status ou dados do lead
    // ============================================================
    if (req.method === 'PATCH') {
      const { user_id, status, interesse, ultima_mensagem } = req.body || {};

      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'user_id é obrigatório para atualização' 
        });
      }

      // Construir query dinâmica apenas para campos fornecidos
      const updates = [];
      const values = [companyId];
      let paramIndex = 2;

      if (status) {
        updates.push(`status = $${paramIndex++}`);
        values.push(status);
      }
      if (interesse !== undefined) {
        updates.push(`interesse = $${paramIndex++}`);
        values.push(interesse);
      }
      if (ultima_mensagem !== undefined) {
        updates.push(`ultima_mensagem = $${paramIndex++}`);
        values.push(ultima_mensagem);
      }

      if (updates.length === 0) {
        return res.status(400).json({ 
          success: false,
          error: 'Nenhum campo para atualizar' 
        });
      }

      updates.push(`atualizado_em = NOW()`);
      values.push(user_id);

      const result = await pool.query(
        `UPDATE leads 
         SET ${updates.join(', ')}
         WHERE company_id = $1 AND user_id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Lead não encontrado' 
        });
      }

      return res.status(200).json({
        success: true,
        lead: result.rows[0],
        message: 'Lead atualizado com sucesso'
      });
    }

    // ============================================================
    // DELETE - Remover lead
    // ============================================================
    if (req.method === 'DELETE') {
      const { user_id } = req.body || {};

      if (!user_id) {
        return res.status(400).json({ 
          success: false,
          error: 'user_id é obrigatório para exclusão' 
        });
      }

      const result = await pool.query(
        `DELETE FROM leads 
         WHERE company_id = $1 AND user_id = $2 
         RETURNING *`,
        [companyId, user_id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ 
          success: false,
          error: 'Lead não encontrado' 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Lead removido com sucesso'
      });
    }

    // Método não permitido
    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    console.error('[leads] Erro:', err.message);
    return res.status(500).json({ 
      success: false,
      error: 'Erro interno do servidor' 
    });
  }
}
