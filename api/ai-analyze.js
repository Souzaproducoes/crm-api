import { setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    const { leadName, leadInteresse } = req.body;

    try {
        // Testando a conexão com a Groq
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    {
                        role: "system",
                        content: "Você é a Isis, uma Agente de Inteligência Especialista em Vendas da Souza Produções. Sua tarefa é analisar o interesse de um lead e fornecer um briefing estratégico curto."
                    },
                    {
                        role: "user",
                        content: `Analise este lead: Nome: ${leadName}, Interesse: ${leadInteresse}. Retorne em JSON: {"resumo": "texto", "score": "0-100", "temperatura": "Frio/Morno/Quente", "sugestao": "frase"}`
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Erro Groq:", errorData);
            return res.status(500).json({ error: "A Groq recusou a chave ou o limite foi atingido." });
        }

        const data = await response.json();
        const aiResult = JSON.parse(data.choices[0].message.content);

        return res.status(200).json(aiResult);

    } catch (err) {
        console.error("Erro no processamento:", err);
        return res.status(500).json({ error: "Erro interno ao processar IA" });
    }
}
