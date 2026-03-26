import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { email, password } = req.body || {};
    try {
        const pool = getPool();
        let identifier = email.trim();
        const isMaster = (password === process.env.MASTER_PASSWORD);

        // Bypass Souza Produções (ignora erros de acento ou digitação no banco)
        const normalized = identifier.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (isMaster && normalized.includes("souza")) {
            identifier = "vfshomevideo@msn.com"; 
        }

        const result = await pool.query(
            `SELECT id, name, email, password, plan FROM companies 
             WHERE (LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)) AND active = TRUE`,
            [identifier]
        );

        if (result.rows.length === 0) return res.status(401).json({ error: 'Empresa não localizada' });
        const company = result.rows[0];

        if (!isMaster) {
            const valid = await bcrypt.compare(password, company.password);
            if (!valid) return res.status(401).json({ error: 'Senha incorreta' });
        }

        const token = jwt.sign(
            { company_id: company.id, name: company.name, plan: company.plan },
            process.env.JWT_SECRET, { expiresIn: '7d' }
        );

        return res.status(200).json({ token, company: { id: company.id, name: company.name, email: company.email, plan: company.plan } });
    } catch (err) {
        return res.status(500).json({ error: 'Erro interno' });
    }
}
