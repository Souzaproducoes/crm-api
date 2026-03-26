import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Dados incompletos' });

    try {
        const pool = getPool();
        let identifier = email.trim();
        const isMasterPassword = (password === process.env.MASTER_PASSWORD);

        // --- LÓGICA DE BYPASS ULTRA-FLEXÍVEL PARA O PROPRIETÁRIO ---
        // Remove acentos e converte para minúsculo para comparar sem erro
        const normalized = identifier.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        if ((normalized.includes("souza") && normalized.includes("produc")) && isMasterPassword) {
            // Se você digitou algo parecido com Souza Producoes e a senha master, 
            // forçamos o seu e-mail oficial para entrar direto.
            identifier = "vfhomevideo@msn.com";
        }

        const result = await pool.query(
            `SELECT id, name, email, password, plan 
             FROM companies 
             WHERE (LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)) 
             AND active = TRUE`,
            [identifier]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Acesso negado: Empresa ou E-mail não localizado' });
        }

        const company = result.rows[0];

        if (!isMasterPassword) {
            const senhaValida = await bcrypt.compare(password, company.password);
            if (!senhaValida) {
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }
        }

        const token = jwt.sign(
            { company_id: company.id, name: company.name, plan: company.plan },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.status(200).json({
            token,
            company: {
                id: company.id,
                name: company.name,
                email: company.email,
                plan: company.plan,
            },
        });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Erro interno no servidor' });
    }
}
