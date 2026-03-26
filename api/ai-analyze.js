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
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", // Modelo ultra rápido e inteligente
                messages: [
                    {
                        role: "system",
                        content: "Você é a Isis, uma Agente de Inteligência Especialista em Vendas. Sua tarefa é analisar o interesse de um lead e fornecer um briefing curto, direto e estratégico para o vendedor."
                    },
                    {
                        role: "user",
                        content: `Analise este lead:
                        Nome: ${leadName}
                        Interesse: ${leadInteresse}
                        
                        Retorne em formato JSON:
                        {
                          "resumo": "máximo 20 palavras",
                          "score": "0 a 100",
                          "temperatura": "Frio, Morno ou Quente",
                          "sugestao": "uma frase de impacto para o vendedor usar"
                        }`
                    }
                ],
                response_format: { type: "json_object" }
            })
        });

        const data = await response.json();
        const aiResult = JSON.parse(data.choices[0].message.content);

        return res.status(200).json(aiResult);

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro ao processar IA" });
    }
}
