import { setCors, handleOptions, parseAuthHeader } from './lib/helpers.js';

// 🎭 Personalidade da Isis - Traços humanos variáveis
const ISIS_PERSONALITY = {
  tracos: ['direta', 'empatica', 'estratégica', 'descontraída'],
  emojis_padrao: ['👋', '💼', '🚀', '☕️', '✨', '💡', '🎯', '📈', '🔥', '⚡️'],
  saudacoes_variacoes: {
    manha: ['Bom dia', 'Oi, bom dia', 'E aí, bom dia'],
    tarde: ['Boa tarde', 'Oi', 'E aí'],
    noite: ['Boa noite', 'Oi, boa noite', 'E aí']
  }
};

// 🎯 Inteligência de Segmento com Emojis Estratégicos
const SEGMENT_INTELLIGENCE = {
  imobiliario: {
    pain_points: ['lead qualificado', 'corretor parado', 'inventário parado', 'visitas frias'],
    language: ['imóveis', 'corretagem', 'captação', 'visitas', 'propostas', 'fechamento'],
    hook_angles: ['inventário parado', 'corretores improdutivos', 'leads fantasmas', 'visitas sem retorno'],
    emojis: ['🏠', '🔑', '💰', '📊', '🎯'],
    tom: 'direto_e_focado'
  },
  saas: {
    pain_points: ['CAC alto', 'churn', 'trial sem conversão', 'SDR improdutivo', 'pipeline vazio'],
    language: ['MRR', 'conversão', 'onboarding', 'qualificação', 'pipeline', 'receita recorrente'],
    hook_angles: ['custo de aquisição', 'trialistas fantasmas', 'SDR que não qualifica', 'demos sem show'],
    emojis: ['💻', '📈', '⚡️', '🔧', '💡'],
    tom: 'tecnico_e_pratico'
  },
  ecommerce: {
    pain_points: ['carrinho abandonado', 'CAC', 'LTV baixo', 'atendimento lento', 'taxa de conversão'],
    language: ['carrinho', 'conversão', 'ticket médio', 'recorrência', 'upsell', 'cross-sell'],
    hook_angles: ['carrinhos abandonados', 'atendimento em horário comercial', 'taxa de retenção'],
    emojis: ['🛒', '💳', '📦', '🎯', '💸'],
    tom: 'dinamico_e_resultado'
  },
  marketing: {
    pain_points: ['leads frios', 'qualificação manual', 'follow-up esquecido', 'ROI incerto'],
    language: ['campanha', 'lead score', 'nutrição', 'automação', 'funil'],
    hook_angles: ['leads que esfriam', 'follow-up manual', 'qualificação sem padrão'],
    emojis: ['📢', '🎯', '✨', '📊', '🎨'],
    tom: 'criativo_e_estratégico'
  }
};

// 🎲 Variações de Abertura Humanizadas (nunca robóticas)
const HOOK_VARIATIONS = {
  imobiliario: [
    "Acabei de ver que você está buscando soluções para {dor} 🏠",
    "Realmente, {dor} é um problema sério no mercado atual 💼",
    "Parece que você está lidando com {dor}, certo? 🎯",
    "Sei exatamente como é lidar com {dor} no dia a dia 🔑"
  ],
  saas: [
    "Vi que vocês estão na área de {contexto} 📈",
    "Acabei de ver seu interesse em otimizar {dor} ⚡️",
    "O desafio de {dor} é real, né? 💻",
    "Também já passei por isso com {dor} 💡"
  ],
  ecommerce: [
    "E aí, vi que você está buscando resolver {dor} 🛒",
    "O problema de {dor} é clássico no e-commerce 💸",
    "Vi que você está de olho em soluções para {dor} 📦",
    "Realmente, {dor} drena muito recurso, né? 💳"
  ]
};

export default async function handler(req, res) {
  setCors(req, res);
  if (handleOptions(req, res)) return;
  
  // Garante UTF-8 para emojis não quebrarem
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const token = parseAuthHeader(req.headers['authorization']);
  if (!token) return res.status(401).json({ error: 'Não autorizado 🔒' });

  const { action, leadName, leadInteresse, briefing, context = {}, historico = [] } = req.body;

  try {
    const timeContext = getTimeContext();
    const segment = detectSegment(leadInteresse);
    const leadTemp = detectTemperature(leadInteresse, briefing);
    const mood = detectMood(); // 🎭 Detecta "humor" do dia para variação
    
    if (action === 'analyze') {
      const result = await analyzeLead(leadName, leadInteresse, briefing, segment);
      return res.status(200).json(result);
    } 
    else {
      const message = await generateHumanMessage({
        leadName, 
        leadInteresse, 
        segment,
        timeContext,
        leadTemp,
        briefing,
        mood,
        historico
      });
      return res.status(200).json({ message });
    }

  } catch (err) {
    console.error('Erro Isis:', err);
    return res.status(500).json({ error: "Ops, tive um problema aqui 😅. Pode tentar de novo?" });
  }
}

// 🎭 Detecta "humor" do dia para variar o tom (humaniza mais)
function detectMood() {
  const hour = new Date().getHours();
  const random = Math.random();
  
  if (hour < 10) return 'energica'; // Manhã: energia
  if (hour > 18) return 'leve'; // Noite: mais leve
  if (random > 0.7) return 'descontraida';
  if (random > 0.4) return 'focada';
  return 'profissional';
}

function detectSegment(interesse) {
  const text = interesse.toLowerCase();
  if (text.includes('imóvel') || text.includes('corretor') || text.includes('imobiliária') || text.includes('casa') || text.includes('apartamento')) return 'imobiliario';
  if (text.includes('saas') || text.includes('software') || text.includes('plataforma') || text.includes('app') || text.includes('aplicativo')) return 'saas';
  if (text.includes('ecommerce') || text.includes('loja') || text.includes('produto') || text.includes('venda online') || text.includes('shop')) return 'ecommerce';
  if (text.includes('marketing') || text.includes('agencia') || text.includes('ads') || text.includes('trafego')) return 'marketing';
  return 'saas'; // Default
}

function detectTemperature(interesse, briefing = {}) {
  const hot_words = ['urgente', 'preciso', 'orçamento', 'investir', 'implementar', 'agora', 'quanto custa', 'fechar', 'comprar'];
  const warm_words = ['analisar', 'conhecer', 'saber mais', 'interessante', 'ver como funciona'];
  
  const text = (interesse + ' ' + JSON.stringify(briefing)).toLowerCase();
  
  if (hot_words.some(w => text.includes(w))) return 'quente';
  if (warm_words.some(w => text.includes(w))) return 'morno';
  return 'frio';
}

function getTimeContext() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  
  let period, greeting;
  if (hour >= 5 && hour < 12) { 
    period = 'manha'; 
    greeting = hour < 9 ? 'Bom dia' : 'E aí, bom dia'; 
  }
  else if (hour >= 12 && hour < 18) { 
    period = 'tarde'; 
    greeting = 'Boa tarde'; 
  }
  else { 
    period = 'noite'; 
    greeting = 'Boa noite'; 
  }
  
  return { hour, period, greeting, isWeekend: day === 0 || day === 6, dayName: getDayName(day) };
}

function getDayName(day) {
  const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  return days[day];
}

// 💬 Gera mensagem super humana
async function generateHumanMessage({ leadName, leadInteresse, segment, timeContext, leadTemp, briefing, mood, historico }) {
  const segIntel = SEGMENT_INTELLIGENCE[segment] || SEGMENT_INTELLIGENCE.saas;
  
  // Seleciona emoji principal baseado no segmento + temperatura
  const mainEmoji = segIntel.emojis[Math.floor(Math.random() * segIntel.emojis.length)];
  const fireEmoji = leadTemp === 'quente' ? ' 🔥' : '';
  
  // Variação de saudação baseada no mood
  let saudacao = timeContext.greeting;
  if (mood === 'descontraida' && timeContext.period === 'manha') {
    saudacao = 'E aí, bom dia';
  }
  
  // Seleciona hook aleatório para não parecer template
  const hooks = HOOK_VARIATIONS[segment] || HOOK_VARIATIONS.saas;
  const hookTemplate = hooks[Math.floor(Math.random() * hooks.length)];
  const dor = segIntel.pain_points[Math.floor(Math.random() * segIntel.pain_points.length)];
  const hook = hookTemplate.replace('{dor}', dor).replace('{contexto}', segment);
  
  // Contexto de temperatura para o prompt
  const tempContext = {
    'quente': 'Lead quer comprar AGORA. Seja direta, proponha horário específico hoje, mostre confiança.',
    'morno': 'Lead está avaliando. Seja consultiva, mostre cases, crie conexão antes de vender.',
    'frio': 'Lead só curioso. Use provocação intelectual, desafie o status quo, seja intrigante.'
  }[leadTemp];

  const systemPrompt = `Você é Isis Valverde, CEO da Souza Produções. ${mood === 'descontraida' ? 'Hoje você está leve e conversando como uma colega.' : 'Hoje você está focada e objetiva.'}

🎭 PERSONALIDADE (seja autêntica):
- Você é uma executiva que já "passou pelo fogo" e sabe das dores reais
- Fala com empatia genuína, não como robô de atendimento
- Usa emojis com moderação mas de forma natural (2-3 por mensagem)
- Varia o tamanho das frases (algumas curtas, outras um pouco maiores)
- Às vezes começa com uma pergunta direta, às vezes com uma constatação

🎯 CONTEXTO ATUAL:
- Segmento: ${segment} ${mainEmoji}
- Temperatura: ${leadTemp}${fireEmoji}
- Horário: ${timeContext.greeting} (${timeContext.period})
- Dia: ${timeContext.isWeekend ? 'fim de semana' : 'dia de semana'}

📋 REGRAS DE OURO:
1. **NUNCA** comece com "Vi que você..." ou "Notamos que..." - seja mais natural
2. Use gírias executivas leves tipo "a gente", "rolar", "fechar", "top" (com moderação)
3. Mencione o problema específico do segmento: ${segIntel.pain_points.slice(0,2).join(', ')}
4. CTA deve ser leve: "bate um papo", "trocar uma ideia", "café virtual" ☕️
5. Se for lead quente, sugira horário específico (hoje 15h ou amanhã 10h)
6. Assine como "Isis" no final, de forma leve ✨

${tempContext}

💡 EXEMPLOS DE TOM (inspire-se, não copie):
${leadTemp === 'quente' ? '"Bom dia Ricardo, seu time está perdendo 3h por dia com curiosos? A gente resolve isso. Tem 15min hoje às 15h pra eu te mostrar? - Isis 👋"' : '"E aí Ricardo, vi que você está buscando otimizar o atendimento 🏠 Realmente, perder tempo com lead frio dói no bolso. Aqui a gente filtra só os quentes pra você. Bate um papo rápido hoje? ☕️ - Isis"'}

Agora escreva UMA mensagem única para ${leadName}:`;

  const userPrompt = `Dados do Lead:
Nome: ${leadName}
Interesse: ${leadInteresse}
Temperatura: ${leadTemp}
Segmento: ${segment}

Escreva uma mensagem curta (máximo 4 parágrafos pequenos), humana, usando emojis naturais, que soe como uma mensagem que um CEO enviaria pelo WhatsApp pessoal.

Variação de abertura sugerida: ${hook}

Lembre-se: somos humanos conversando com humanos 🤝`;

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
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.85, // Mais criatividade e variação
        max_tokens: 300,
        top_p: 0.9,
        frequency_penalty: 0.3, // Evita repetições
        presence_penalty: 0.3 // Torna mais diverso
      })
    });

    if (!response.ok) throw new Error(`Groq error: ${response.status}`);
    
    const data = await response.json();
    let content = data.choices[0].message.content;
    
    // Pós-processamento para garantir qualidade humana
    content = postProcessHumanMessage(content, leadName, timeContext, segIntel);
    
    return content;
    
  } catch (error) {
    console.error('Error generating message:', error);
    // Fallback humanizado em caso de erro
    return `${timeContext.greeting} ${leadName} ${mainEmoji}\n\nVi que você está buscando soluções para ${segIntel.pain_points[0]}. Aqui na Souza Produções a gente resolve isso de forma prática e sem complicação.\n\nQue tal a gente trocar uma ideia rápida hoje ou amanhã? Posso te mostrar como funciona em 15 minutos ☕️\n\nAbraço,\nIsis ✨`;
  }
}

async function analyzeLead(leadName, leadInteresse, briefing, segment) {
  const segIntel = SEGMENT_INTELLIGENCE[segment] || SEGMENT_INTELLIGENCE.saas;
  
  const systemPrompt = `Você é Isis Valverde, diretora comercial experiente. Faça uma análise estratégica rápida e prática.

Retorne JSON válido e bem formatado:
{
  "resumo": "Máx 15 palavras sobre o que ele faz/precisa",
  "score": número entre 0-100,
  "temperatura": "Frio ❄️|Morno 😐|Quente 🔥|Pronto para fechar ⚡️",
  "principal_dor": "dor específica do ${segment} identificada ${segIntel.emojis[0]}",
  "sugestao_abordagem": "tática específica de vendas (ex: 'falar em redução de custo', 'mostrar case similar')",
  "momento_ideal": "melhor horário/dia para ligar",
  "objecao_provavel": "objeção que ele provavelmente terá",
  "tom_recomendado": "descontraido|formal|urgente|consultivo"
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
        { role: "user", content: `Analise este lead:\nNome: ${leadName}\nInteresse: ${leadInteresse}\nDados extras: ${briefing || 'N/A'}\nSegmento detectado: ${segment}` }
      ],
      temperature: 0.4,
      response_format: { type: "json_object" }
    })
  });

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);
  
  // Adiciona emoji de temperatura se não tiver
  if (!result.temperatura.includes('❄️') && !result.temperatura.includes('🔥')) {
    if (result.score >= 80) result.temperatura += ' ⚡️';
    else if (result.score >= 60) result.temperatura += ' 🔥';
    else if (result.score >= 40) result.temperatura += ' 😐';
    else result.temperatura += ' ❄️';
  }
  
  return result;
}

function postProcessHumanMessage(content, leadName, timeContext, segIntel) {
  // Remove saudações duplicadas que o modelo pode ter gerado
  content = content.replace(/^(Bom dia|Boa tarde|Boa noite|E aí)[,.\s]*\s*/i, '');
  content = content.replace(/^Oi[,.\s]*/i, '');
  
  // Garante saudação natural no início
  const saudacao = timeContext.hour < 9 ? 'Bom dia' : (timeContext.hour < 18 ? 'E aí' : 'Boa noite');
  content = `${saudacao} ${leadName}! 👋\n\n${content}`;
  
  // Garante assinatura da Isis se não tiver
  if (!content.includes('Isis') && !content.includes('Isis Valverde')) {
    content += '\n\nAbraço,\nIsis ✨';
  }
  
  // Normaliza emojis excessivos (máximo 4)
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const emojis = content.match(emojiRegex) || [];
  if (emojis.length > 4) {
    // Remove emojis do meio, mantém no início e fim
    let count = 0;
    content = content.replace(emojiRegex, (match) => {
      count++;
      return count > 4 ? '' : match;
    });
  }
  
  // Remove frases robóticas
  const roboticPhrases = [
    'espero que esteja bem',
    'como vai você',
    'tudo bem contigo',
    'gostaria de',
    'podemos agendar',
    'fico no aguardo',
    'atenciosamente'
  ];
  
  roboticPhrases.forEach(phrase => {
    content = content.replace(new RegExp(phrase, 'gi'), '');
  });
  
  // Limpa espaços duplos e linhas em branco excessivas
  content = content.replace(/\n{4,}/g, '\n\n').trim();
  content = content.replace(/[ ]{2,}/g, ' ');
  
  return content;
}