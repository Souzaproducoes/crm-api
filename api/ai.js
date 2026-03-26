import { setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    const { action, leadName, leadInteresse, briefing } = req.body;

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'analyze') {
            systemPrompt = "Você é a Isis, Agente de IA da Souza Produções. Analise o lead e retorne JSON.";
            userPrompt = `Analise: Nome: ${leadName}, Interesse: ${leadInteresse}. Retorne: {"resumo": "...", "score": "0-100", "temperatura": "...", "sugestao": "..."}`;
        } else if (action === 'message') {
            systemPrompt = "Você é um mestre em copywriting de vendas.";
            userPrompt = `Escreva uma mensagem curta de WhatsApp para ${leadName} baseada nisso: ${briefing}`;
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        return res.status(500).json({ error: "Erro na IA" });
    }
}
