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
            // BRIEFING ESTRATÉGICO MULTILÍNGUE
            systemPrompt = `Você é a Isis, Agente de Inteligência de Vendas da Souza Produções. 
            Sua tarefa é analisar leads. IMPORTANTE: Identifique o idioma do interesse do lead. 
            Se o lead falar Inglês, Espanhol ou qualquer outro idioma, seu resumo deve ser no idioma do VENDEDOR (Português), mas mencione o idioma original do lead.`;
            
            userPrompt = `Analise este lead de forma executiva:
            Nome: ${leadName}
            Interesse: ${leadInteresse}
            Retorne RIGOROSAMENTE em JSON: 
            {"resumo": "frase curta", "score": "0-100", "temperatura": "Frio, Morno ou Quente", "sugestao": "próximo passo"}`;

        } else {
            // MENSAGEM HUMANA, PERSUASIVA E MULTILÍNGUE
            systemPrompt = `Você é a Isis, a Agente de IA da Souza Produções. 
            DIRETRIZES DE OURO:
            1. IDIOMA: Identifique o idioma do lead com base no nome e interesse. Responda SEMPRE no mesmo idioma que ele usou.
            2. TOM DE VOZ: Humano, leve, elegante e consultivo.
            3. ESTRUTURA: Máximo 3 parágrafos curtos. Use quebras de linha. No máximo 2 emojis.
            4. OBJETIVO: Gerar curiosidade e agendar uma conversa. Não tente vender o sistema de cara.
            5. IDENTIDADE: Apresente-se como "Isis, a inteligência da Souza Produções".`;
            
            userPrompt = `Escreva uma mensagem de abordagem personalizada para o lead ${leadName}. 
            O interesse dele é: "${leadInteresse}".
            
            Se o interesse estiver em Inglês, responda em Inglês. Se em Espanhol, responda em Espanhol.
            Siga o roteiro:
            - Saudação natural.
            - Apresentação (Sou a Isis da Souza Produções).
            - Demonstre que entendeu a dor dele com base no interesse.
            - Convite amigável para uma breve validação estratégica.`;
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
                temperature: 0.6, // Equilíbrio perfeito entre criatividade e seriedade
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        const content = data.choices[0].message.content;

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Isis is currently updating her protocols." });
    }
}
