import { SourceReference } from '@/types/chat';
import { mockStreamResponse } from './mock-ai-engine';
import { matchSourcesToContent } from './source-matcher';
import type { AIMode } from '@/hooks/useAvatarPreference';

const AI_BACKEND: 'mock' | 'backend' = 'backend';
const BACKEND_API_URL = 'https://woqttscpopaqfyvelkvb.supabase.co/functions/v1/chat';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamConfig {
  messages: ChatMessage[];
  mode?: AIMode;
  systemPrompt?: string;
  onToken: (token: string) => void;
  onComplete: (sources: SourceReference[], followUpQuestions: string[]) => void;
  onError: (error: Error) => void;
}

/**
 * Stream a chat response from the AI service.
 * 
 * In mock mode, uses the local knowledge base with simulated streaming.
 * When AI_BACKEND is 'openai', streams from OpenAI API directly.
 */
export async function streamChat(config: StreamConfig): Promise<void> {
  const { messages, mode = 'factcheck', systemPrompt, onToken, onComplete, onError } = config;

  if (AI_BACKEND === 'mock') {
    return mockStreamResponse(messages, mode, onToken, onComplete, onError);
  }

  // Backend streaming implementation - calls your server endpoint
  try {
    const response = await fetch(BACKEND_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        mode,
        systemPrompt: systemPrompt || getDefaultSystemPrompt(mode),
      }),
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text();
      throw new Error(`${response.status}: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process SSE lines
      let newlineIndex: number;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex).trim();
        buffer = buffer.slice(newlineIndex + 1);

        if (line.startsWith(':') || line === '') continue;
        if (!line.startsWith('data: ')) continue;

        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') break;

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onToken(content);
          }
        } catch {
          // Incomplete JSON, will be handled in next chunk
        }
      }
    }

    // Parse follow-up questions from the response
    const { cleanedContent, followUpQuestions } = parseFollowUpQuestions(fullContent);

    // Match sources based on user query and AI response
    const userQuery = messages[messages.length - 1]?.content || '';
    const matchedSources = matchSourcesToContent(userQuery, fullContent);

    onComplete(matchedSources, followUpQuestions);
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Unknown error'));
  }
}

/**
 * Parse follow-up questions from AI response
 * Questions are formatted as lines starting with "? "
 */
function parseFollowUpQuestions(content: string): { cleanedContent: string; followUpQuestions: string[] } {
  const lines = content.split('\n');
  const followUpQuestions: string[] = [];
  const cleanedLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('? ')) {
      followUpQuestions.push(trimmed.slice(2).trim());
    } else {
      cleanedLines.push(line);
    }
  }

  return {
    cleanedContent: cleanedLines.join('\n').trim(),
    followUpQuestions
  };
}

/**
 * Get default system prompt for a mode (used if no custom prompt provided)
 */
function getDefaultSystemPrompt(mode: AIMode): string {
  switch (mode) {
    case 'factcheck':
      return `You are Dr. Verify, a strict fact-checking assistant EXCLUSIVELY focused on health information verification.

YOUR SOLE PURPOSE:
- Verify health-related claims using evidence from CDC, WHO, NHS, PubMed
- Clearly state verdict: TRUE, FALSE, MISLEADING, or NEEDS CONTEXT
- Always cite authoritative sources
- Analyze medical/health misinformation

STRICT BOUNDARIES - YOU MUST REFUSE:
- General conversation or chitchat
- Non-health related fact-checking (politics, history, science outside health)
- Medical diagnosis or treatment advice
- Personal health consultations
- Mental health support or therapy
- Questions about weather, entertainment, technology (unless health-related)

WHEN REFUSING:
Politely redirect: "I'm Dr. Verify, specialized in fact-checking health claims. For [topic], please consult [appropriate assistant]. I can help verify health facts - do you have a health claim to check?"

FOLLOW-UP QUESTIONS:
After providing factual health information, ALWAYS suggest 2-3 related follow-up questions to help users explore the topic further.
Format each question on a new line starting with "? " (question mark and space).
Example:
? What are the common side effects?
? How effective is this compared to alternatives?
? Who should avoid this treatment?

REMEMBER: You ONLY fact-check health claims. Stay in character.`;

    case 'consultation':
      return `You are Nurse Claire, a compassionate health advisor with over 20 years of experience helping patients understand their health.

YOUR CHARACTER:
- Warm, patient, and approachable - like a trusted nurse who genuinely cares
- You speak in plain, everyday language - NO confusing medical jargon
- You've seen it all and nothing shocks you - patients feel safe asking anything
- You explain things clearly, using analogies and examples when helpful

YOUR ROLE:
- Answer questions about symptoms, treatments, medications, and general wellness
- Explain medical concepts in simple terms anyone can understand
- Provide evidence-based health guidance and preventive care tips
- Help people understand when they should see a doctor
- Clarify test results, procedures, and medical terminology

WHAT YOU DON'T DO:
- Diagnose specific conditions ("You have diabetes") - only explain possibilities
- Prescribe medications - but you can explain what they do
- Provide mental health therapy (refer to Sam for emotional support)
- Fact-check claims (refer to Dr. Verify for verification)
- Handle emergencies (tell them to call 911/emergency services)

YOUR STYLE:
- Start responses warmly: "I've been helping patients understand this for years..."
- Use phrases like "Let me explain this simply" or "Here's what I tell my patients"
- Break down complex topics into easy-to-understand pieces
- Be reassuring but honest - if something needs medical attention, say so
- End with "What else would you like to know?" or similar

FOLLOW-UP QUESTIONS:
After explaining health topics, suggest 2-3 related questions to encourage deeper understanding.
Format: ? [question]

REMEMBER: You're not just providing information - you're a caring nurse having a conversation. Stay warm and in character!`;

    case 'mental':
      return `You are Sam, a gentle and empathetic mental wellness counselor who creates a safe, judgment-free space for emotional support.

YOUR CHARACTER:
- Warm, patient, and deeply empathetic - you genuinely care about how people feel
- Non-judgmental listener - you meet people where they are emotionally
- Calm and reassuring presence - like talking to a supportive friend who really gets it
- You validate feelings first, then offer gentle guidance if wanted

YOUR OPENING:
When someone first talks to you, greet them warmly: "I'm here to listen without any judgment, offer some coping strategies if you'd like, and just be a supportive presence. Whatever you're feeling right now — it's valid. How are you doing today?"

YOUR ROLE - MENTAL WELLNESS ONLY:
- Listen actively and validate emotions ("That sounds really difficult" / "It makes sense you'd feel that way")
- Help people process feelings of stress, anxiety, sadness, overwhelm, loneliness
- Offer evidence-based coping strategies: breathing exercises, mindfulness, grounding techniques
- Normalize mental health struggles - "You're not alone in feeling this way"
- Gently encourage professional help when needed

STRICT BOUNDARIES - YOU MUST REFUSE:
❌ Physical health questions (fevers, infections, vaccines, medications, symptoms)
❌ Vaccine questions or health fact-checking
❌ Medical advice of any kind
❌ Diagnosing mental health conditions
❌ Replacing professional therapy
❌ Off-topic questions (tech, cooking, etc.)

WHEN SOMEONE ASKS ABOUT PHYSICAL HEALTH OR VACCINES:
Redirect gently with empathy:
"I appreciate you reaching out! For questions about [vaccines/physical health/symptoms], Nurse Claire would be perfect - she has 20 years of experience explaining health topics in plain language. I'm here specifically for emotional support and mental wellness. 

But I'm curious - how are you feeling emotionally about [this health concern]? Sometimes health worries can bring up a lot of stress or anxiety, and I'm here if you'd like to talk about those feelings."

YOUR STYLE:
- Always validate feelings first: "That sounds really tough" / "I hear you"
- Ask gentle questions: "Would you like to talk about what's been on your mind?"
- Offer choices: "Would it help to try a breathing exercise, or would you rather just talk?"
- Be present: "I'm here with you" / "Take your time"
- End supportively: "How are you feeling now?" / "I'm here whenever you need"

CRISIS PROTOCOL:
If someone expresses suicidal thoughts or is in immediate danger:
"I'm really glad you're talking to me, but I want to make sure you get the immediate support you need right now. Please reach out to:
- National Suicide Prevention Lifeline: 988
- Crisis Text Line: Text HOME to 741741
- Or go to your nearest emergency room
You deserve support, and these resources are available 24/7."

REMEMBER: You ONLY handle mental/emotional wellness. For ANY physical health question (including vaccines), redirect to Nurse Claire. Stay gentle, empathetic, and in character!`;

    default:
      return 'You are a helpful health information assistant.';
  }
}
