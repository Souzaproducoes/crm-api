import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        
        // 1. Busca a estrutura das tabelas (Schema)
        const schema = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
        `);

        // 2. Busca todas as empresas
        const companies = await pool.query('SELECT * FROM companies');

        // 3. Busca os últimos 5 leads de cada empresa
        const leads = await pool.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 10');

        // Organiza os dados para facilitar a leitura
        const structure = {};
        schema.rows.forEach(row => {
            if (!structure[row.table_name]) structure[row.table_name] = [];
            structure[row.table_name].push(`${row.column_name} (${row.data_type})`);
        });

        return res.status(200).json({
            mensagem: "Inspeção Completa do Banco de Dados",
            estrutura_das_tabelas: structure,
            dados_companies: companies.rows,
            amostra_leads: leads.rows
        });

    } catch (err) {
        return res.status(500).json({ 
            erro: "Falha na inspeção", 
            detalhes: err.message 
        });
    }
}
