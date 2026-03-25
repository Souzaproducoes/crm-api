// ============================================================
// API LOGOUT - ISIS AI AGENT CRM
// ============================================================

import { setCors, handleOptions } from '../lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // Logout é feito no frontend (limpar localStorage)
    // Aqui apenas retornamos sucesso

    return res.status(200).json({
        success: true,
        message: 'Logout realizado com sucesso'
    });
}