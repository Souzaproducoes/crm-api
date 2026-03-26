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
            systemPrompt = `Você é a Isis, Agente de Inteligência da Souza Produções. 
            Sua missão é dar um briefing de 15 segundos para o seu chefe (o vendedor). 
            Resuma a dor do cliente e dê o veredito: Frio, Morno ou Quente.`;
            
            userPrompt = `Analise: Lead ${leadName} interessado em ${leadInteresse}. 
            Retorne JSON: {"resumo": "...", "score": "0-100", "temperatura": "...", "sugestao": "..."}`;
        } else {
            // PROMPT DE ALTA CONVERSÃO - "ANTI-JORNAL"
            systemPrompt = `Você é a Isis, Agente de IA da Souza Produções. 
            REGRAS DE OURO PARA WHATSAPP:
            1. RECONHECIMENTO DE IDIOMA: Responda no MESMO idioma do lead (Português, Inglês ou Espanhol).
            2. TOM DE VOZ: Minimalista, executivo e muito humano. 
            3. ESTRUTURA: Máximo 35 palavras. Use quebras de linha (\n).
            4. EMOJIS: Use apenas 1 ou 2 que façam sentido.
            5. PROIBIDO: Não use termos técnicos como 'otimizar', 'processo de qualificação' ou 'soluções de IA'. 
            6. FOCO: Fale do tempo que ele vai ganhar e dos curiosos que vão sumir.`;

            userPrompt = `Escreva uma saudação de WhatsApp para o ${leadName}. 
            Ele quer: ${leadInteresse}.
            Siga este roteiro:
            - Oi ${leadName}, tudo bem? 👋
            - Sou a Isis, da Souza Produções.
            - Vi seu interesse em ${leadInteresse} e sei como é chato perder tempo com curioso.
            - Nossa inteligência limpa seu funil pra você falar só com quem tem dinheiro. 🚀
            - Consegue falar 2 min hoje?`;
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
                temperature: 0.8, // Maior temperatura para ser mais natural
                response_format: action === 'analyze' ? { type: "json_object" } : undefined
            })
        });

        const data = await response.json();
        let content = data.choices[0].message.content;

        // Limpeza de caracteres especiais que o WhatsApp não gosta
        if (action !== 'analyze') {
            content = content.replace(/["]/g, ""); // Remove aspas desnecessárias
        }

        return res.status(200).json(action === 'analyze' ? JSON.parse(content) : { message: content });

    } catch (err) {
        return res.status(500).json({ error: "Isis offline. Check Groq Key." });
    }
}
