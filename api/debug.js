import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        
        const companies = await pool.query('SELECT * FROM companies ORDER BY id ASC');
        const leads = await pool.query('SELECT * FROM leads ORDER BY created_at DESC');
        const messages = await pool.query('SELECT * FROM messages ORDER BY created_at DESC LIMIT 100');

        return res.status(200).json({
            status: "Conectado",
            total_empresas: companies.rowCount,
            empresas: companies.rows,
            total_leads: leads.rowCount,
            leads: leads.rows,
            total_mensagens: messages.rowCount,
            mensagens_recentes: messages.rows
        });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
