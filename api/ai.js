import { setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';

// Base de conhecimento por segmento (para falar a língua do cliente)
const SEGMENT_INTELLIGENCE = {
  imobiliario: {
    pain_points: ['lead qualificado', 'corretor parado', 'inventário parado', 'visitas frias'],
    language: ['imóveis', 'corretagem', 'captação', 'visitas', 'propostas'],
    hook_angles: ['inventário parado', 'corretores improdutivos', 'leads fantasmas']
  },
  saas: {
    pain_points: ['CAC alto', 'churn', 'trial sem conversão', 'SDR improdutivo'],
    language: ['MRR', 'conversão', 'onboarding', 'qualificação', 'pipeline'],
    hook_angles: ['custo de aquisição', 'trialistas fantasmas', 'SDR que não qualifica']
  },
  ecommerce: {
    pain_points: ['carrinho abandonado', 'CAC', 'LTV baixo', 'atendimento lento'],
    language: ['carrinho', 'conversão', 'ticket médio', 'recorrência'],
    hook_angles: ['carrinhos abandonados', 'atendimento em horário comercial']
  }
};

// Exemplos few-shot de mensagens reais de CEOs (tom humano, não robótico)
const FEW_SHOT_EXAMPLES = [
  {
    context: "Lead imobiliário, manhã, temperatura quente",
    output: `Bom dia ${leadName}, 

Te vi pesquisando sobre automação para equipes comerciais. 

Na Souza Produções a gente resolve um problema específico: corretores passando 70% do dia respondendo "quanto custa" de curiosos, enquanto os imóveis ficam parados no inventário.

A gente usa IA para separar quem tem real intenção de compra (e budget) antes do primeiro contato humano. Resultado: seu time só fala com gente que realmente pode comprar.

Tem 15 minutos hoje à tarde pra eu te mostrar como isso funciona na prática?`
  },
  {
    context: "Lead SaaS, tarde, tom executivo",
    output: `${leadName}, boa tarde.

Vi que vocês estão na automação de vendas. 

Estou te mandando essa mensagem porque a gente reduziu o CAC de uma empresa similar em 40% no último trimestre, simplesmente filtrando leads que nunca iam converter antes que o SDR gastasse tempo.

Não é sobre "automatizar atendimento". É sobre seu time parar de perder energia com trialistas que nunca vão pagar.

Consegne liberar 20min amanhã pra trocar uma ideia?`
  }
];

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const token = parseAuthHeader(req.headers['authorization']);
  if (!token) return res.status(401).json({ error: 'Não autorizado' });

  const { action, leadName, leadInteresse, briefing, context = {} } = req.body;

  try {
    // Análise de contexto inteligente
    const timeContext = getTimeContext();
    const segment = detectSegment(leadInteresse);
    const leadTemp = detectTemperature(leadInteresse, briefing);
    
    if (action === 'analyze') {
      const result = await analyzeLead(leadName, leadInteresse, briefing);
      return res.status(200).json(result);
    } 
    else {
      const message = await generateHumanMessage({
        leadName, 
        leadInteresse, 
        segment,
        timeContext,
        leadTemp,
        briefing
      });
      return res.status(200).json({ message });
    }

  } catch (err) {
    console.error('Erro Isis:', err);
    return res.status(500).json({ error: "Erro de processamento. Tente novamente." });
  }
}

// Detecta segmento de mercado para personalizar linguagem
function detectSegment(interesse) {
  const text = interesse.toLowerCase();
  if (text.includes('imóvel') || text.includes('corretor') || text.includes('imobiliária')) return 'imobiliario';
  if (text.includes('saas') || text.includes('software') || text.includes('plataforma')) return 'saas';
  if (text.includes('ecommerce') || text.includes('loja') || text.includes('produto')) return 'ecommerce';
  return 'generico';
}

// Detecta temperatura baseada em intenção de compra
function detectTemperature(interesse, briefing = {}) {
  const hot_words = ['urgente', 'preciso', 'orçamento', 'investir', 'implementar', 'agora'];
  const warm_words = ['analisar', 'conhecer', 'saber mais', 'interessante'];
  
  const text = (interesse + ' ' + JSON.stringify(briefing)).toLowerCase();
  
  if (hot_words.some(w => text.includes(w))) return 'quente';
  if (warm_words.some(w => text.includes(w))) return 'morno';
  return 'frio';
}

// Contexto temporal para saudações naturais
function getTimeContext() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  let period, greeting;
  if (hour >= 5 && hour < 12) { period = 'manha'; greeting = 'Bom dia'; }
  else if (hour >= 12 && hour < 18) { period = 'tarde'; greeting = 'Boa tarde'; }
  else { period = 'noite'; greeting = 'Boa noite'; }
  
  return { hour, period, greeting, isWeekend: day === 0 || day === 6 };
}

// Gera mensagem com tom humano/CEO
async function generateHumanMessage({ leadName, leadInteresse, segment, timeContext, leadTemp, briefing }) {
  const segIntel = SEGMENT_INTELLIGENCE[segment] || SEGMENT_INTELLIGENCE.generico;
  
  // Prompt dinâmico baseado em copywriting de vendas (AIDA + PAS)
  const systemPrompt = `Você é Isis Valverde, CEO da Souza Produções e especialista em estratégia comercial. 
Você tem 15 anos de experiência em vendas B2B e escreve como um executivo ocupado que valoriza o tempo do interlocutor.

REGRAS DE COMUNICAÇÃO EXECUTIVA:

1. **Saudação Contextual**: Use "${timeContext.greeting}" naturalmente, não force "tudo bem?"
2. **Hook Imediato**: Primeira linha deve gerar curiosidade ou tocar na dor específica. NUNCA comece com "Vi que você..."
3. **Tom CEO**: Direto, sem rodeios. Uma ideia por parágrafo. Frases curtas (máximo 15 palavras).
4. **Linguagem do Segmento**: Use termos específicos de ${segment}: ${segIntel.language.join(', ')}
5. **Proposta de Valor**: Foque em resultado financeiro (tempo = dinheiro), não em "funcionalidades"
6. **CTA de Baixo Atrito**: Sugira um "café virtual de 15min" ou "trocar uma ideia rápida", não "reunião estratégica"
7. **PROIBIDO**: 
   - Não use "gostaria de", "podemos", "será que". Use "Quero te mostrar", "Vamos", "Sugiro"
   - Não repita a mesma ideia em parágrafos diferentes
   - Não use mais de 1 emoji (se usar)
   - Não mencione "IA", "tecnologia", "automação" mais de uma vez
   - Não seja entusiasmado demais (sem "!!", sem " incrível ", sem "revolucionário")

ESTRUTURA:
- Linha 1: Saudação + contexto temporal
- Linha 2-3: Hook sobre a dor (${segIntel.pain_points.join(' ou ')})
- Linha 4-6: Solução em uma frase (o que vocês fazem de fato)
- Linha 7: CTA direto`;

  const userPrompt = `Escreva uma mensagem para ${leadName} (${leadTemp}).

Contexto do lead: ${leadInteresse}
Segmento detectado: ${segment}
Horário: ${timeContext.greeting}

Ângulos de abordagem para ${segment}:
- ${segIntel.hook_angles.join('\n- ')}

Diretrizes específicas:
- Se for lead QUENTE: Seja direto, fale em resultados imediatos, sugira horário específico (hoje 15h ou amanhã 10h)
- Se for lead MORNO: Toque na dor do momento atual, seja consultivo mas incisivo
- Se for lead FRIO: Use provocação intelectual, desafie o status quo

Exemplo de tom (NÃO copie, apenas inspire-se):
"Bom dia Ricardo,

Seu time de vendas está perdendo 3h por dia com leads que nunca vão comprar?

A gente resolve isso filtrando intenção de compra real antes do primeiro contato. Resultado: seus corretores só falam com quem tem budget e decisão.

Tem 15 minutos hoje às 15h pra eu te mostrar o case?"

Agora escreva a mensagem única para ${leadName}:`;

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
      temperature: 0.8, // Mais criativo e humano
      max_tokens: 250, // Força concisão
      top_p: 0.9
    })
  });

  const data = await response.json();
  let content = data.choices[0].message.content;
  
  // Pós-processamento para garantir qualidade
  content = postProcessMessage(content, leadName, timeContext);
  
  return content;
}

// Análise estratégica de leads (mantém JSON para o frontend)
async function analyzeLead(leadName, leadInteresse, briefing) {
  const systemPrompt = `Você é diretora comercial sênior. Análise rigorosa em JSON.
  
Critérios de pontuação:
- 90-100: Pronto para comprar (budget + urgência + autoridade)
- 70-89: Quente (necessidade clara, falta verificar budget)
- 50-69: Morno (interesse mas sem urgência)
- <50: Frio (curioso ou sem condições)

Retorne JSON válido:
{
  "resumo": "máximo 10 palavras sobre o negócio dele",
  "score": número,
  "temperatura": "Frio|Morno|Quente|Pronto",
  "principal_dor": "dor específica detectada",
  "sugestao_abordagem": "tática específica (ex: 'falar em redução de CAC', 'focar em tempo de resposta')",
  "momento_ideal": "hora sugerida para contato",
  "objecao_provavel": "qual objeção ele provavelmente terá"
}`;

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
        { role: "user", content: `Analise: Nome: ${leadName}, Interesse: ${leadInteresse}, Dados extras: ${briefing || 'N/A'}` }
      ],
      temperature: 0.3, // Análise precisa
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  return JSON.parse(data.choices[0].message.content);
}

// Remove sujeiras e ajusta tom
function postProcessMessage(content, leadName, timeContext) {
  // Remove saudações duplicadas se o modelo repetir
  content = content.replace(/^(Bom dia|Boa tarde|Boa noite)[,.\s]*\s*/i, '');
  
  // Garante saudação correta no início
  content = `${timeContext.greeting} ${leadName},\n\n${content}`;
  
  // Remove emojis excessivos (mantém no máximo 1)
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length;
  if (emojiCount > 1) {
    content = content.replace(/[\u{1F600}-\u{1F64F}]/gu, '');
  }
  
  // Remove frases genéricas
  const genericPhrases = [
    'espero que esteja bem',
    'como vai',
    'tudo bem contigo',
    'espero que esteja tendo um ótimo dia'
  ];
  genericPhrases.forEach(phrase => {
    content = content.replace(new RegExp(phrase, 'gi'), '');
  });
  
  // Remove espaços duplos e linhas em branco excessivas
  content = content.replace(/\n{3,}/g, '\n\n').trim();
  
  return content;
}
