import { getPool, setCors, handleOptions } from './lib/helpers.js';
import crypto from 'crypto';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST' });

    const { id } = req.query; // ID da empresa vindo na URL
    const { name, phone, email, interesse } = req.body;

    if (!id || !name || !phone) {
        return res.status(400).json({ error: 'ID da empresa, nome e telefone são obrigatórios' });
    }

    try {
        const pool = getPool();

        // Gerar Assinatura Digital SP
        const rawSignature = `${name}-${id}-SOUZA`;
        const signatureKey = crypto.createHash('md5').update(rawSignature).digest('hex').toUpperCase().substring(0, 10);

        const result = await pool.query(
            `INSERT INTO leads (company_id, name, phone, email, status, interesse, signature_key, source)
             VALUES ($1, $2, $3, $4, 'novo', $5, $6, 'webhook') RETURNING *`,
            [id, name, phone, email || null, interesse || 'Vindo via Webhook', signatureKey]
        );

        return res.status(201).json({ success: true, lead: result.rows[0] });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
