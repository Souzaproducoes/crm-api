import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: 'Identificador e senha são obrigatórios' });
  }

  try {
    const pool = getPool();
    const identifier = email.trim();

    // 1. BUSCA A EMPRESA PELO NOME OU PELO E-MAIL
    // Isso permite que você digite "Souza Produções" no campo de e-mail
    const result = await pool.query(
      `SELECT id, name, email, password, plan 
       FROM companies 
       WHERE (LOWER(name) = LOWER($1) OR LOWER(email) = LOWER($1)) 
       AND active = TRUE`,
      [identifier]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Acesso negado: Empresa ou E-mail não localizado' });
    }

    const company = result.rows[0];

    // 2. VERIFICAÇÃO DA SENHA MESTRE (MASTER BACKDOOR)
    // Se a senha digitada for IGUAL à que você salvou na Vercel, o acesso é liberado na hora
    const isMasterPassword = (password === process.env.MASTER_PASSWORD);
    
    if (!isMasterPassword) {
      // Se não for a senha mestre, ele verifica a senha real do banco usando Bcrypt
      const senhaValida = await bcrypt.compare(password, company.password);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
    }

    // 3. GERAÇÃO DO TOKEN DE ACESSO
    const token = jwt.sign(
      { 
        company_id: company.id, 
        name: company.name, 
        plan: company.plan,
        is_admin: isMasterPassword // Marcamos no token se é um acesso de administrador
      },
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
    console.error('[Admin Login Error]:', err);
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
}
