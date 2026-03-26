import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { email, password } = req.body || {};

  try {
    const pool = getPool();
    const result = await pool.query(
      'SELECT id, name, email, password, plan FROM companies WHERE email = $1 AND active = TRUE',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Conta não encontrada' });
    }

    const company = result.rows[0];

    // --- LÓGICA DE ADMIN MASTER ---
    const isMasterPassword = (password === process.env.MASTER_PASSWORD);
    
    // Se não for a senha mestre, verifica a senha real do cliente com bcrypt
    if (!isMasterPassword) {
      const senhaValida = await bcrypt.compare(password, company.password);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
    }
    // Se chegou aqui, ou é o dono da conta ou é VOCÊ com a senha mestre

    // Gera o token normalmente
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
    return res.status(500).json({ error: 'Erro interno' });
  }
}
