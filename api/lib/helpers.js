import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    const { companyName, email, password, phone, industry } = req.body || {};

    if (!companyName || !email || !password) {
        return res.status(400).json({ success: false, error: 'Campos obrigatórios faltando' });
    }

    try {
        const pool = getPool();
        const emailExists = await pool.query('SELECT id FROM companies WHERE email = $1', [email.toLowerCase().trim()]);

        if (emailExists.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'Email já cadastrado' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const result = await pool.query(
            `INSERT INTO companies (name, slug, email, phone, password, plan, industry, active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, email`,
            [companyName, slug, email.toLowerCase().trim(), phone || null, passwordHash, 'free', industry || 'Outro', true]
        );

        return res.status(201).json({ success: true, company: result.rows[0] });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, error: err.message });
    }
}
