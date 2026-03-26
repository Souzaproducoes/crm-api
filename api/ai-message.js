import { setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    const { briefing, leadName } = req.body;

    try {
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
                        content: "Você é um mestre em copywriting de vendas. Escreva uma mensagem curta e amigável para o WhatsApp. Use emojis, seja direto e foque em converter o lead."
                    },
                    {
                        role: "user",
                        content: `Escreva uma mensagem para o cliente ${leadName}. Baseie-se neste briefing: ${briefing}. Comece com 'Olá ${leadName}, tudo bem?'`
                    }
                ]
            })
        });

        const data = await response.json();
        return res.status(200).json({ message: data.choices[0].message.content });
    } catch (err) {
        return res.status(500).json({ error: "Erro na IA" });
    }
}
