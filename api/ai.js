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
            systemPrompt = "Você é a Isis, Agente de Inteligência da Souza Produções. Sua missão é dar um resumo rápido e estratégico para o seu chefe (o vendedor) sobre o potencial do lead.";
            userPrompt = `Analise este lead de forma curta:
            Nome: ${leadName}
            Interesse: ${leadInteresse}
            Retorne em JSON: {"resumo": "O que ele quer em 1 frase", "score": "0-100", "temperatura": "Frio, Morno ou Quente", "sugestao": "O que falar para ele"}`;
        } else {
            // PROMPT HUMANO, CURTO E COM ALTA CONVERSÃO
            systemPrompt = "Você é a Isis, a Agente de Inteligência Artificial da Souza Produções. Você escreve de forma humana, leve, empática e profissional. Você não é vendedora chata, você é uma facilitadora. Use no máximo 2 ou 3 emojis. Use quebras de linha. Seja breve (máximo 3 parágrafos curtos).";
            
            userPrompt = `Escreva uma mensagem de primeiro contato para o WhatsApp do cliente ${leadName}.
            
            Contexto: Ele demonstrou interesse em "${leadInteresse}".
            
            Roteiro da Mensagem:
            1. Saudação humana (Oi ${leadName}, tudo bem?).
            2. Apresentação (Sou a Isis, a Agente de IA aqui da Souza Produções).
            3. Contexto (Vi que você está buscando soluções para ${leadInteresse} e achei o projeto fantástico).
            4. Proposta de valor (A nossa inteligência consegue filtrar seus leads e te entregar só as melhores oportunidades no automático).
            5. Pergunta final leve (Topa conversarmos 2 minutinhos para eu te mostrar como funciona?).`;
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
                temperature: 0.8, // Mais criatividade para parecer humano
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "A Isis teve um pequeno soluço, tente novamente." });
    }
}
