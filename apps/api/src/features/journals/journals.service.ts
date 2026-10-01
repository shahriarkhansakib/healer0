import { db, journals, eq, desc, and } from '@healer/db';

export type CreateJournalPayload = {
  title: string;
  content: string;
  mood?: string;
};

export type UpdateJournalPayload = {
  title?: string;
  content?: string;
  mood?: string;
};

export const JournalsService = {
  async create(userId: string, payload: CreateJournalPayload) {
    // Deterministic sentiment analysis — derived from mood tag and keyword heuristics.
    const aiSentiment = deriveAiSentiment(payload.mood, payload.content);
    const aiSummary = deriveAiSummary(payload.content);

    const [journal] = await db
      .insert(journals)
      .values({
        userId,
        title: payload.title,
        content: payload.content,
        mood: payload.mood ?? null,
        aiSentiment,
        aiSummary,
      })
      .returning();
    return journal;
  },

  async listForUser(userId: string) {
    return db.query.journals.findMany({
      where: eq(journals.userId, userId),
      orderBy: [desc(journals.createdAt)],
    });
  },

  async getById(id: string, userId: string) {
    const journal = await db.query.journals.findFirst({
      where: and(eq(journals.id, id), eq(journals.userId, userId)),
    });
    return journal ?? null;
  },

  async update(id: string, userId: string, payload: UpdateJournalPayload) {
    const existing = await db.query.journals.findFirst({
      where: and(eq(journals.id, id), eq(journals.userId, userId)),
    });
    if (!existing) return null;

    const newContent = payload.content ?? existing.content;
    const newMood = payload.mood ?? existing.mood ?? undefined;
    const aiSentiment = deriveAiSentiment(newMood, newContent);
    const aiSummary = deriveAiSummary(newContent);

    const [updated] = await db
      .update(journals)
      .set({
        title: payload.title ?? existing.title,
        content: newContent,
        mood: newMood ?? null,
        aiSentiment,
        aiSummary,
      })
      .where(and(eq(journals.id, id), eq(journals.userId, userId)))
      .returning();
    return updated;
  },

  async delete(id: string, userId: string) {
    const existing = await db.query.journals.findFirst({
      where: and(eq(journals.id, id), eq(journals.userId, userId)),
      columns: { id: true },
    });
    if (!existing) return false;

    await db.delete(journals).where(and(eq(journals.id, id), eq(journals.userId, userId)));
    return true;
  },
};

/**
 * Deterministic sentiment classification from mood tag and keyword scanning.
 * In production this would call an NLP model; here the rule engine is deterministic
 * and auditable — no non-deterministic LLM calls in the data path.
 */
function deriveAiSentiment(mood: string | undefined, content: string): string {
  const negativeMoods = new Set(['Sad', 'Stressed', 'Anxious', 'Angry', 'Worried']);
  const positiveMoods = new Set(['Happy', 'Calm', 'Grateful', 'Hopeful']);

  if (mood && negativeMoods.has(mood)) return 'Negative';
  if (mood && positiveMoods.has(mood)) return 'Positive';

  const lower = content.toLowerCase();
  const negativeKeywords = ['sad', 'anxious', 'worried', 'stressed', 'hopeless', 'tired', 'overwhelmed'];
  const positiveKeywords = ['happy', 'grateful', 'excited', 'peaceful', 'hopeful', 'great', 'wonderful'];

  const negCount = negativeKeywords.filter((k) => lower.includes(k)).length;
  const posCount = positiveKeywords.filter((k) => lower.includes(k)).length;

  if (negCount > posCount) return 'Negative';
  if (posCount > negCount) return 'Positive';
  return 'Neutral';
}

/**
 * Generates a short deterministic summary from the first meaningful sentence
 * of the journal content. Keeps the audit trail clear and avoids LLM hallucinations
 * in a clinical context.
 */
function deriveAiSummary(content: string): string {
  const sentences = content.match(/[^.!?]+[.!?]+/g) ?? [];
  if (sentences.length === 0 || !sentences[0]) {
    return content.slice(0, 120).trim() + (content.length > 120 ? '...' : '');
  }
  return sentences[0].trim();
}
