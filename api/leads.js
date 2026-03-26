import { getPool, setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto'; // Para gerar a digital

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    try {
        const pool = getPool();
        const token = parseAuthHeader(req.headers['authorization']);
        if (!token) return res.status(401).json({ error: 'Não autorizado' });

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const companyId = decoded.company_id;

        if (req.method === 'GET') {
            const result = await pool.query(
                `SELECT * FROM leads WHERE company_id = $1 ORDER BY created_at DESC`,
                [companyId]
            );
            return res.status(200).json({ success: true, leads: result.rows });
        }

        if (req.method === 'POST') {
            const { name, phone, email, interesse } = req.body;

            // GERADOR DE DIGITAL DA EMPRESA (Assinatura Única)
            // Criamos um código baseado nos dados da empresa proprietária
            const rawSignature = `${decoded.name}-${decoded.company_id}-SOUZA-PRODUCOES`;
            const signatureKey = crypto.createHash('md5').update(rawSignature).digest('hex').toUpperCase().substring(0, 12);

            const result = await pool.query(
                `INSERT INTO leads (company_id, name, phone, email, status, interesse, signature_key, source)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
                [companyId, name, phone, email || null, 'novo', interesse || null, signatureKey, 'api']
            );

            return res.status(201).json({ success: true, lead: result.rows[0] });
        }

        if (req.method === 'PATCH') {
            const { id, status, name, interesse } = req.body;
            await pool.query(
                `UPDATE leads SET status = COALESCE($1, status), name = COALESCE($2, name), interesse = COALESCE($3, interesse), updated_at = NOW() 
                 WHERE id = $4 AND company_id = $5`,
                [status, name, interesse, id, companyId]
            );
            return res.status(200).json({ success: true });
        }

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
