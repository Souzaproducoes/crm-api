import { getPool, setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        const token = parseAuthHeader(req.headers['authorization']);
        if (!token) return res.status(401).json({ error: 'Não autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const companyId = decoded.company_id;

        // Busca apenas os dados DESTA empresa
        const leads = await pool.query('SELECT * FROM leads WHERE company_id = $1', [companyId]);
        const messages = await pool.query('SELECT * FROM messages WHERE company_id = $1', [companyId]);

        return res.status(200).json({
            empresa: decoded.name,
            exportado_em: new Date().toISOString(),
            leads: leads.rows,
            historico_mensagens: messages.rows
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
