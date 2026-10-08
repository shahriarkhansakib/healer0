import {
  db,
  assessments,
  assessmentQuestions,
  assessmentResults,
  eq,
  desc,
  and,
} from '@healer/db';

export type SubmitAssessmentPayload = {
  answers: Record<string, string>; // { questionId: selectedOption } e.g. { "q1": "option_b" }
};

/**
 * Computes a total score by summing the numeric values from each question's
 * scoreMapping for the selected option. Questions with no match score 0.
 */
async function computeScore(
  assessmentId: string,
  answers: Record<string, string>,
): Promise<{ score: number; severityLevel: string }> {
  const questions = await db.query.assessmentQuestions.findMany({
    where: eq(assessmentQuestions.assessmentId, assessmentId),
  });

  let totalScore = 0;

  for (const question of questions) {
    const selectedOption = answers[question.id];
    if (!selectedOption) continue;

    const mapping = question.scoreMapping as Record<string, number>;
    const value = mapping[selectedOption];
    if (typeof value === 'number') {
      totalScore += value;
    }
  }

  // Generic severity banding — specific assessments like PHQ-9 or GAD-7 follow similar bands.
  let severityLevel = 'Low';
  if (totalScore >= 15) severityLevel = 'High';
  else if (totalScore >= 8) severityLevel = 'Medium';

  return { score: totalScore, severityLevel };
}

export const AssessmentsService = {
  async listAssessments(category?: string) {
    const all = await db.query.assessments.findMany();
    if (!category) return all;
    return all.filter((a) => a.category === category);
  },

  async getAssessmentById(id: string) {
    const assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, id),
    });
    if (!assessment) return null;

    const questions = await db.query.assessmentQuestions.findMany({
      where: eq(assessmentQuestions.assessmentId, id),
      orderBy: [desc(assessmentQuestions.orderIndex)],
    });

    return { ...assessment, questions };
  },

  async createAssessment(payload: {
    title: string;
    category: string;
    description: string;
    questions: Array<{
      questionText: string;
      optionA: string;
      optionB: string;
      optionC: string;
      optionD: string;
      scoreMapping: Record<string, number>;
      orderIndex: number;
    }>;
  }) {
    const [assessment] = await db
      .insert(assessments)
      .values({
        title: payload.title,
        category: payload.category,
        description: payload.description,
        totalQuestions: payload.questions.length,
      })
      .returning();

    const inserted = await db
      .insert(assessmentQuestions)
      .values(
        payload.questions.map((q) => ({
          assessmentId: assessment.id,
          questionText: q.questionText,
          optionA: q.optionA,
          optionB: q.optionB,
          optionC: q.optionC,
          optionD: q.optionD,
          scoreMapping: q.scoreMapping,
          orderIndex: q.orderIndex,
        })),
      )
      .returning();

    return { ...assessment, questions: inserted };
  },

  async submitAssessment(
    userId: string,
    assessmentId: string,
    payload: SubmitAssessmentPayload,
  ) {
    const assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
      columns: { id: true },
    });
    if (!assessment) return null;

    const { score, severityLevel } = await computeScore(assessmentId, payload.answers);

    // Deterministic AI recommendation based on severity band.
    const aiRecommendation =
      severityLevel === 'High'
        ? 'Your results suggest significant symptoms. We strongly recommend booking a session with a licensed mental health professional immediately.'
        : severityLevel === 'Medium'
          ? 'Your results indicate moderate symptoms. Consider scheduling an AI counseling session or speaking with a therapist.'
          : 'Your results indicate mild or no significant symptoms. Keep tracking your mood and maintain healthy habits.';

    const [result] = await db
      .insert(assessmentResults)
      .values({
        userId,
        assessmentId,
        score,
        severityLevel,
        aiRecommendation,
      })
      .returning();

    return result;
  },

  async listResultsForUser(userId: string) {
    return db.query.assessmentResults.findMany({
      where: eq(assessmentResults.userId, userId),
      orderBy: [desc(assessmentResults.completedDate)],
    });
  },

  async getResultById(id: string, userId: string) {
    const result = await db.query.assessmentResults.findFirst({
      where: and(eq(assessmentResults.id, id), eq(assessmentResults.userId, userId)),
    });
    return result ?? null;
  },
};
