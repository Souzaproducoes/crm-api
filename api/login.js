import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { getPool, setCors, handleOptions } from './lib/helpers.js';

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;

  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { email, password } = req.body || {};
  const isMasterPassword = (password === process.env.MASTER_PASSWORD);

  try {
    const pool = getPool();
    const identifier = email.trim();

    // Se você estiver usando o Nome Mestre e a Senha Mestra, buscamos o seu e-mail oficial
    let searchQuery = identifier;
    if (identifier === "Souza Produções" && isMasterPassword) {
        // Aqui você pode colocar o e-mail que você usou para se cadastrar
        searchQuery = "vfhomevideo@msn.com"; 
    }

    const result = await pool.query(
      `SELECT id, name, email, password, plan 
       FROM companies 
       WHERE (LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($1)) 
       AND active = TRUE`,
      [searchQuery]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Acesso negado: Empresa ou E-mail não localizado' });
    }

    const company = result.rows[0];

    // Verificação de senha
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