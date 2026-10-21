import {
  db,
  therapyPrograms,
  userTherapyProgress,
  eq,
  desc,
  and,
  or,
} from '@healer/db';

export const TherapyService = {
  async listPrograms(filters?: { category?: string; difficultyLevel?: string }) {
    const programs = await db.query.therapyPrograms.findMany();

    let result = programs;
    if (filters?.category) {
      result = result.filter((p) => p.category === filters.category);
    }
    if (filters?.difficultyLevel) {
      result = result.filter((p) => p.difficultyLevel === filters.difficultyLevel);
    }
    return result;
  },

  async getProgramById(id: string) {
    const program = await db.query.therapyPrograms.findFirst({
      where: eq(therapyPrograms.id, id),
    });
    return program ?? null;
  },

  async createProgram(payload: {
    title: string;
    resourceType: string;
    category: string;
    description: string;
    difficultyLevel?: string;
    durationMinutes?: number;
    sessionCount?: number;
    durationWeeks?: number;
    dailyMinutes?: number;
    emoji?: string;
    gradientStyle?: string;
    audioUrl?: string;
    videoUrl?: string;
  }) {
    const [program] = await db
      .insert(therapyPrograms)
      .values({
        title: payload.title,
        resourceType: payload.resourceType,
        category: payload.category,
        description: payload.description,
        difficultyLevel: payload.difficultyLevel ?? 'Beginner',
        durationMinutes: payload.durationMinutes ?? 10,
        sessionCount: payload.sessionCount ?? 8,
        durationWeeks: payload.durationWeeks ?? 8,
        dailyMinutes: payload.dailyMinutes ?? 25,
        emoji: payload.emoji ?? '🌿',
        gradientStyle: payload.gradientStyle ?? 'emerald',
        audioUrl: payload.audioUrl ?? null,
        videoUrl: payload.videoUrl ?? null,
      })
      .returning();
    return program;
  },

  async startProgress(userId: string, resourceId: string) {
    // Prevent duplicate progress records — upsert-style via onConflictDoNothing.
    const existing = await db.query.userTherapyProgress.findFirst({
      where: and(
        eq(userTherapyProgress.userId, userId),
        eq(userTherapyProgress.resourceId, resourceId),
      ),
    });
    if (existing) return existing;

    const [progress] = await db
      .insert(userTherapyProgress)
      .values({
        userId,
        resourceId,
        status: 'In Progress',
        progressPercentage: 0,
      })
      .returning();
    return progress;
  },

  async updateProgress(
    id: string,
    userId: string,
    payload: { progressPercentage: number; status?: string },
  ) {
    const existing = await db.query.userTherapyProgress.findFirst({
      where: and(
        eq(userTherapyProgress.id, id),
        eq(userTherapyProgress.userId, userId),
      ),
    });
    if (!existing) return null;

    const isCompleted =
      payload.status === 'Completed' || payload.progressPercentage >= 100;

    const [updated] = await db
      .update(userTherapyProgress)
      .set({
        progressPercentage: Math.min(payload.progressPercentage, 100),
        status: isCompleted ? 'Completed' : (payload.status ?? existing.status),
        completionTime: isCompleted ? new Date() : existing.completionTime,
      })
      .where(and(eq(userTherapyProgress.id, id), eq(userTherapyProgress.userId, userId)))
      .returning();
    return updated;
  },

  async listProgressForUser(userId: string) {
    return db.query.userTherapyProgress.findMany({
      where: eq(userTherapyProgress.userId, userId),
      orderBy: [desc(userTherapyProgress.startTime)],
    });
  },

  async resetProgramProgress(userId: string, identifier: string) {
    await db.delete(userTherapyProgress).where(
      and(
        eq(userTherapyProgress.userId, userId),
        or(
          eq(userTherapyProgress.resourceId, identifier),
          eq(userTherapyProgress.id, identifier),
        ),
      ),
    );
    return { success: true, message: 'Program progress has been reset.' };
  },

  async resetAllProgress(userId: string) {
    await db.delete(userTherapyProgress).where(eq(userTherapyProgress.userId, userId));
    return { success: true, message: 'All program progress has been reset.' };
  },
};
