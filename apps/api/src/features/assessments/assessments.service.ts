import {
  db,
  assessments,
  assessmentQuestions,
  assessmentResults,
  eq,
  desc,
  asc,
  and,
} from '@healer/db';

export type SubmitAssessmentPayload = {
  answers: Record<string, string>; // { questionId: selectedOptionId } e.g. { "q1": "B" }
};

export interface ClinicalEvaluationResult {
  score: number;
  maxScore: number;
  percentage: number;
  severityLevel: string;
  identifiedProblem: string;
  clinicalSummary: string;
  requiresFollowUp: boolean;
  suggestedFollowUp: string;
  crisisAlert: boolean;
  aiRecommendation: string;
}

/**
 * Normalizes an option key so both "A" and "option_a" match correctly.
 */
function normalizeOptionKey(key: string): string {
  const clean = key.trim().toLowerCase();
  if (clean.startsWith('option_')) {
    return clean.replace('option_', '').toUpperCase();
  }
  return clean.toUpperCase();
}

/**
 * Evaluates the total score and compares against validated clinical scoring ranges.
 */
function evaluateAssessmentScore(
  assessmentCode: string | null | undefined,
  category: string,
  totalScore: number,
  maxScore: number,
  crisisFlag: boolean,
): {
  severityLevel: string;
  identifiedProblem: string;
  clinicalSummary: string;
  requiresFollowUp: boolean;
  suggestedFollowUp: string;
  crisisAlert: boolean;
  aiRecommendation: string;
} {
  const code = (assessmentCode || '').toUpperCase();

  // Helper to normalize raw scores when question count differs from baseline standard instrument
  const normScore = (baseMax: number) => {
    if (maxScore <= 0) return totalScore;
    return (totalScore / maxScore) * baseMax;
  };

  // 1. PHQ-9 (Depressive Symptoms: 0 - 27)
  if (code === 'PHQ9' || category.toLowerCase().includes('depression')) {
    const stdScore = Math.round(normScore(27));
    const scoreText = maxScore === 27 ? `${totalScore}/${maxScore}` : `${totalScore}/${maxScore} (${stdScore}/27 standardized)`;

    let severityLevel = 'Minimal';
    let identifiedProblem = 'Minimal or No Depressive Symptoms';
    let clinicalSummary = `Your score of ${scoreText} falls in the minimal range (0–4). Your responses indicate typical day-to-day fluctuations without significant depressive symptom severity.`;
    let requiresFollowUp = false;
    let suggestedFollowUp = 'No clinical follow-up required. Maintain healthy lifestyle habits, restful sleep, and positive daily routines.';

    if (stdScore >= 20) {
      severityLevel = 'Severe';
      identifiedProblem = 'Severe Depressive Symptoms (Possible Major Depression)';
      clinicalSummary = `Your score of ${scoreText} falls in the severe range (20–27). Your responses indicate frequent, intense symptoms that significantly impair daily concentration, motivation, and vitality.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Urgent psychiatric consultation strongly recommended. Please schedule an evaluation with Dr. Asif Mahmud or our Behavioral Health department promptly.';
    } else if (stdScore >= 15) {
      severityLevel = 'Moderately Severe';
      identifiedProblem = 'Moderately Severe Depressive Disorder Symptoms';
      clinicalSummary = `Your score of ${scoreText} falls in the moderately severe range (15–19). Symptoms are present for most days and likely interfere with work, personal relationships, or routine tasks.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Active clinical treatment recommended. We recommend scheduling an appointment with a psychiatrist or clinical psychologist for evidence-based therapy.';
    } else if (stdScore >= 10) {
      severityLevel = 'Moderate';
      identifiedProblem = 'Moderate Depressive Symptoms';
      clinicalSummary = `Your score of ${scoreText} falls in the moderate range (10–14). You are experiencing noticeable low mood, fatigue, or diminished interest in activities.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Clinical consultation with a licensed therapist or physician recommended. Cognitive Behavioral Therapy (CBT) and structured counseling can be highly beneficial.';
    } else if (stdScore >= 5) {
      severityLevel = 'Mild';
      identifiedProblem = 'Mild Depressive Symptoms';
      clinicalSummary = `Your score of ${scoreText} falls in the mild range (5–9). Symptoms appear intermittent and may be related to temporary stressors.`;
      requiresFollowUp = false;
      suggestedFollowUp = 'Watchful waiting recommended. Explore our guided self-care modules, meditation exercises, and mood journaling to support recovery.';
    }

    if (crisisFlag) {
      clinicalSummary += ' Urgent: Thoughts related to self-harm were indicated.';
      suggestedFollowUp = 'CRITICAL: Thoughts of self-harm were noted. Immediate support is strongly advised. Connect with the 988 Suicide & Crisis Lifeline (call/text 988) or emergency services right away.';
      requiresFollowUp = true;
    }

    return {
      severityLevel,
      identifiedProblem,
      clinicalSummary,
      requiresFollowUp,
      suggestedFollowUp,
      crisisAlert: crisisFlag,
      aiRecommendation: suggestedFollowUp,
    };
  }

  // 2. GAD-7 (Anxiety Symptoms: 0 - 21)
  if (code === 'GAD7' || category.toLowerCase().includes('anxiety')) {
    const stdScore = Math.round(normScore(21));
    const scoreText = maxScore === 21 ? `${totalScore}/${maxScore}` : `${totalScore}/${maxScore} (${stdScore}/21 standardized)`;

    let severityLevel = 'Minimal';
    let identifiedProblem = 'Minimal Anxiety Symptoms';
    let clinicalSummary = `Your score of ${scoreText} falls in the minimal range (0–4). General tension and worry appear within the expected normal baseline.`;
    let requiresFollowUp = false;
    let suggestedFollowUp = 'No clinical follow-up required. Continue regular stress management and mindfulness practices.';

    if (stdScore >= 15) {
      severityLevel = 'Severe';
      identifiedProblem = 'Severe Generalized Anxiety Disorder Symptoms';
      clinicalSummary = `Your score of ${scoreText} falls in the severe range (15–21). Persistent worry, physiological tension, and restlessness are causing significant distress.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Comprehensive clinical evaluation strongly recommended. Consider booking a dedicated anxiety consultation with Dr. Asif Mahmud.';
    } else if (stdScore >= 10) {
      severityLevel = 'Moderate';
      identifiedProblem = 'Moderate Generalized Anxiety Symptoms';
      clinicalSummary = `Your score of ${scoreText} falls in the moderate range (10–14). Frequent uncontrollable worry, nervousness, or difficulty relaxing are present.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Professional consultation advised. A clinical therapist can guide you through evidence-based cognitive restructuring and relaxation strategies.';
    } else if (stdScore >= 5) {
      severityLevel = 'Mild';
      identifiedProblem = 'Mild Anxiety Symptoms';
      clinicalSummary = `Your score of ${scoreText} falls in the mild range (5–9). Tension may be elevated due to situational challenges.`;
      requiresFollowUp = false;
      suggestedFollowUp = 'Self-management recommended. Utilize our box breathing exercises, progressive muscle relaxation, and calming soundscapes.';
    }

    return {
      severityLevel,
      identifiedProblem,
      clinicalSummary,
      requiresFollowUp,
      suggestedFollowUp,
      crisisAlert: false,
      aiRecommendation: suggestedFollowUp,
    };
  }

  // 3. K6 (General Psychological Distress: 0 - 24)
  if (code === 'K6' || category.toLowerCase().includes('distress')) {
    const stdScore = Math.round(normScore(24));
    const isHighDistress = stdScore >= 13;
    const scoreText = maxScore === 24 ? `${totalScore}/${maxScore}` : `${totalScore}/${maxScore} (${stdScore}/24 standardized)`;

    return {
      severityLevel: isHighDistress ? 'High' : 'Low',
      identifiedProblem: isHighDistress
        ? 'High Non-Specific Psychological Distress'
        : 'Low Psychological Distress',
      clinicalSummary: isHighDistress
        ? `Your score of ${scoreText} meets or exceeds the validated cutpoint of 13. This indicates elevated non-specific psychological distress and cognitive fatigue.`
        : `Your score of ${scoreText} is below the cutpoint of 13. Your overall psychological distress is within the typical range.`,
      requiresFollowUp: isHighDistress,
      suggestedFollowUp: isHighDistress
        ? 'A formal clinical screening with a mental health professional is recommended to explore distress factors.'
        : 'Maintain healthy sleep hygiene and social connections.',
      crisisAlert: false,
      aiRecommendation: isHighDistress
        ? 'Clinical mental health consultation recommended.'
        : 'Maintain wellness routines.',
    };
  }

  // 4. RSES (Rosenberg Self-Esteem Scale: 0 - 30)
  if (code === 'RSES' || category.toLowerCase().includes('esteem')) {
    const stdScore = Math.round(normScore(30));
    const scoreText = maxScore === 30 ? `${totalScore}/${maxScore}` : `${totalScore}/${maxScore} (${stdScore}/30 standardized)`;

    let severityLevel = 'Normal';
    let identifiedProblem = 'Normal & Healthy Self-Esteem';
    let requiresFollowUp = false;
    let suggestedFollowUp = 'Your self-esteem reflects a balanced, healthy attitude toward self-worth.';

    if (stdScore < 15) {
      severityLevel = 'Low';
      identifiedProblem = 'Low Perceived Self-Esteem / Self-Worth';
      requiresFollowUp = true;
      suggestedFollowUp = 'Consider supportive counseling or CBT therapy focusing on self-compassion and overcoming self-critical patterns.';
    } else if (stdScore >= 26) {
      severityLevel = 'High';
      identifiedProblem = 'High Self-Esteem & Self-Confidence';
      suggestedFollowUp = 'You demonstrate strong self-confidence and resilient self-regard.';
    }

    return {
      severityLevel,
      identifiedProblem,
      clinicalSummary: `Your score is ${scoreText}. Self-esteem is a continuum reflecting how much value and confidence you place in yourself.`,
      requiresFollowUp,
      suggestedFollowUp,
      crisisAlert: false,
      aiRecommendation: suggestedFollowUp,
    };
  }

  // 5. WHO-5 (Well-Being Index: 0 - 25 raw, converted to 0 - 100)
  if (code === 'WHO5' || category.toLowerCase().includes('well-being')) {
    const percentageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const reducedWellBeing = percentageScore <= 50;

    return {
      severityLevel: reducedWellBeing ? 'Reduced' : 'Adequate',
      identifiedProblem: reducedWellBeing
        ? 'Reduced Positive Well-Being (Depression Risk Indicator)'
        : 'Adequate & Positive Psychological Well-Being',
      clinicalSummary: `Your standardized WHO-5 score is ${percentageScore}/100 (Raw: ${totalScore}/${maxScore}). ${
        reducedWellBeing
          ? 'Scores at or below 50 indicate reduced emotional vitality and suggest potential risk of low mood or burnout.'
          : 'Scores above 50 indicate good psychological vitality and positive emotional well-being.'
      }`,
      requiresFollowUp: reducedWellBeing,
      suggestedFollowUp: reducedWellBeing
        ? 'We recommend speaking with a healthcare professional or doctor to review underlying fatigue, mood, or stress factors.'
        : 'Keep nurturing habits that promote joy, movement, and meaningful relationships.',
      crisisAlert: false,
      aiRecommendation: reducedWellBeing
        ? 'Clinical review for emotional vitality and depression screening advised.'
        : 'Continue positive lifestyle habits.',
    };
  }

  // 6. GSE (General Self-Efficacy: 10 - 40)
  if (code === 'GSE' || category.toLowerCase().includes('efficacy')) {
    const stdScore = Math.round(normScore(40));
    const scoreText = maxScore === 40 ? `${totalScore}/${maxScore}` : `${totalScore}/${maxScore} (${stdScore}/40 standardized)`;

    let severityLevel = 'Moderate';
    let identifiedProblem = 'Moderate Self-Efficacy & Coping';
    let suggestedFollowUp = 'You have a stable sense of personal agency to handle everyday difficulties.';

    if (stdScore < 26) {
      severityLevel = 'Low';
      identifiedProblem = 'Low Coping Confidence / Difficulties with Demands';
      suggestedFollowUp = 'Resilience building, stress mitigation, and solution-focused therapy can assist in strengthening self-efficacy.';
    } else if (stdScore >= 35) {
      severityLevel = 'High';
      identifiedProblem = 'High Self-Efficacy & Strong Adversity Resilience';
      suggestedFollowUp = 'You demonstrate high confidence in overcoming obstacles and tackling challenging goals.';
    }

    return {
      severityLevel,
      identifiedProblem,
      clinicalSummary: `Your score is ${scoreText}. Self-efficacy reflects your belief in your capability to execute actions needed to handle situations.`,
      requiresFollowUp: stdScore < 26,
      suggestedFollowUp,
      crisisAlert: false,
      aiRecommendation: suggestedFollowUp,
    };
  }

  // 7. UCLA-3 (Loneliness: 3 - 9)
  if (code === 'UCLA3' || category.toLowerCase().includes('loneliness')) {
    const stdScore = Math.round(normScore(9));
    const scoreText = maxScore === 9 ? `${totalScore}/${maxScore}` : `${totalScore}/${maxScore} (${stdScore}/9 standardized)`;

    let severityLevel = 'Low';
    let identifiedProblem = 'Low Perceived Loneliness';
    let requiresFollowUp = false;
    let suggestedFollowUp = 'You report feeling socially connected with adequate companionship.';

    if (stdScore >= 8) {
      severityLevel = 'High';
      identifiedProblem = 'High Perceived Social Isolation & Relational Loneliness';
      requiresFollowUp = true;
      suggestedFollowUp = 'Consider exploring our community peer circles or consulting a counselor to work through loneliness and social isolation.';
    } else if (stdScore >= 6) {
      severityLevel = 'Moderate';
      identifiedProblem = 'Moderate Relational Loneliness';
      suggestedFollowUp = 'Engaging with supportive community groups or reconnecting with trusted contacts is encouraged.';
    }

    return {
      severityLevel,
      identifiedProblem,
      clinicalSummary: `Your score is ${scoreText}. Loneliness assesses subjective feelings of companionship, exclusion, and social disconnection.`,
      requiresFollowUp: stdScore >= 8,
      suggestedFollowUp,
      crisisAlert: false,
      aiRecommendation: suggestedFollowUp,
    };
  }

  // Fallback Generic Banding
  const ratio = maxScore > 0 ? totalScore / maxScore : 0;
  const severityLevel = ratio >= 0.7 ? 'High' : ratio >= 0.4 ? 'Medium' : 'Low';
  const requiresFollowUp = ratio >= 0.5;

  return {
    severityLevel,
    identifiedProblem: `${severityLevel} Symptom Severity on ${category}`,
    clinicalSummary: `Your score is ${totalScore}/${maxScore}.`,
    requiresFollowUp,
    suggestedFollowUp: requiresFollowUp
      ? 'A clinical consultation is recommended to discuss your responses.'
      : 'Maintain healthy lifestyle habits and monitor symptoms.',
    crisisAlert: false,
    aiRecommendation: requiresFollowUp
      ? 'Consultation with a mental health professional recommended.'
      : 'Continue regular wellness activities.',
  };
}

export const AssessmentsService = {
  async listAssessments(category?: string) {
    const all = await db.query.assessments.findMany({
      orderBy: [asc(assessments.createdAt)],
    });
    if (!category) return all;
    return all.filter((a) => a.category.toLowerCase() === category.toLowerCase());
  },

  async getAssessmentById(idOrCode: string) {
    // Check by ID first, then by code
    let assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, idOrCode),
    });

    if (!assessment) {
      assessment = await db.query.assessments.findFirst({
        where: eq(assessments.code, idOrCode.toUpperCase()),
      });
    }

    if (!assessment) return null;

    const questions = await db.query.assessmentQuestions.findMany({
      where: eq(assessmentQuestions.assessmentId, assessment.id),
      orderBy: [asc(assessmentQuestions.orderIndex)],
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
          options: [
            { id: 'A', label: q.optionA, score: q.scoreMapping.option_a ?? q.scoreMapping.A ?? 0 },
            { id: 'B', label: q.optionB, score: q.scoreMapping.option_b ?? q.scoreMapping.B ?? 1 },
            { id: 'C', label: q.optionC, score: q.scoreMapping.option_c ?? q.scoreMapping.C ?? 2 },
            { id: 'D', label: q.optionD, score: q.scoreMapping.option_d ?? q.scoreMapping.D ?? 3 },
          ],
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
    // 1. Retrieve the assessment
    let assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
    });

    if (!assessment) {
      assessment = await db.query.assessments.findFirst({
        where: eq(assessments.code, assessmentId.toUpperCase()),
      });
    }

    if (!assessment) return null;

    // 2. Retrieve all assessment questions in order
    const questions = await db.query.assessmentQuestions.findMany({
      where: eq(assessmentQuestions.assessmentId, assessment.id),
      orderBy: [asc(assessmentQuestions.orderIndex)],
    });

    let totalScore = 0;
    let maxPossibleScore = 0;
    let crisisFlag = false;

    // 3. Assign scores to answers and calculate total
    for (const question of questions) {
      // Determine question max score from options or score mapping
      const mapping = (question.scoreMapping || {}) as Record<string, number>;
      const optionsArray = (question.options || []) as Array<{ id: string; label: string; score: number }>;

      let questionMax = 0;
      if (optionsArray.length > 0) {
        questionMax = Math.max(...optionsArray.map((o) => o.score));
      } else if (Object.keys(mapping).length > 0) {
        questionMax = Math.max(...Object.values(mapping));
      }
      maxPossibleScore += questionMax;

      const selectedValue = payload.answers[question.id] || payload.answers[question.questionCode || ''];
      if (!selectedValue) continue;

      const normKey = normalizeOptionKey(selectedValue);
      let awardedScore = 0;

      // Look in options array first
      const foundOption = optionsArray.find(
        (o) => o.id.toUpperCase() === normKey || o.label.toLowerCase() === selectedValue.toLowerCase(),
      );

      if (foundOption) {
        awardedScore = foundOption.score;
      } else if (typeof mapping[normKey] === 'number') {
        awardedScore = mapping[normKey];
      } else if (typeof mapping[selectedValue] === 'number') {
        awardedScore = mapping[selectedValue];
      }

      totalScore += awardedScore;

      // Safety check: PHQ-9 item 9 (self-harm ideation)
      if (question.questionCode === 'PHQ9_09' && awardedScore > 0) {
        crisisFlag = true;
      }
    }

    // Fallback max score if not computable dynamically
    if (maxPossibleScore === 0) {
      maxPossibleScore = assessment.totalQuestions * 3;
    }

    // 4. Compare with validated ranges & generate screening results
    const evaluation = evaluateAssessmentScore(
      assessment.code,
      assessment.category,
      totalScore,
      maxPossibleScore,
      crisisFlag,
    );

    // 5. Store completed assessment record in database
    const [result] = await db
      .insert(assessmentResults)
      .values({
        userId,
        assessmentId: assessment.id,
        score: totalScore,
        maxScore: maxPossibleScore,
        severityLevel: evaluation.severityLevel,
        identifiedProblem: evaluation.identifiedProblem,
        clinicalSummary: evaluation.clinicalSummary,
        suggestedFollowUp: evaluation.suggestedFollowUp,
        requiresFollowUp: evaluation.requiresFollowUp,
        crisisAlert: evaluation.crisisAlert,
        answers: payload.answers,
        aiRecommendation: evaluation.aiRecommendation,
      })
      .returning();

    return {
      ...result,
      assessmentTitle: assessment.title,
      assessmentCategory: assessment.category,
      percentage: Math.round((totalScore / maxPossibleScore) * 100),
    };
  },

  async listResultsForUser(userId: string) {
    const results = await db.query.assessmentResults.findMany({
      where: eq(assessmentResults.userId, userId),
      orderBy: [desc(assessmentResults.completedDate)],
    });

    // Enrich with assessment titles and categories
    const allAssessments = await db.query.assessments.findMany();
    const assessmentMap = new Map(allAssessments.map((a) => [a.id, a]));

    return results.map((r) => {
      const parent = assessmentMap.get(r.assessmentId);
      return {
        ...r,
        assessmentTitle: parent?.title || 'Clinical Assessment',
        assessmentCategory: parent?.category || 'General',
      };
    });
  },

  async getResultById(id: string, userId: string) {
    const result = await db.query.assessmentResults.findFirst({
      where: and(eq(assessmentResults.id, id), eq(assessmentResults.userId, userId)),
    });
    if (!result) return null;

    const assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, result.assessmentId),
    });

    return {
      ...result,
      assessmentTitle: assessment?.title || 'Clinical Assessment',
      assessmentCategory: assessment?.category || 'General',
    };
  },
};
