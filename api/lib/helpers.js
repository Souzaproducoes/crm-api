// ============================================================
// HELPERS - ISIS AI AGENT CRM
// ============================================================

import { Pool } from 'pg';
import jwt from 'jsonwebtoken';

let pool;

export function getPool() {
    if (!pool) {
        const databaseUrl = process.env.DATABASE_URL;
        if (!databaseUrl) throw new Error('DATABASE_URL não configurada');
        
        pool = new Pool({
            connectionString: databaseUrl,
            ssl: { rejectUnauthorized: false },
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });
    }
    return pool;
}

export function setCors(req, res) {
    const origin = req.headers.origin;
    const allowed = process.env.ALLOWED_ORIGINS 
        ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()) 
        : [];
    
    if (allowed.includes('*') || allowed.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin || '*');
    }
    
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400');
}

export function handleOptions(req, res) {
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
    }
    return false;
}

export function parseAuthHeader(authHeader) {
    if (!authHeader) return null;
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
    return parts[1];
}

export function verifyToken(req) {
    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) throw new Error('Token não fornecido');
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET não configurado');
    return jwt.verify(token, process.env.JWT_SECRET);
}
