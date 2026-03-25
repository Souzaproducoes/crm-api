// ============================================================
// API REGISTER - ISIS AI AGENT CRM (VERSÃO CORRIGIDA)
// ============================================================

import bcrypt from 'bcryptjs';
// Ajuste de caminho: se estiver dentro de /api/, use ./lib/
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    // 1. Configura CORS imediatamente
    setCors(req, res);
    
    // 2. Trata a requisição OPTIONS (Preflight do navegador)
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

    // Validações básicas
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

        // Criar slug (URL amigável)
        const slug = companyName
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');

        // Inserir empresa 
        // OBS: Certifique-se que essas colunas existem no seu Postgres!
        const result = await pool.query(
            `INSERT INTO companies (
                name, slug, email, phone, password, plan, industry, active
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING id, name, email, plan`,
            [
                companyName,
                slug,
                email.toLowerCase().trim(),
                phone || null,
                passwordHash,
                plan,
                industry || 'Outro',
                true
            ]
        );

        const company = result.rows[0];

        // Criar pipeline padrão (ignora erro se a tabela pipeline_stages não existir ainda)
        try {
            await pool.query(
                `INSERT INTO pipeline_stages (company_id, name, order_index, color, probability)
                 VALUES 
                    ($1, 'Novo Lead', 1, '#3B82F6', 10),
                    ($1, 'Contato Inicial', 2, '#8B5CF6', 25),
                    ($1, 'Qualificado', 3, '#10B981', 50),
                    ($1, 'Fechado', 6, '#059669', 100)`,
                [company.id]
            );
        } catch (e) {
            console.warn('Aviso: Não foi possível criar pipeline padrão:', e.message);
        }

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
        console.error('[register] Erro detalhado:', err);
        return res.status(500).json({
            success: false,
            error: 'Erro no servidor: ' + err.message
        });
    }
}
