// api/login.js — Autenticação com bcrypt + JWT
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { email, password } = req.body || {};

  // Validação básica
  if (!email || !password) {
    return res.status(400).json({ error: 'Email e senha são obrigatórios' });
  }

  try {
    const pool = getPool();

    // Busca empresa pelo email (nunca comparar senha aqui)
    const result = await pool.query(
      'SELECT id, name, email, password, plan FROM companies WHERE email = $1 AND active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // Resposta genérica para não revelar se o email existe
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const company = result.rows[0];

    // Comparação segura com bcrypt
    const senhaValida = await bcrypt.compare(password, company.password);

    if (!senhaValida) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    // Gera JWT com dados mínimos necessários
    const token = jwt.sign(
      {
        company_id: company.id,
        name: company.name,
        plan: company.plan,
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
    console.error('[login] Erro:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
