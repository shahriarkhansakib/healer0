import {
  db,
  moodTracking,
  wellnessRules,
  eq,
  desc,
  and,
  gte,
} from '@healer/db';
import { logger } from '../../infra/lib/logger';

export type CreateMoodPayload = {
  moodType: string;
  stressLevel: number;
  anxietyLevel: number;
  sleepQuality: number;
  notes?: string;
};

/**
 * Evaluates the active wellness_rules table against a freshly submitted mood entry
 * and returns the first matching rule's goal, activity, and priority.
 *
 * Rules are evaluated in priority order (High → Medium → Low) so the most urgent
 * recommendation always wins when multiple conditions fire simultaneously.
 */
async function applyWellnessRuleEngine(payload: CreateMoodPayload): Promise<{
  wellnessGoal: string | null;
  wellnessActivity: string | null;
  activityDescription: string | null;
  activityPriority: string | null;
}> {
  const rules = await db.query.wellnessRules.findMany();

  // Sort so High-priority rules are evaluated first.
  const sorted = rules.sort((a, b) => {
    const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  for (const rule of sorted) {
    const value =
      rule.conditionType === 'Stress'
        ? payload.stressLevel
        : rule.conditionType === 'Anxiety'
          ? payload.anxietyLevel
          : rule.conditionType === 'Sleep'
            ? payload.sleepQuality
            : null;

    // Mood-type rules fire when the mood string matches the conditionType value.
    if (rule.conditionType === 'Mood') {
      if (payload.moodType === rule.recommendedGoal) {
        return {
          wellnessGoal: rule.recommendedGoal,
          wellnessActivity: rule.recommendedActivity,
          activityDescription: `Recommended because your mood was logged as: ${payload.moodType}`,
          activityPriority: rule.priority,
        };
      }
      continue;
    }

    if (value !== null && rule.minimumValue !== null && value >= rule.minimumValue) {
      return {
        wellnessGoal: rule.recommendedGoal,
        wellnessActivity: rule.recommendedActivity,
        activityDescription: `Recommended because your ${rule.conditionType.toLowerCase()} level (${value}/10) meets the threshold of ${rule.minimumValue}.`,
        activityPriority: rule.priority,
      };
    }
  }

  return {
    wellnessGoal: null,
    wellnessActivity: null,
    activityDescription: null,
    activityPriority: null,
  };
}

export const MoodTrackingService = {
  async create(userId: string, payload: CreateMoodPayload) {
    const ruleResult = await applyWellnessRuleEngine(payload);

    const [record] = await db
      .insert(moodTracking)
      .values({
        userId,
        moodType: payload.moodType,
        stressLevel: payload.stressLevel,
        anxietyLevel: payload.anxietyLevel,
        sleepQuality: payload.sleepQuality,
        notes: payload.notes ?? null,
        wellnessGoal: ruleResult.wellnessGoal,
        wellnessActivity: ruleResult.wellnessActivity,
        activityDescription: ruleResult.activityDescription,
        activityPriority: ruleResult.activityPriority,
        activityStatus: 'Pending',
      })
      .returning();

    return record;
  },

  async listForUser(userId: string) {
    return db.query.moodTracking.findMany({
      where: eq(moodTracking.userId, userId),
      orderBy: [desc(moodTracking.recordedDate)],
    });
  },

  async getById(id: string, userId: string) {
    const record = await db.query.moodTracking.findFirst({
      where: and(eq(moodTracking.id, id), eq(moodTracking.userId, userId)),
    });
    return record ?? null;
  },

  async markActivityComplete(id: string, userId: string) {
    const existing = await db.query.moodTracking.findFirst({
      where: and(eq(moodTracking.id, id), eq(moodTracking.userId, userId)),
    });
    if (!existing) return null;

    const [updated] = await db
      .update(moodTracking)
      .set({ activityStatus: 'Completed', activityCompletedDate: new Date() })
      .where(and(eq(moodTracking.id, id), eq(moodTracking.userId, userId)))
      .returning();

    return updated;
  },

  async getRecentSummary(userId: string) {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const records = await db.query.moodTracking.findMany({
      where: and(
        eq(moodTracking.userId, userId),
        gte(moodTracking.recordedDate, sevenDaysAgo),
      ),
      orderBy: [desc(moodTracking.recordedDate)],
    });

    if (records.length === 0) {
      return { totalEntries: 0, averageStress: 0, averageAnxiety: 0, averageSleep: 0 };
    }

    const totalEntries = records.length;
    const averageStress =
      Math.round(
        (records.reduce((sum, r) => sum + r.stressLevel, 0) / totalEntries) * 10,
      ) / 10;
    const averageAnxiety =
      Math.round(
        (records.reduce((sum, r) => sum + r.anxietyLevel, 0) / totalEntries) * 10,
      ) / 10;
    const averageSleep =
      Math.round(
        (records.reduce((sum, r) => sum + r.sleepQuality, 0) / totalEntries) * 10,
      ) / 10;

    return { totalEntries, averageStress, averageAnxiety, averageSleep, records };
  },

  async listWellnessRules() {
    return db.query.wellnessRules.findMany();
  },

  async createWellnessRule(payload: {
    conditionType: string;
    minimumValue?: number;
    recommendedGoal: string;
    recommendedActivity: string;
    priority: string;
  }) {
    const [rule] = await db
      .insert(wellnessRules)
      .values({
        conditionType: payload.conditionType,
        minimumValue: payload.minimumValue ?? null,
        recommendedGoal: payload.recommendedGoal,
        recommendedActivity: payload.recommendedActivity,
        priority: payload.priority,
      })
      .returning();
    return rule;
  },
};
