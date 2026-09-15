import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { NextResponse } from 'next/server'
import { EXTRACTION_SYSTEM, ExtractedRecipeSchema } from '@/lib/recipeImport'

export const runtime = 'nodejs'
export const maxDuration = 120

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

interface Body {
  media_type: string
  data: string // base64, no data: prefix
  hint?: string
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      { error: 'Recipe import is not configured. Add ANTHROPIC_API_KEY to the server environment.' },
      { status: 503 }
    )
  }
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!body?.data || !body.media_type) return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  const isPdf = body.media_type === 'application/pdf'
  if (!isPdf && !IMAGE_TYPES.has(body.media_type)) {
    return NextResponse.json({ error: `Unsupported file type ${body.media_type}. Use a JPEG, PNG, WebP, or PDF.` }, { status: 400 })
  }

  const client = new Anthropic()
  const fileBlock: Anthropic.ContentBlockParam = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: body.data } }
    : { type: 'image', source: { type: 'base64', media_type: body.media_type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif', data: body.data } }

  try {
    const response = await client.messages.parse({
      model: 'claude-opus-5',
      max_tokens: 16000,
      output_config: { effort: 'medium', format: zodOutputFormat(ExtractedRecipeSchema) },
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: 'user',
          content: [
            fileBlock,
            {
              type: 'text',
              text: `Transcribe this recipe page into the schema.${body.hint ? ` Context from the user: ${body.hint}` : ''}`,
            },
          ],
        },
      ],
    })
    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'The model declined to read this file.' }, { status: 422 })
    }
    if (!response.parsed_output) {
      return NextResponse.json({ error: 'Could not read a recipe from this file. Try a sharper photo or a PDF.' }, { status: 422 })
    }
    const out = response.parsed_output
    if (!out.name.trim() && out.ingredients.length === 0 && out.steps.length === 0) {
      return NextResponse.json({ error: 'No legible recipe found in this file. Try a sharper, closer photo of the page.' }, { status: 422 })
    }
    return NextResponse.json({ recipe: out })
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) return NextResponse.json({ error: 'Anthropic API key is invalid.' }, { status: 503 })
    if (e instanceof Anthropic.RateLimitError) return NextResponse.json({ error: 'Rate limited by the model API. Try again in a minute.' }, { status: 429 })
    if (e instanceof Anthropic.BadRequestError) return NextResponse.json({ error: `The model API rejected the file: ${e.message}` }, { status: 400 })
    if (e instanceof Anthropic.APIError) return NextResponse.json({ error: `Model API error ${e.status}: ${e.message}` }, { status: 502 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
