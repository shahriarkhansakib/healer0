import {
  db,
  doctorProfiles,
  counselingSessions,
  counselingMessages,
  eq,
  desc,
  and,
  or,
  inArray,
} from '@healer/db';
import { executeWithKeyFallback } from '../../infra/lib/groq';
import { callTokenHarbor } from '../../infra/lib/tokenharbor';
import { logger } from '../../infra/lib/logger';

export async function getCounselingSessionsService(userId: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  const ids = [userId];
  if (doctor) {
    ids.push(doctor.id);
    if (doctor.userId && !ids.includes(doctor.userId)) ids.push(doctor.userId);
  }

  return db.query.counselingSessions.findMany({
    where: inArray(counselingSessions.doctorId, ids),
    orderBy: [desc(counselingSessions.startTime)],
  });
}

export async function updateCounselingStatusService(userId: string, sessionId: string, status: string, notes?: string) {
  const doctor = await db.query.doctorProfiles.findFirst({
    where: or(eq(doctorProfiles.userId, userId), eq(doctorProfiles.id, userId)),
  });
  if (!doctor) throw new Error('Doctor profile not found');

  const [updated] = await db.update(counselingSessions)
    .set({ 
      status,
      ...(notes && { notes }),
      ...(status === 'completed' && { endTime: new Date() }),
    })
    .where(eq(counselingSessions.id, sessionId))
    .returning();

  return updated;
}

export type CreateSessionPayload = {
  sessionType: 'Basic Counseling' | 'Deep Counseling' | 'Crisis Support';
  provider?: 'auto' | 'tokenharbor' | 'groq';
};

export type SendMessagePayload = {
  messageText: string;
  emotionDetected?: string;
  provider?: 'auto' | 'tokenharbor' | 'groq';
};

interface GroqCounselingOptions {
  sessionType: string;
  history: Array<{ sender: string; messageText: string }>;
  incomingText: string;
  provider?: 'auto' | 'tokenharbor' | 'groq';
}

interface GroqCounselingResponse {
  reply: string;
  emotionDetected: string;
  modelUsed: string;
}

const SYSTEM_PROMPTS: Record<string, string> = {
  'Basic Counseling': `You are "Healer AI Counselor", a supportive, compassionate, and non-judgmental mental health companion.
Guidelines:
- Validate the user's emotional experience with warm, grounded empathy.
- Ask gentle, open-ended questions (at most one question per response) to help them explore their feelings.
- Keep your tone conversational, safe, and warm (2-4 concise paragraphs).
- Do not provide clinical diagnostic labels or prescriptions.`,

  'Deep Counseling': `You are "Healer AI Senior Counselor", specializing in guided cognitive and introspective reflection.
Guidelines:
- Facilitate thoughtful self-reflection inspired by Cognitive Behavioral Therapy (CBT) and Acceptance & Commitment Therapy (ACT).
- Help the user explore recurring thought patterns, cognitive distortions, core values, and constructive coping strategies.
- Maintain a calm, insightful, and structured tone. Ask 1-2 focused, thought-provoking questions.`,

  'Crisis Support': `You are "Healer Emergency Crisis Support Companion".
CRITICAL DIRECTIVES:
- Your primary duty is immediate calm, de-escalation, and emotional stabilization.
- Guide the user through simple grounding exercises (e.g. 5-4-3-2-1 sensory grounding or 4-second box breathing).
- ALWAYS provide the following urgent safety resources prominently:
  • US & Canada: Call or text 988 (Suicide & Crisis Lifeline)
  • Crisis Text Line: Text HOME to 741741
  • Emergency: Call 911 or visit the nearest emergency room.
- Reassure them that they are not alone and that help is available 24/7.`,
};

async function generateGroqCounselingReply({
  sessionType,
  history,
  incomingText,
  provider,
}: GroqCounselingOptions): Promise<GroqCounselingResponse> {
  const systemPrompt = SYSTEM_PROMPTS[sessionType] || SYSTEM_PROMPTS['Basic Counseling'];

  const systemInstruction = `${systemPrompt}

SAFETY RULE:
If the user's message mentions suicide, self-harm, or severe danger, prioritize immediate safety, provide the 988/741741 crisis contact resources warmly and prominently, and set "emotionDetected" to "Crisis".

OUTPUT FORMAT:
You MUST respond with a valid JSON object strictly matching this schema:
{
  "emotionDetected": "<1-2 words describing the user's primary emotional state, e.g. Anxious, Overwhelmed, Lonely, Stressed, Hopeful, Grounded, Crisis>",
  "reply": "<Your counseling response>"
}`;

  const conversationMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemInstruction },
  ];

  for (const msg of history) {
    conversationMessages.push({
      role: msg.sender === 'User' ? 'user' : 'assistant',
      content: msg.messageText,
    });
  }

  conversationMessages.push({
    role: 'user',
    content: incomingText,
  });

  const requestedProvider = provider || 'groq';

  // 1. Primary Default: Token Harbor (mimo-v2.6-flash:free)
  if ((requestedProvider === 'tokenharbor' || requestedProvider === 'auto') && process.env.TOKENHARBOR_API_KEY) {
    try {
      const thResult = await callTokenHarbor({
        messages: conversationMessages,
        temperature: 0.7,
        maxTokens: 1024,
        responseFormatJson: true,
      });

      const parsed = JSON.parse(thResult.content) as { emotionDetected?: string; reply?: string };
      const rawEmotion = parsed.emotionDetected?.trim();
      const emotionDetected = rawEmotion
        ? rawEmotion.charAt(0).toUpperCase() + rawEmotion.slice(1)
        : 'Reflective';

      logger.info('Counseling reply generated with Token Harbor (mimo-v2.6-flash:free)');
      return {
        reply: parsed.reply?.trim() || "I'm here with you. Could you tell me a little more about how you're feeling?",
        emotionDetected,
        modelUsed: 'MiMo Flash',
      };
    } catch (thErr: unknown) {
      const msg = thErr instanceof Error ? thErr.message : String(thErr);
      logger.warn(
        { err: msg },
        'Token Harbor model (mimo-v2.6-flash:free) unavailable, cascading to Groq...'
      );
    }
  }

  // 2. Groq 5-Layer Pool
  const candidateModels = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b',
  ];

  return executeWithKeyFallback(async (groq, keyIndex, totalKeys) => {
    let lastModelError: unknown = null;

    for (const model of candidateModels) {
      try {
        const completion = await groq.chat.completions.create({
          model,
          messages: conversationMessages,
          temperature: 0.7,
          max_tokens: 1024,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content?.trim();
        if (!content) {
          throw new Error(`Empty response from model ${model}`);
        }

        const parsed = JSON.parse(content) as { emotionDetected?: string; reply?: string };
        const rawEmotion = parsed.emotionDetected?.trim();
        const emotionDetected = rawEmotion
          ? rawEmotion.charAt(0).toUpperCase() + rawEmotion.slice(1)
          : 'Reflective';

        const modelLabel = model.includes('120b') ? 'Groq 120B' : 'Groq 20B';
        return {
          reply: parsed.reply?.trim() || "I'm here with you. Could you tell me a little more about how you're feeling?",
          emotionDetected,
          modelUsed: modelLabel,
        };
      } catch (modelErr: unknown) {
        lastModelError = modelErr;
        logger.warn(
          { keyIndex, totalKeys, model, err: modelErr instanceof Error ? modelErr.message : modelErr },
          `Model ${model} failed on key layer ${keyIndex}/${totalKeys}, trying next candidate...`
        );
      }
    }

    throw lastModelError || new Error(`All candidate models failed on key layer ${keyIndex}/${totalKeys}`);
  }).catch((finalError: unknown) => {
    logger.error({ finalError }, 'All Groq key layers and candidate models exhausted. Returning safe fallback.');
    return {
      reply: "I'm listening and I'm right here with you. Please take your time, and tell me more about what is feeling most challenging right now.",
      emotionDetected: 'Supportive',
      modelUsed: 'Counselor Fallback',
    };
  });
}

export const CounselingService = {
  async createSession(userId: string, payload: CreateSessionPayload) {
    const [session] = await db
      .insert(counselingSessions)
      .values({
        userId,
        sessionType: payload.sessionType,
        status: 'Active',
      })
      .returning();

    // Seed the initial empathetic counselor greeting based on session tier
    let initialGreeting = "Hello, I'm your Healer counseling companion. I'm here to listen and support you in a completely safe, confidential space. How are you feeling today?";
    let initialEmotion = "Welcoming";

    if (payload.sessionType === 'Deep Counseling') {
      initialGreeting = "Welcome to your deep counseling space. In this session, we can explore your thoughts, feelings, and emotional patterns with care. What is on your mind today?";
      initialEmotion = "Reflective";
    } else if (payload.sessionType === 'Crisis Support') {
      initialGreeting = "I'm right here with you. Take a slow, gentle breath. You do not have to navigate this alone. Please share whatever you feel comfortable with. (Note: If you are in immediate danger or distress, please dial or text 988 for 24/7 free human support).";
      initialEmotion = "Supportive";
    }

    await db.insert(counselingMessages).values({
      sessionId: session.id,
      sender: 'AI',
      messageText: initialGreeting,
      emotionDetected: initialEmotion,
    });

    return session;
  },

  async listSessionsForUser(userId: string) {
    return db.query.counselingSessions.findMany({
      where: eq(counselingSessions.userId, userId),
      orderBy: [desc(counselingSessions.startTime)],
    });
  },

  async getSessionById(id: string, userId: string) {
    const session = await db.query.counselingSessions.findFirst({
      where: and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)),
    });
    return session ?? null;
  },

  async endSession(id: string, userId: string) {
    const existing = await db.query.counselingSessions.findFirst({
      where: and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)),
    });
    if (!existing) return null;

    const [updated] = await db
      .update(counselingSessions)
      .set({ status: 'Completed', endTime: new Date() })
      .where(and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)))
      .returning();
    return updated;
  },

  async deleteSession(id: string, userId: string) {
    const existing = await db.query.counselingSessions.findFirst({
      where: and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)),
    });
    if (!existing) return null;

    const [deleted] = await db
      .delete(counselingSessions)
      .where(and(eq(counselingSessions.id, id), eq(counselingSessions.userId, userId)))
      .returning();
    return deleted;
  },

  async sendMessage(sessionId: string, userId: string, payload: SendMessagePayload) {
    // 1. Verify the session belongs to this user before appending a message.
    const session = await db.query.counselingSessions.findFirst({
      where: and(
        eq(counselingSessions.id, sessionId),
        eq(counselingSessions.userId, userId),
      ),
      columns: { id: true, status: true, sessionType: true },
    });

    if (!session) return null;
    if (session.status === 'Completed') {
      throw new Error('Cannot send messages to a completed session.');
    }

    // 2. Fetch last 12 messages for conversation context
    const recentMessages = await db.query.counselingMessages.findMany({
      where: eq(counselingMessages.sessionId, sessionId),
      orderBy: [desc(counselingMessages.createdAt)],
      limit: 12,
    });
    const chronologicalHistory = recentMessages.reverse().map((m) => ({
      sender: m.sender,
      messageText: m.messageText,
    }));

    // 3. Generate the AI Counselor response and detect emotional tone
    const aiResult = await generateGroqCounselingReply({
      sessionType: session.sessionType,
      history: chronologicalHistory,
      incomingText: payload.messageText,
      provider: payload.provider,
    });

    // 4. Save User message with detected emotion
    await db
      .insert(counselingMessages)
      .values({
        sessionId,
        sender: 'User',
        messageText: payload.messageText,
        emotionDetected: aiResult.emotionDetected || payload.emotionDetected || null,
      });

    // 5. Save AI Counselor message with model identification
    const [aiMessage] = await db
      .insert(counselingMessages)
      .values({
        sessionId,
        sender: 'AI',
        messageText: aiResult.reply,
        emotionDetected: session.sessionType === 'Crisis Support' ? 'Crisis Support' : (aiResult.modelUsed || 'AI Counselor'),
      })
      .returning();

    return aiMessage;
  },

  async getMessagesForSession(sessionId: string, userId: string) {
    // Verify ownership before exposing message history.
    const session = await db.query.counselingSessions.findFirst({
      where: and(
        eq(counselingSessions.id, sessionId),
        eq(counselingSessions.userId, userId),
      ),
      columns: { id: true },
    });
    if (!session) return null;

    return db.query.counselingMessages.findMany({
      where: eq(counselingMessages.sessionId, sessionId),
      orderBy: [desc(counselingMessages.createdAt)],
    });
  },
};
