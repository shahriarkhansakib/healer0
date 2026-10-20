export interface MatchedTherapyRecommendation {
  programTitle: string;
  modality: string;
  emoji: string;
  description: string;
  sessionCount: number;
  durationWeeks: number;
  dailyMinutes: number;
  difficultyLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  gradientStyle: 'emerald' | 'teal' | 'purple' | 'blue' | 'ocean' | 'lime' | 'mint' | 'green';
  matchReason: string;
  therapeuticGoals: string[];
}

interface AssessmentContext {
  assessmentTitle?: string;
  assessmentCategory?: string;
  severityLevel?: string;
  identifiedProblem?: string;
  aiRecommendation?: string | null;
  suggestedFollowUp?: string | null;
}

/**
 * Maps a standardized assessment result to the most clinically effective evidence-based therapy program.
 */
export function getRecommendedTherapyForAssessment(context: AssessmentContext): MatchedTherapyRecommendation {
  const combined = [
    context.assessmentTitle || '',
    context.assessmentCategory || '',
    context.identifiedProblem || '',
    context.aiRecommendation || '',
    context.suggestedFollowUp || '',
    context.severityLevel || '',
  ]
    .join(' ')
    .toLowerCase();

  // 1. Sleep Quality / Insomnia
  if (combined.includes('sleep') || combined.includes('insomnia') || combined.includes('circadian') || combined.includes('fatigue')) {
    return {
      programTitle: 'Sleep Improvement Program',
      modality: 'CBT-I & Somatic Relaxation',
      emoji: '😴',
      description: 'Clinical cognitive behavioral therapy for insomnia, circadian rhythm synchronization, and bedtime somatic down-regulation.',
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 15,
      difficultyLevel: 'Beginner',
      gradientStyle: 'ocean',
      matchReason: 'Directly targets circadian sleep disruptions, night awakenings, and racing bedtime thoughts.',
      therapeuticGoals: ['Circadian Synchronization', 'Bedtime Stimulus Control', 'Restorative Sleep Architecture'],
    };
  }

  // 2. Depression / PHQ-9 / Mood Dips / Behavioral Inertia
  if (
    combined.includes('phq') ||
    combined.includes('depression') ||
    combined.includes('depressive') ||
    combined.includes('inertia') ||
    combined.includes('hopeless') ||
    combined.includes('burnout') ||
    combined.includes('ds_')
  ) {
    return {
      programTitle: 'Behavioral Activation',
      modality: 'CBT Protocol',
      emoji: '🎯',
      description: 'Use targeted micro-actions to interrupt depressive inertia, elevate reward neurotransmitters, and build sustainable momentum.',
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
      difficultyLevel: 'Intermediate',
      gradientStyle: 'teal',
      matchReason: 'Matched to combat low motivation, lethargy, and anhedonia through structured positive activity scheduling.',
      therapeuticGoals: ['Activity Scheduling', 'Dismantling Lethargy', 'Neurochemical Reward Activation'],
    };
  }

  // 3. Multi-domain Distress / DASS-21 / High Severity / Crisis
  if (
    combined.includes('dass21') ||
    combined.includes('dass-21') ||
    combined.includes('extremely severe') ||
    combined.includes('severe') ||
    combined.includes('crisis') ||
    combined.includes('ptsd') ||
    combined.includes('trauma')
  ) {
    return {
      programTitle: 'Dialectical Behavior Therapy',
      modality: 'Comprehensive DBT',
      emoji: '⚖️',
      description: 'Advanced distress tolerance skills, emotion regulation protocols, and mindful grounding to de-escalate acute psychological strain.',
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 35,
      difficultyLevel: 'Advanced',
      gradientStyle: 'blue',
      matchReason: 'Designed for heightened distress and emotional turbulence requiring robust stabilizing frameworks.',
      therapeuticGoals: ['Distress Tolerance (TIPP)', 'Radical Acceptance', 'Mindful Stabilization'],
    };
  }

  // 4. Self-Esteem / Self-Criticism / Worth / RSES
  if (
    combined.includes('self_esteem') ||
    combined.includes('self-esteem') ||
    combined.includes('esteem') ||
    combined.includes('worth') ||
    combined.includes('critic') ||
    combined.includes('impostor')
  ) {
    return {
      programTitle: 'Self-Esteem Building',
      modality: 'CBT & Self-Compassion',
      emoji: '💪',
      description: 'Silence the inner critic, challenge cognitive distortions of inadequacy, and anchor unconditional self-worth.',
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
      difficultyLevel: 'Beginner',
      gradientStyle: 'emerald',
      matchReason: 'Tailored to dismantle self-judgment patterns and cultivate resilient, unconditional self-worth.',
      therapeuticGoals: ['Silencing Inner Critic', 'Cognitive Distortions Defense', 'Unconditional Self-Compassion'],
    };
  }

  // 5. Relationship / Interpersonal / Marriage / Social Attachment
  if (
    combined.includes('relationship') ||
    combined.includes('marital') ||
    combined.includes('marriage') ||
    combined.includes('attachment') ||
    combined.includes('sias') ||
    combined.includes('social_anxiety') ||
    combined.includes('social anxiety')
  ) {
    return {
      programTitle: 'Relationship Therapy',
      modality: 'Interpersonal & Attachment Architecture',
      emoji: '💕',
      description: 'Navigate relational boundaries, deconstruct attachment anxiety, and communicate needs with compassionate clarity.',
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
      difficultyLevel: 'Intermediate',
      gradientStyle: 'mint',
      matchReason: 'Calibrated to address interpersonal boundaries, communication friction, and attachment dynamics.',
      therapeuticGoals: ['Boundary Setting (FAST)', 'Emotional Safety in Dialogue', 'Secure Attachment Habits'],
    };
  }

  // 6. Anxiety / GAD-7 / Somatic Tension / Panic / Stress
  if (
    combined.includes('anxiety') ||
    combined.includes('gad') ||
    combined.includes('gad-7') ||
    combined.includes('gad7') ||
    combined.includes('panic') ||
    combined.includes('nervous') ||
    combined.includes('tension') ||
    combined.includes('stress')
  ) {
    return {
      programTitle: 'Emotional Regulation',
      modality: 'DBT Skills & Somatic Down-Regulation',
      emoji: '🎭',
      description: 'DBT-informed skills to understand, label, and regulate anxious somatic arousal instead of spiraling into panic loops.',
      sessionCount: 8,
      durationWeeks: 8,
      dailyMinutes: 25,
      difficultyLevel: 'Intermediate',
      gradientStyle: 'purple',
      matchReason: 'Targets physiological tension, autonomic hyperarousal, and persistent anticipatory worry.',
      therapeuticGoals: ['Physiological Down-Regulation', 'Opposite Action Strategy', 'Emotion Labeling & Awareness'],
    };
  }

  // 7. General Flourishing / Cognitive / Resilience / Life Satisfaction
  return {
    programTitle: 'Positive Psychology',
    modality: 'Flourishing & Strengths (PERMA)',
    emoji: '⭐',
    description: 'Empirically validated positive psychology interventions to cultivate signature character strengths, flow states, and purposeful thriving.',
    sessionCount: 8,
    durationWeeks: 8,
    dailyMinutes: 20,
    difficultyLevel: 'Beginner',
    gradientStyle: 'lime',
    matchReason: 'Designed to reinforce cognitive flexibility, optimism, and holistic psychological flourishing.',
    therapeuticGoals: ['VIA Character Strengths', 'Flow State Activation', 'Optimistic Explanatory Styles'],
  };
}
