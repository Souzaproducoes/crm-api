// api/leads.js — Gerenciamento completo de leads (adaptado para schema real)
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
        `SELECT id, company_id, name, phone, whatsapp, email, status, interesse, 
                source, priority, company_name, job_title, industry, city, state,
                created_at, updated_at
         FROM leads 
         WHERE company_id = $1 
         ORDER BY created_at DESC`,
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
      const { phone, whatsapp, name, email, status, interesse, source, 
              company_name, job_title, industry, city, state, priority } = req.body || {};

      const phoneNumber = phone || whatsapp;
      
      if (!phoneNumber) {
        return res.status(400).json({ 
          success: false,
          error: 'phone ou whatsapp é obrigatório' 
        });
      }

      const leadName = name || `Lead ${phoneNumber.slice(-4)}`;

      const result = await pool.query(
        `INSERT INTO leads (company_id, phone, whatsapp, name, email, status, 
                          interesse, source, company_name, job_title, industry, 
                          city, state, priority)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         ON CONFLICT (company_id, phone) 
         DO UPDATE SET 
           name = EXCLUDED.name,
           whatsapp = EXCLUDED.whatsapp,
           email = EXCLUDED.email,
           status = EXCLUDED.status, 
           interesse = EXCLUDED.interesse,
           source = EXCLUDED.source,
           company_name = EXCLUDED.company_name,
           job_title = EXCLUDED.job_title,
           industry = EXCLUDED.industry,
           city = EXCLUDED.city,
           state = EXCLUDED.state,
           priority = EXCLUDED.priority,
           updated_at = NOW()
         RETURNING *`,
        [
          companyId, 
          phoneNumber, 
          whatsapp || phoneNumber, 
          leadName, 
          email || null,
          status || 'novo', 
          interesse || null, 
          source || 'whatsapp',
          company_name || null,
          job_title || null,
          industry || null,
          city || null,
          state || null,
          priority || 'medium'
        ]
      );

      return res.status(201).json({
        success: true,
        lead: result.rows[0]
      });
    }

    // PATCH - Atualizar lead
    if (req.method === 'PATCH') {
      const { phone, whatsapp, ...fields } = req.body || {};
      
      const phoneNumber = phone || whatsapp;
      if (!phoneNumber) {
        return res.status(400).json({ error: 'phone ou whatsapp é obrigatório' });
      }

      const updates = [];
      const values = [];
      let paramCount = 1;

      const allowedFields = [
        'name', 'email', 'status', 'interesse', 'source', 'priority',
        'company_name', 'job_title', 'industry', 'city', 'state', 'whatsapp'
      ];

      for (const [key, value] of Object.entries(fields)) {
        if (allowedFields.includes(key) && value !== undefined) {
          updates.push(`${key} = $${paramCount++}`);
          values.push(value);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      }

      values.push(companyId, phoneNumber);

      const result = await pool.query(
        `UPDATE leads 
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE company_id = $${paramCount++} AND phone = $${paramCount}
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

    // DELETE - Remover lead
    if (req.method === 'DELETE') {
      const { phone, whatsapp } = req.body || {};
      const phoneNumber = phone || whatsapp;
      
      if (!phoneNumber) {
        return res.status(400).json({ error: 'phone ou whatsapp é obrigatório' });
      }

      const result = await pool.query(
        `DELETE FROM leads 
         WHERE company_id = $1 AND phone = $2
         RETURNING *`,
        [companyId, phoneNumber]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      return res.status(200).json({
        success: true,
        message: 'Lead removido com sucesso'
      });
    }

    return res.status(405).json({ error: 'Método não permitido' });

  } catch (err) {
    console.error('[leads] Erro:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor', details: err.message });
  }
}
