import Anthropic from '@anthropic-ai/sdk';
import { db } from '@/db';
import { eq } from 'drizzle-orm';
import { contentRecipes } from '@/db/schema';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface GenerateContentParams {
  userId: string;
  tema?: string;
  tipoContenido?: string;
  recetaId?: string;
}

export async function generateAutopilotContent({
  userId,
  tema,
  tipoContenido = 'post',
  recetaId,
}: GenerateContentParams) {
  // Get user's brand configuration
  // TODO: Implement user brand config retrieval
  const brandConfig = {
    industria: 'E-commerce de belleza',
    tono: 'profesional y cercano',
    audiencia: 'Mujeres 25-45 años interesadas en skincare',
    productos: 'Productos de belleza natural y sostenible',
    propuesta: 'Belleza consciente y sostenible',
  };

  // Get recipe if specified
  let recipePrompt = '';
  if (recetaId) {
    const recipe = await db.query.contentRecipes.findFirst({
      where: eq(contentRecipes.id, recetaId),
    });

    if (recipe) {
      recipePrompt = `
Usa esta receta como guía:
- ${recipe.descripcion}
- Estructura: ${recipe.estructura}
- Objetivo: ${recipe.tipoContenido}
      `;
    }
  }

  const systemPrompt = `Eres un experto en marketing de contenido y copywriting para redes sociales.

Información de la marca:
- Industria: ${brandConfig.industria}
- Tono: ${brandConfig.tono}
- Audiencia: ${brandConfig.audiencia}
- Productos: ${brandConfig.productos}
- Propuesta de valor: ${brandConfig.propuesta}

${recipePrompt}

Tu tarea es generar contenido optimizado para redes sociales que:
1. Sea auténtico y alineado con la voz de la marca
2. Genere engagement y conversación
3. Incluya llamados a la acción claros
4. Use emojis de manera estratégica (no excesiva)
5. Sea específico para cada red social si se solicita

Responde SOLO con un objeto JSON con esta estructura:
{
  "contenido": "El texto del post",
  "sugerenciaImagen": "Descripción de la imagen ideal",
  "redesRecomendadas": ["instagram", "facebook"],
  "mejorHorario": "14:30",
  "razonamiento": "Por qué este contenido funcionará",
  "hashtags": ["tag1", "tag2"],
  "variaciones": {
    "instagram": "Versión optimizada para Instagram",
    "facebook": "Versión optimizada para Facebook"
  }
}`;

  const userPrompt = tema
    ? `Genera un ${tipoContenido} sobre: ${tema}`
    : `Genera un ${tipoContenido} creativo y atractivo para la marca.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const result = JSON.parse(jsonMatch[0]);
        return result;
      }
    }

    throw new Error('No se pudo parsear la respuesta de la IA');
  } catch (error) {
    console.error('Error generating content:', error);
    throw error;
  }
}

export async function analyzePostPerformance(postContent: string, metrics: any) {
  const systemPrompt = `Eres un analista de marketing digital experto en redes sociales.
Analiza el rendimiento del contenido y proporciona insights accionables.`;

  const userPrompt = `Analiza este post:
"${postContent}"

Métricas:
- Vistas: ${metrics.vistas}
- Likes: ${metrics.likes}
- Comentarios: ${metrics.comentarios}
- Compartidos: ${metrics.compartidos}
- Engagement rate: ${metrics.engagementRate}%

Proporciona:
1. Qué funcionó bien
2. Qué se puede mejorar
3. Recomendaciones específicas para el próximo post
4. Predicción de rendimiento para contenido similar`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('No se pudo obtener el análisis');
  } catch (error) {
    console.error('Error analyzing post:', error);
    throw error;
  }
}
