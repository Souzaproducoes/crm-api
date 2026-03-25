// ============================================================
// HELPERS - ISIS AI AGENT CRM (VERSÃO CORRIGIDA)
// ============================================================

import pg from 'pg';
const { Pool } = pg;
import jwt from 'jsonwebtoken';

let pool;

/**
 * Gerencia a conexão com o Banco de Dados PostgreSQL
 */
export function getPool() {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) throw new Error('DATABASE_URL não configurada no ambiente');
        
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: { rejectUnauthorized: false }, // Necessário para Neon/Vercel Postgres
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
        });
    }
    return pool;
}

/**
 * Configura os cabeçalhos de CORS para permitir acesso do Navegador
 */
export function setCors(req, res) {
    // Detecta a origem de quem está chamando (ex: seu github.io)
    const origin = req.headers.origin || '*';
    
    // Configura as permissões
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader(
        'Access-Control-Allow-Headers', 
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );
    res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Trata requisições do tipo OPTIONS (Preflight) que o navegador faz antes do POST/PATCH
 */
export function handleOptions(req, res) {
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return true;
    }
    return false;
}

/**
 * Extrai o Token Bearer do cabeçalho de autorização
 */
export function parseAuthHeader(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
}

/**
 * Verifica se o token JWT é válido e retorna os dados decodificados
 */
export function verifyToken(req) {
    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) throw new Error('Token não fornecido');
    
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET não configurado no servidor');
    
    try {
        return jwt.verify(token, secret);
    } catch (err) {
        throw new Error('Token inválido ou expirado');
    }
}
