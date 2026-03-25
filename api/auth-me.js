// ============================================================
// API AUTH-ME - Validar Token e Retornar Dados
// ============================================================

import jwt from 'jsonwebtoken';
import { getPool, setCors, handleOptions, parseAuthHeader } from '../lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const authHeader = req.headers['authorization'];
        const token = parseAuthHeader(authHeader);

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token não fornecido'
            });
        }

        // Verificar token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Buscar dados atualizados da empresa
        const pool = getPool();
        const result = await pool.query(
            `SELECT id, name, email, plan, industry, active, 
                    trial_ends_at, subscription_ends_at, created_at
             FROM companies 
             WHERE id = $1 AND active = TRUE`,
            [decoded.company_id]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Empresa não encontrada ou inativa'
            });
        }

        const company = result.rows[0];

        return res.status(200).json({
            success: true,
            company: {
                id: company.id,
                name: company.name,
                email: company.email,
                plan: company.plan,
                industry: company.industry,
                trial_ends_at: company.trial_ends_at,
                subscription_ends_at: company.subscription_ends_at
            }
        });

    } catch (err) {
        console.error('[auth-me] Erro:', err.message);
        
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                error: 'Token expirado'
            });
        }

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                error: 'Token inválido'
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
}