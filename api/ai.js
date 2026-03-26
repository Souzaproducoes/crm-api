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
            systemPrompt = "Você é a Isis, Agente de Inteligência de Vendas da Souza Produções. Analise o interesse do lead e retorne um briefing estratégico. Seja direto, profissional e use um tom de consultor de alto nível.";
            userPrompt = `Analise este lead para o vendedor:
            Nome: ${leadName}
            Interesse: ${leadInteresse}
            Retorne em JSON: {"resumo": "Breve resumo", "score": "0-100", "temperatura": "Frio, Morno ou Quente", "sugestao": "O que o vendedor deve fazer agora"}`;
        } else {
            systemPrompt = "Você é um mestre em copywriting para WhatsApp. Escreva mensagens curtas, persuasivas e com emojis, focadas em agendar uma reunião ou fechar negócio.";
            userPrompt = `Escreva uma mensagem de abordagem para o cliente ${leadName}. Baseie-se neste briefing da nossa IA: ${briefing}. Comece com 'Olá ${leadName}, tudo bem?'`;
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
        console.error(err);
        return res.status(500).json({ error: "A Isis está sobrecarregada." });
    }
}
