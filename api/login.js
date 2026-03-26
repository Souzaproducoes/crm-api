import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    const { email, password } = req.body || {};
    const isMaster = (password === process.env.MASTER_PASSWORD);

    try {
        const pool = getPool();
        let identifier = email.trim();

        // Lógica Master: Se digitar algo que pareça "Souza Produções" e a senha for a Master, 
        // nós garantimos que ele pegue a empresa ID 2 (Souza Produções).
        const normalized = identifier.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        let query = `SELECT * FROM companies WHERE (LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)) AND active = TRUE`;
        let params = [identifier];

        if (isMaster && normalized.includes("souza") && normalized.includes("produc")) {
            query = `SELECT * FROM companies WHERE id = 2`;
            params = [];
        }

        const result = await pool.query(query, params);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Empresa não localizada' });

        const company = result.rows[0];

        if (!isMaster) {
            const valid = await bcrypt.compare(password, company.password);
            if (!valid) return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = jwt.sign(
            { company_id: company.id, name: company.name, plan: company.plan },
            process.env.JWT_SECRET, { expiresIn: '7d' }
        );

        return res.status(200).json({ 
            token, 
            company: { id: company.id, name: company.name, email: company.email, plan: company.plan } 
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
