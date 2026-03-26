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
            systemPrompt = "Você é a Isis, Agente de Inteligência de Vendas da Souza Produções. Analise leads sob a ótica de um Diretor Comercial. Foque em potencial de fechamento e dor do cliente.";
            userPrompt = `Analise este lead para o consultor:
            Nome: ${leadName}
            Interesse: ${leadInteresse}
            Retorne em JSON: {"resumo": "Resumo executivo (20 palavras)", "score": "0-100", "temperatura": "Frio, Morno ou Quente", "sugestao": "Estratégia comercial imediata"}`;
        } else {
            // PROMPT DE ALTO TICKET (CEO & MARKETING VISION)
            systemPrompt = "Você é um Consultor de Negócios de Alta Performance. Sua escrita é minimalista, elegante e extremamente direta. Você NÃO usa emojis. Você foca no custo de oportunidade e na eficiência operacional. Use parágrafos curtos.";
            userPrompt = `Escreva uma abordagem estratégica para o cliente ${leadName}. 
            Contexto: Ele demonstrou interesse em ${leadInteresse}.
            Diretrizes:
            - Comece direto: "${leadName}, identifiquei um ponto crítico na sua triagem de leads..."
            - Demonstre que você sabe o problema dele (perda de leads por falta de automação).
            - Ofereça uma validação da estratégia da Souza Produções.
            - Termine perguntando se faz sentido escalar essa operação agora.
            - ZERO emojis. Tom executivo.`;
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
                temperature: 0.5, // Menor temperatura = Resposta mais séria e direta
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Erro no processamento da IA." });
    }
}
