// ============================================================
// API LEADS - CRUD Completo
// ============================================================

import { getPool, setCors, handleOptions, parseAuthHeader } from '../lib/helpers.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        const authHeader = req.headers['authorization'];
        const token = parseAuthHeader(authHeader);

        // Verificar autenticação para todas as rotas
        let companyId = null;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                companyId = decoded.company_id;
            } catch (err) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Token inválido' 
                });
            }
        }

        // GET - Listar leads
        if (req.method === 'GET') {
            const result = await pool.query(
                `SELECT id, name, email, phone, company_name, job_title, 
                        industry, source, status, priority, lead_score,
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

        // POST - Criar lead
        if (req.method === 'POST') {
            const { 
                name, email, phone, company_name, job_title, 
                industry, source, status, priority, notes 
            } = req.body || {};

            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome é obrigatório'
                });
            }

            const result = await pool.query(
                `INSERT INTO leads (
                    company_id, name, email, phone, company_name, job_title,
                    industry, source, status, priority, notes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                RETURNING *`,
                [
                    companyId, name, email || null, phone || null,
                    company_name || null, job_title || null,
                    industry || null, source || 'manual',
                    status || 'new', priority || 'medium', notes || null
                ]
            );

            return res.status(201).json({
                success: true,
                lead: result.rows[0],
                message: 'Lead criado com sucesso'
            });
        }

        // PATCH - Atualizar lead
        if (req.method === 'PATCH') {
            const { id, status, priority, notes, owner_id } = req.body || {};

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do lead é obrigatório'
                });
            }

            const updates = [];
            const values = [];
            let paramIndex = 1;

            if (status) {
                updates.push(`status = $${paramIndex++}`);
                values.push(status);
            }
            if (priority) {
                updates.push(`priority = $${paramIndex++}`);
                values.push(priority);
            }
            if (notes !== undefined) {
                updates.push(`notes = $${paramIndex++}`);
                values.push(notes);
            }
            if (owner_id) {
                updates.push(`owner_id = $${paramIndex++}`);
                values.push(owner_id);
            }

            if (updates.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Nenhum campo para atualizar'
                });
            }

            values.push(companyId);
            values.push(id);

            const result = await pool.query(
                `UPDATE leads 
                 SET ${updates.join(', ')}, updated_at = NOW()
                 WHERE company_id = $${paramIndex++} AND id = $${paramIndex}
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

        // DELETE - Deletar lead
        if (req.method === 'DELETE') {
            const { id } = req.body || {};

            if (!id) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do lead é obrigatório'
                });
            }

            const result = await pool.query(
                `DELETE FROM leads 
                 WHERE company_id = $1 AND id = $2 
                 RETURNING *`,
                [companyId, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Lead não encontrado'
                });
            }

            return res.status(200).json({
                success: true,
                message: 'Lead deletado com sucesso'
            });
        }

        return res.status(405).json({ error: 'Método não permitido' });

    } catch (err) {
        console.error('[leads] Erro:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
}