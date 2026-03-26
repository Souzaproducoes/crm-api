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
            systemPrompt = "Você é a Isis, Agente de Inteligência de Vendas da Souza Produções. Sua missão é analisar leads e dar insights curtos e poderosos para o vendedor. Use um tom executivo e estratégico.";
            userPrompt = `Analise este lead para o vendedor:
            Nome: ${leadName}
            Interesse: ${leadInteresse}
            Retorne rigorosamente em JSON: {"resumo": "Breve resumo estratégico", "score": "0-100", "temperatura": "Frio, Morno ou Quente", "sugestao": "Ação imediata recomendada"}`;
        } else {
            // PROMPT PARA MENSAGEM HUMANA E PERSUASIVA
            systemPrompt = "Você é uma Consultora de Negócios Sênior. Sua escrita é natural, elegante e persuasiva. Você NÃO usa linguagem robótica como 'otimizar seu negócio'. Você fala sobre RESULTADOS e PARCERIA. Use quebras de linha para a leitura ficar leve. Use no máximo 2 emojis que façam sentido. Nunca pareça um robô de spam.";
            userPrompt = `Escreva uma abordagem curta para o WhatsApp para o cliente ${leadName}. 
            Contexto: Ele demonstrou interesse em ${leadInteresse}.
            Diretriz: Comece com um cumprimento natural (ex: Oi ${leadName}, tudo bem?). 
            Faça uma pergunta sobre o desafio dele e mencione que você (Souza Produções) tem uma estratégia que pode ajudar. 
            Termine com uma chamada para ação leve (ex: Faz sentido conversarmos?). 
            IMPORTANTE: Use quebras de linha entre os parágrafos.`;
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
                temperature: 0.7, // Aumenta a "humanidade" e criatividade
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "A Isis teve um imprevisto." });
    }
}
