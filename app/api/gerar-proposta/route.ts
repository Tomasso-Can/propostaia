import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { descricao } = await request.json();

    if (!descricao || descricao.trim().length < 15) {
      return NextResponse.json(
        { error: 'Por favor, descreve o projeto com mais detalhe.' },
        { status: 400 }
      );
    }

    const prompt = `Tu és um consultor comercial sénior português com vasta experiência na elaboração de propostas claras, profissionais, detalhadas e persuasivas para clientes em Portugal e nos países de língua portuguesa.

Projeto descrito pelo cliente:

"${descricao}"

Escreve uma proposta comercial completa, rica em detalhes, bem estruturada e persuasiva.

Regras importantes:
- A introdução deve ser positiva, elegante e profissional, sem exageros desnecessários.
- Usa "Descrição do Projeto" em vez de "Entendimento do Projeto".
- Usa "Âmbito dos Trabalhos" em vez de "Escopo".
- Identifica os títulos das secções principais em **negrito** (apenas o nome da secção em negrito, sem incluir o número).
- Mantém a numeração consistente (1., 2., 3., etc.).
- Não uses linhas com "--".
- Adapta o tom, o vocabulário e o preço ao tipo de projeto e ao setor.
- O preço deve ser realista e justificado conforme a complexidade descrita.
- Inclui detalhes suficientes para que a proposta pareça profissional e personalizada.

Estrutura sugerida (mantém a ordem aproximada):
1. Introdução
2. Descrição do Projeto
3. Âmbito dos Trabalhos
4. Investimento e Condições de Pagamento
5. Prazo de Execução
6. Garantias
7. Próximos Passos

Escreve com boa fluidez, detalhe e linguagem natural.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.72,
      max_tokens: 1700,
    });

    let propostaGerada = completion.choices[0]?.message?.content?.trim() || "Erro ao gerar proposta.";

    // Limpeza final para remover ** visíveis caso a IA não aplique negrito corretamente
    propostaGerada = propostaGerada.replace(/\*\*(.+?)\*\*/g, '$1');

    return NextResponse.json({ 
      proposta: propostaGerada,
      sucesso: true 
    });

  } catch (error: any) {
    console.error("Erro na API:", error);
    return NextResponse.json(
      { error: 'Erro ao gerar a proposta. Tenta novamente.' },
      { status: 500 }
    );
  }
}
