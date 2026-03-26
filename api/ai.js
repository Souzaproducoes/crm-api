import { setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';

export default async function handler(req, res) {
    setCors(req, res);
    if (handleOptions(req, res)) return;

    // Garante que a resposta saia em UTF-8 para os emojis não quebrarem
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    const token = parseAuthHeader(req.headers['authorization']);
    if (!token) return res.status(401).json({ error: 'Não autorizado' });

    const { action, leadName, leadInteresse, briefing } = req.body;

    try {
        let systemPrompt = "";
        let userPrompt = "";

        if (action === 'analyze') {
            systemPrompt = `Você é a Isis, Agente de Inteligência de Vendas da Souza Produções. 
            Sua missão é fornecer briefings estratégicos para diretores comerciais. 
            Seja elegante, use terminologia de negócios (ROI, CAC, Conversão) e identifique o idioma do lead.`;
            
            userPrompt = `Analise este lead com foco em potencial de escala:
            Nome: ${leadName}
            Interesse: ${leadInteresse}
            Retorne RIGOROSAMENTE em JSON: {"resumo": "...", "score": "0-100", "temperatura": "Frio, Morno ou Quente", "sugestao": "..."}`;
        } else {
            // PROMPT DE ALTA CONVERSÃO - EXECUTIVO E HUMANIZADO
            systemPrompt = `Você é a Isis, Consultora de Estratégia da Souza Produções. 
            REGRAS DE OURO:
            1. IDIOMA: Detecte o idioma do interesse e responda no mesmo idioma.
            2. GRAMÁTICA: Use o português culto e profissional (ex: "automatizar e filtrar").
            3. TOM DE VOZ: Empático, executivo e focado em valor. NUNCA fale em "dinheiro" ou "curiosos". 
               Use termos como: "otimizar o tempo da sua equipe", "focar em intenções reais de negócio" e "priorizar leads qualificados".
            4. ESTRUTURA: Máximo 3 parágrafos curtos. Use quebras de linha reais.
            5. EMOJIS: Use no máximo 2, de forma discreta e elegante (👋, 🚀 ou 📈).`;

            userPrompt = `Escreva uma mensagem de abordagem estratégica para ${leadName}. 
            Interesse dele: "${leadInteresse}".
            Roteiro:
            - Saudação natural (Oi ${leadName}, tudo bem?).
            - Identifique-se como "Isis, a inteligência estratégica da Souza Produções".
            - Comente que notou o interesse em ${leadInteresse}.
            - Explique que sua tecnologia ajuda a "priorizar as oportunidades com real intenção de negócio, otimizando o tempo da equipe comercial dele".
            - Convide para uma breve validação estratégica hoje ou amanhã.`;
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
                temperature: 0.5, // Respostas mais precisas e menos "alucinadas"
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        return res.status(500).json({ error: "Erro de processamento na Isis." });
    }
}
