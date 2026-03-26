import { getPool, setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        const token = parseAuthHeader(req.headers['authorization']);
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        const leads = await pool.query('SELECT name, phone, email, status, interesse, created_at FROM leads WHERE company_id = $1', [decoded.company_id]);

        return res.status(200).json({
            empresa: decoded.name,
            leads: leads.rows
        });
    } catch (err) {
        return res.status(401).json({ error: 'Sessão expirada' });
    }
}
