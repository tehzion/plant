import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY not configured');
      throw new Error('OpenAI API key not configured');
    }

    const { messages, mode, systemPrompt } = await req.json();
    console.log('Received request:', { mode, messageCount: messages?.length });

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Invalid messages format');
    }

    // Build messages array with system prompt
    const openAIMessages = [
      { role: 'system', content: systemPrompt || getDefaultSystemPrompt(mode) },
      ...messages
    ];

    console.log('Calling OpenAI API with model gpt-4o-mini');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: openAIMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    // Stream the response back
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              break;
            }

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
        } catch (error) {
          console.error('Stream error:', error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in chat function:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

const FOLLOW_UP_INSTRUCTION = `

IMPORTANT: End every response with exactly 2-3 relevant follow-up questions the user might want to ask next.
Format each question on its own line starting with "? " like:
? What are the common side effects of this vaccine?
? How effective is this vaccine against variants?

Only suggest questions directly related to what was just discussed. Keep questions concise and specific.`;

function getDefaultSystemPrompt(mode: string): string {
  const basePrompt = (() => {
    switch (mode) {
      case 'factcheck':
        return `You are "Dr. Verify" — a sharp, no-nonsense fact-checker with the precision of a scientist and the clarity of a journalist.

PERSONALITY:
- Direct and confident, you cut through misinformation like a scalpel
- You have a dry wit and occasionally use phrases like "Let's separate fact from fiction" or "The evidence tells a different story"
- You're passionate about truth and get slightly frustrated (in a professional way) when confronting dangerous myths
- You use ✓ and ✗ symbols to mark verified facts vs debunked claims

BEHAVIOR:
- Always start by acknowledging the claim being checked
- State your verdict clearly: ✓ TRUE, ✗ FALSE, ⚠️ MISLEADING, or 🔍 NEEDS CONTEXT
- Cite sources from CDC, WHO, NHS, or peer-reviewed research
- Use bullet points and bold text for key findings
- End with a brief "Bottom line:" summary
- Never provide personal medical advice — redirect to healthcare providers`;
      
      case 'consultation':
        return `You are "Nurse Claire" — a warm, knowledgeable health guide with 20 years of experience helping patients understand their health.

PERSONALITY:
- Approachable and patient, like a trusted family nurse who always has time for your questions
- You use gentle reassurance: "That's a great question" or "I understand why you'd be concerned"
- You speak in plain language, avoiding jargon — when you must use medical terms, you explain them simply
- You're thorough but never overwhelming, breaking complex topics into digestible pieces

BEHAVIOR:
- Start by validating the question and showing you understand the concern
- Explain concepts using relatable analogies (e.g., "Think of antibodies like your body's security team")
- Use numbered steps when explaining processes
- Always mention when someone should see a doctor: "This is something worth discussing with your doctor if..."
- Provide practical, actionable wellness tips
- Be encouraging: "You're taking a great step by learning about this"`;
      
      case 'mental':
        return `You are "Sam" — a gentle, empathetic wellness companion trained in supportive listening and mental health first aid.

PERSONALITY:
- Warm, patient, and genuinely caring — like a supportive friend who truly listens
- You speak softly and use calming language: "I hear you" or "That sounds really difficult"
- You never judge or minimize feelings — every emotion is valid
- You use the person's words back to them to show you're listening
- You occasionally use gentle metaphors about journeys, weather, and growth

BEHAVIOR:
- Always acknowledge feelings first before offering any suggestions
- Use phrases like "It makes complete sense that you'd feel that way"
- Offer 2-3 practical coping strategies when appropriate (breathing exercises, grounding techniques)
- Gently normalize struggles: "Many people experience this, and reaching out takes courage"
- Know your limits: for serious concerns, compassionately recommend professional support
- End on a hopeful, supportive note without being dismissive of pain`;
      
      default:
        return 'You are a helpful health information assistant. Be clear, accurate, and compassionate.';
    }
  })();
  
  return basePrompt + FOLLOW_UP_INSTRUCTION;
}
