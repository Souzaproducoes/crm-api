// ============================================================
// API REGISTER - ISIS AI AGENT CRM
// ============================================================

import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from '../lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { 
        companyName, 
        email, 
        password, 
        phone, 
        industry,
        plan = 'free'
    } = req.body || {};

    // Validações
    if (!companyName || !email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Nome da empresa, email e senha são obrigatórios'
        });
    }

    if (password.length < 6) {
        return res.status(400).json({
            success: false,
            error: 'A senha deve ter no mínimo 6 caracteres'
        });
    }

    try {
        const pool = getPool();

        // Verificar se email já existe
        const emailExists = await pool.query(
            'SELECT id FROM companies WHERE email = $1',
            [email.toLowerCase().trim()]
        );

        if (emailExists.rows.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Este email já está cadastrado'
            });
        }

        // Hash da senha
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Criar slug único
        const slug = companyName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Inserir empresa
        const result = await pool.query(
            `INSERT INTO companies (
                name, slug, email, phone, password, plan, industry, 
                trial_ends_at, active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, name, email, plan, created_at`,
            [
                companyName,
                slug,
                email.toLowerCase().trim(),
                phone || null,
                passwordHash,
                plan,
                industry || null,
                new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 dias trial
                true
            ]
        );

        const company = result.rows[0];

        // Criar pipeline padrão para a nova empresa
        await pool.query(
            `INSERT INTO pipeline_stages (company_id, name, order_index, color, probability)
             VALUES 
                ($1, 'Novo Lead', 1, '#3B82F6', 10),
                ($1, 'Contato Inicial', 2, '#8B5CF6', 25),
                ($1, 'Qualificado', 3, '#10B981', 50),
                ($1, 'Proposta', 4, '#F59E0B', 75),
                ($1, 'Negociação', 5, '#EF4444', 90),
                ($1, 'Fechado', 6, '#059669', 100)`,
            [company.id]
        );

        return res.status(201).json({
            success: true,
            message: 'Empresa cadastrada com sucesso!',
            company: {
                id: company.id,
                name: company.name,
                email: company.email,
                plan: company.plan
            }
        });

    } catch (err) {
        console.error('[register] Erro:', err.message);
        return res.status(500).json({
            success: false,
            error: 'Erro interno do servidor'
        });
    }
}