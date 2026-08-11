import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Tu es un expert en gestion de flotte d'équipements pour une entreprise.
Tu analyses les données de la flotte et fournis des insights actionnables en français.
Sois concis, précis et orienté action. Utilise des emojis pour rendre la lecture agréable.
Format de réponse : JSON structuré uniquement, sans texte supplémentaire.`

export async function POST(req: NextRequest) {
  try {
    const data = await req.json()
    const { stats, categories, recentLoans, recentIncidents } = data

    const userPrompt = `Voici les données actuelles de la flotte :

STATISTIQUES GLOBALES :
- Total équipements : ${stats.total}
- Disponibles : ${stats.available} (${stats.total > 0 ? Math.round((stats.available / stats.total) * 100) : 0}%)
- Empruntés : ${stats.borrowed}
- En panne : ${stats.broken}
- En maintenance : ${stats.maintenance}
- Emprunts actifs : ${stats.active_loans}

CATÉGORIES (${categories.length} catégories) :
${categories.map((c: { name: string; total: number; available: number; borrowed: number; broken: number }) =>
  `- ${c.name}: ${c.total} total, ${c.available} dispo, ${c.borrowed} empruntés, ${c.broken} en panne`
).join('\n')}

EMPRUNTS RÉCENTS (${recentLoans.length}) :
${recentLoans.slice(0, 5).map((l: { employee?: { name?: string }; checkout_date: string; items?: unknown[] }) =>
  `- ${l.employee?.name || 'Inconnu'} le ${l.checkout_date} (${l.items?.length || 0} items)`
).join('\n')}

INCIDENTS RÉCENTS (${recentIncidents.length}) :
${recentIncidents.slice(0, 5).map((i: { description: string; resolved_at?: string }) =>
  `- ${i.description} (${i.resolved_at ? 'résolu' : 'en cours'})`
).join('\n')}

Analyse cette flotte et retourne UNIQUEMENT ce JSON (sans markdown, sans code block) :
{
  "sante_globale": "Excellent|Bon|Moyen|Critique",
  "score": 85,
  "resume": "Résumé en 2 phrases de l'état de la flotte",
  "points_positifs": ["point 1", "point 2"],
  "alertes": ["alerte 1", "alerte 2"],
  "recommandations": [
    {"priorite": "haute|moyenne|basse", "action": "action à faire", "impact": "impact attendu"}
  ],
  "tendance": "hausse|stable|baisse",
  "message_principal": "Message court et percutant sur l'état général"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    let analysis
    try {
      analysis = JSON.parse(content.text)
    } catch {
      // Try to extract JSON from the response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON response from AI')
      }
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('Fleet analysis error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors de l\'analyse IA' },
      { status: 500 }
    )
  }
}
