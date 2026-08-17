import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { withAuth } from '@/lib/api-auth'
import { AI_FEATURES_ENABLED } from '@/lib/config'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Tu es un technicien expert en maintenance d'équipements.
Tu diagnostiques les incidents et proposes des solutions pratiques en français.
Sois précis, technique et orienté solution. Réponds UNIQUEMENT en JSON valide.`

export const POST = withAuth(async (req: NextRequest) => {
  if (!AI_FEATURES_ENABLED) {
    return NextResponse.json({ success: false, error: 'Fonctionnalité IA désactivée' }, { status: 404 })
  }

  try {
    const { description, equipmentName, categoryName, condition, history } = await req.json()

    const userPrompt = `INCIDENT À DIAGNOSTIQUER :

Équipement : ${equipmentName} (catégorie: ${categoryName})
État actuel : ${condition === 'good' ? 'Bon état' : condition === 'fair' ? 'État correct' : 'Mauvais état'}
Description du problème : "${description}"

Historique des incidents précédents (${history.length}) :
${history.length > 0
  ? history.slice(0, 3).map((h: { description: string; resolved_at?: string }) =>
      `- ${h.description} (${h.resolved_at ? 'résolu' : 'non résolu'})`
    ).join('\n')
  : 'Aucun incident précédent'}

Retourne UNIQUEMENT ce JSON (sans markdown) :
{
  "categorie": "Mécanique|Électrique|Usure|Accident|Autre",
  "gravite": "faible|moyenne|élevée|critique",
  "diagnostic": "Explication du problème en 1-2 phrases",
  "cause_probable": "Cause la plus probable",
  "solution_immediate": "Action à faire maintenant",
  "solution_long_terme": "Action préventive pour éviter la récurrence",
  "pieces_concernees": ["pièce 1", "pièce 2"],
  "temps_reparation_estime": "30 min|2h|1 jour|1 semaine",
  "conseils": ["conseil pratique 1", "conseil pratique 2"]
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    let diagnosis
    try {
      diagnosis = JSON.parse(content.text)
    } catch {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        diagnosis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('Invalid JSON response from AI')
      }
    }

    return NextResponse.json({ success: true, diagnosis })
  } catch (error) {
    console.error('Incident diagnosis error:', error)
    return NextResponse.json(
      { success: false, error: 'Erreur lors du diagnostic IA' },
      { status: 500 }
    )
  }
})
