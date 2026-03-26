import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        
        // Busca tudo das 3 tabelas principais
        const companies = await pool.query('SELECT id, name, email, plan, active FROM companies');
        const leads = await pool.query('SELECT * FROM leads');
        const messages = await pool.query('SELECT * FROM messages LIMIT 50');

        return res.status(200).json({
            status: "Conectado ao Banco",
            total_empresas: companies.rowCount,
            empresas: companies.rows,
            total_leads: leads.rowCount,
            leads: leads.rows,
            mensagens_recentes: messages.rows
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
