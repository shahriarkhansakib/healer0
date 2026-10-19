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
  extraContext?: {
    answers?: Record<string, string>;
    questions?: Array<{ id: string; questionCode?: string | null; options?: any }>;
    safetyNotices?: string[];
  },
): {
  severityLevel: string;
  identifiedProblem: string;
  clinicalSummary: string;
  requiresFollowUp: boolean;
  suggestedFollowUp: string;
  crisisAlert: boolean;
  aiRecommendation: string;
} {
  const code = (assessmentCode || '').toLowerCase();
  const cat = (category || '').toLowerCase();

  // Helper to normalize raw scores when question count differs from baseline standard instrument
  const normScore = (baseMax: number) => {
    if (maxScore <= 0) return totalScore;
    return (totalScore / maxScore) * baseMax;
  };

  // ==========================================
  // Digitized Clinical Instruments (Uploaded Battery)
  // ==========================================
  // A. DASS-21 (Depression Anxiety Stress Scale)
  if (code === 'src_dass21') {
    let rawDep = 0;
    let rawAnx = 0;
    let rawStr = 0;
    const depQIndices = [3, 5, 10, 13, 16, 17, 21];
    const anxQIndices = [2, 4, 7, 9, 15, 19, 20];
    const strQIndices = [1, 6, 8, 11, 12, 14, 18];

    if (extraContext?.answers && extraContext?.questions) {
      for (const q of extraContext.questions) {
        const orderNum = parseInt(q.questionCode?.replace('src_dass21_', '') || '0', 10);
        const ansId = extraContext.answers[q.id];
        const opt = (q.options as Array<{ id: string; score: number }> | undefined)?.find((o) => o.id === ansId);
        const score = opt ? opt.score : 0;
        if (depQIndices.includes(orderNum)) rawDep += score;
        else if (anxQIndices.includes(orderNum)) rawAnx += score;
        else if (strQIndices.includes(orderNum)) rawStr += score;
      }
    } else {
      rawDep = Math.round(totalScore / 3);
      rawAnx = Math.round(totalScore / 3);
      rawStr = Math.round(totalScore / 3);
    }

    const finalDep = rawDep * 2;
    const finalAnx = rawAnx * 2;
    const finalStr = rawStr * 2;

    const getDepSev = (s: number) => (s <= 9 ? 'Normal' : s <= 13 ? 'Mild' : s <= 20 ? 'Moderate' : s <= 27 ? 'Severe' : 'Extremely Severe');
    const getAnxSev = (s: number) => (s <= 7 ? 'Normal' : s <= 9 ? 'Mild' : s <= 14 ? 'Moderate' : s <= 19 ? 'Severe' : 'Extremely Severe');
    const getStrSev = (s: number) => (s <= 14 ? 'Normal' : s <= 18 ? 'Mild' : s <= 25 ? 'Moderate' : s <= 33 ? 'Severe' : 'Extremely Severe');

    const depSev = getDepSev(finalDep);
    const anxSev = getAnxSev(finalAnx);
    const strSev = getStrSev(finalStr);

    const severityOrder = ['Normal', 'Mild', 'Moderate', 'Severe', 'Extremely Severe'];
    const maxSevIdx = Math.max(
      severityOrder.indexOf(depSev),
      severityOrder.indexOf(anxSev),
      severityOrder.indexOf(strSev),
    );
    const overallSeverity = severityOrder[maxSevIdx] || 'Moderate';
    const requiresFollowUp = maxSevIdx >= 2;

    return {
      severityLevel: overallSeverity,
      identifiedProblem: `${overallSeverity} Distress on DASS-21 Battery`,
      clinicalSummary: `DASS-21 Profile (scores multiplied by 2 per clinical protocol) — Depression: ${finalDep}/42 (${depSev}), Anxiety: ${finalAnx}/42 (${anxSev}), Stress: ${finalStr}/42 (${strSev}). Total raw sum: ${totalScore}.`,
      requiresFollowUp,
      suggestedFollowUp: requiresFollowUp
        ? 'A consultation with a licensed clinical psychologist or behavioral health counselor is recommended to address identified areas of distress.'
        : 'Scores reflect normal range experiences. Continue maintaining stress management and balanced self-care routines.',
      crisisAlert: crisisFlag,
      aiRecommendation: requiresFollowUp
        ? 'Structured Cognitive Behavioral Therapy (CBT) and clinical stress reduction consultation recommended.'
        : 'Continue routine wellness habits and mindful lifestyle balance.',
    };
  }

  // B. Depression Scale (DS — বিষণ্ণতা পরিমাপক)
  if (code === 'src_ds') {
    let severityLevel = 'Minimal';
    let requiresFollowUp = false;
    if (totalScore >= 124) {
      severityLevel = 'Severe';
      requiresFollowUp = true;
    } else if (totalScore >= 115) {
      severityLevel = 'Moderate';
      requiresFollowUp = true;
    } else if (totalScore >= 101) {
      severityLevel = 'Mild';
      requiresFollowUp = false;
    }

    const exceedsCutoff = totalScore >= 94;
    return {
      severityLevel,
      identifiedProblem: `${severityLevel} Depressive Symptoms (DS)`,
      clinicalSummary: `Your score of ${totalScore}/150 on the Depression Scale (বিষণ্ণতা পরিমাপক) reflects ${severityLevel.toLowerCase()} depressive symptoms.${exceedsCutoff ? ' Score exceeds the clinical screening cut-off of 94.' : ''}`,
      requiresFollowUp: requiresFollowUp || exceedsCutoff,
      suggestedFollowUp: (requiresFollowUp || exceedsCutoff)
        ? 'Clinical consultation with a licensed mental health professional recommended for comprehensive depression evaluation.'
        : 'Scores indicate low or minimal depressive symptom presence. Maintain healthy daily routines and social connectedness.',
      crisisAlert: crisisFlag,
      aiRecommendation: (requiresFollowUp || exceedsCutoff)
        ? 'Clinical psychotherapy evaluation recommended.'
        : 'Maintain mood journaling and positive behavioral activation.',
    };
  }

  // C. Anxiety Scale (AS — উদ্বেগ পরিমাপনের মানক)
  if (code === 'src_as') {
    let severityLevel = 'Mild';
    let requiresFollowUp = false;
    if (totalScore >= 78) {
      severityLevel = 'Profound';
      requiresFollowUp = true;
    } else if (totalScore >= 67) {
      severityLevel = 'Severe';
      requiresFollowUp = true;
    } else if (totalScore >= 55) {
      severityLevel = 'Moderate';
      requiresFollowUp = true;
    }

    const exceedsCutoff = totalScore >= 47.5;
    return {
      severityLevel,
      identifiedProblem: `${severityLevel} Anxiety Manifestation (AS)`,
      clinicalSummary: `Your score of ${totalScore}/144 on the Anxiety Scale (উদ্বেগ পরিমাপনের মানক) indicates ${severityLevel.toLowerCase()} anxiety.${exceedsCutoff ? ' Score exceeds the screening cut-off of 47.5.' : ''}`,
      requiresFollowUp: requiresFollowUp || exceedsCutoff,
      suggestedFollowUp: (requiresFollowUp || exceedsCutoff)
        ? 'Professional consultation with an anxiety specialist or psychiatrist recommended.'
        : 'Anxiety symptoms are mild and manageable. Practice diaphragmatic breathing and relaxation techniques.',
      crisisAlert: false,
      aiRecommendation: (requiresFollowUp || exceedsCutoff)
        ? 'Evidence-based relaxation therapy and cognitive behavioral interventions suggested.'
        : 'Continue regular stress-management practices.',
    };
  }

  // D. Dhaka University OCD Scale (DUOCS — ওসিডি পরিমাপক)
  if (code === 'src_duocs') {
    let severityLevel = 'Mild';
    let requiresFollowUp = false;
    if (totalScore >= 50) {
      severityLevel = 'Profound';
      requiresFollowUp = true;
    } else if (totalScore >= 41) {
      severityLevel = 'Severe';
      requiresFollowUp = true;
    } else if (totalScore >= 24) {
      severityLevel = 'Moderate';
      requiresFollowUp = true;
    }

    const exceedsCutoff = totalScore >= 17;
    return {
      severityLevel,
      identifiedProblem: `${severityLevel} Obsessive-Compulsive Tendencies (DUOCS)`,
      clinicalSummary: `Your score of ${totalScore}/80 on the Dhaka University OCD Scale (ওসিডি পরিমাপক) indicates ${severityLevel.toLowerCase()} obsessive-compulsive traits.${exceedsCutoff ? ' Exceeds the screening threshold of 17.' : ''}`,
      requiresFollowUp: requiresFollowUp || exceedsCutoff,
      suggestedFollowUp: (requiresFollowUp || exceedsCutoff)
        ? 'Specialized evaluation with an OCD / ERP (Exposure and Response Prevention) trained therapist recommended.'
        : 'Intrusive thoughts and checking behaviors appear within normative limits.',
      crisisAlert: false,
      aiRecommendation: (requiresFollowUp || exceedsCutoff)
        ? 'Exposure and Response Prevention (ERP) therapy consultation recommended.'
        : 'Practice mindfulness and cognitive diffusion for everyday thoughts.',
    };
  }

  // E. Social Interaction Anxiety Scale (SIAS — সামাজিক উদ্বেগ পরিমাপক)
  if (code === 'src_sias') {
    let severityLevel = 'Slightly';
    let requiresFollowUp = false;
    if (totalScore >= 61) {
      severityLevel = 'Extremely';
      requiresFollowUp = true;
    } else if (totalScore >= 41) {
      severityLevel = 'Very Much';
      requiresFollowUp = true;
    } else if (totalScore >= 21) {
      severityLevel = 'Moderately';
      requiresFollowUp = false;
    }

    return {
      severityLevel,
      identifiedProblem: `${severityLevel} Social Interaction Anxiety (SIAS)`,
      clinicalSummary: `Your score of ${totalScore}/80 on the Social Interaction Anxiety Scale (সামাজিক উদ্বেগ পরিমাপক) reflects ${severityLevel.toLowerCase()} social anxiety in interpersonal settings.`,
      requiresFollowUp,
      suggestedFollowUp: requiresFollowUp
        ? 'Cognitive Behavioral Therapy for social anxiety and gradual social exposure exercises recommended.'
        : 'Social comfort levels are within typical everyday ranges. Continue engaging in comfortable social connections.',
      crisisAlert: false,
      aiRecommendation: requiresFollowUp
        ? 'Social skills and anxiety desensitization coaching advised.'
        : 'Maintain healthy social interactions.',
    };
  }

  // F. Locke-Wallace Short Marital Adjustment Test (দাম্পত্য সম্পর্ক মানক)
  if (code === 'src_marital') {
    const isDistressed = totalScore < 100;
    const severityLevel = isDistressed ? 'Distressed' : 'Well-Adjusted';
    return {
      severityLevel,
      identifiedProblem: isDistressed ? 'Marital Relationship Distress' : 'Marital Relationship Satisfaction',
      clinicalSummary: `Your score of ${totalScore}/158 on the Marital Adjustment Test indicates ${isDistressed ? 'strained marital communication and distress (under clinical cutoff of 100)' : 'satisfying and harmonious marital adjustment'}. (Normative benchmarks: Satisfied couples average 135.9; distressed couples average 71.7).`,
      requiresFollowUp: isDistressed,
      suggestedFollowUp: isDistressed
        ? 'Couples counseling or marital therapy recommended to address communication patterns and mutual conflict resolution.'
        : 'Healthy marital foundation. Continue open communication and quality time rituals.',
      crisisAlert: false,
      aiRecommendation: isDistressed
        ? 'Emotionally Focused Couples Therapy (EFT) or Gottman Method counseling suggested.'
        : 'Maintain relational appreciation and shared activities.',
    };
  }

  // G. Love Obsessed Lover Checklist (অবসেসিভ লাভ চেকলিস্ট)
  if (code === 'src_love_obsession') {
    const isObsessive = totalScore > 3;
    let safetyTrigger = false;
    if (extraContext?.answers) {
      for (const [qId, optId] of Object.entries(extraContext.answers)) {
        if ((qId.includes('12') || qId.includes('13')) && (optId.includes('option_1') || optId.includes('yes'))) {
          safetyTrigger = true;
          break;
        }
      }
    }

    const severityLevel = isObsessive ? (safetyTrigger ? 'High Concern' : 'Obsessive Tendency') : 'Healthy Attachment';
    return {
      severityLevel,
      identifiedProblem: isObsessive ? 'Obsessive Romantic Preoccupation' : 'Healthy Romantic Attachment',
      clinicalSummary: `Your score of ${totalScore}/13 on the Love Obsessed Lover Checklist (লাভ অবসেসড চেকলিস্ট) indicates ${isObsessive ? 'heightened romantic obsession' : 'balanced attachment'}. (Reference average in Bangladesh: 6.5).${safetyTrigger ? ' Note: Affirmative response on safety-critical items (monitoring or destructive impulses) was detected.' : ''}`,
      requiresFollowUp: isObsessive || safetyTrigger,
      suggestedFollowUp: (isObsessive || safetyTrigger)
        ? 'Professional consultation with a relationship psychologist or licensed counselor is strongly advised to establish healthy personal boundaries and emotional autonomy.'
        : 'Responses reflect healthy relational attachment without obsessive boundaries breaches.',
      crisisAlert: safetyTrigger,
      aiRecommendation: (isObsessive || safetyTrigger)
        ? 'Relational boundary therapy and emotional regulation consultation recommended.'
        : 'Continue nurturing self-worth and mutually respectful relationship dynamics.',
    };
  }

  // 1. Depression Screening (PHQ9 / depression)
  if (code === 'phq9' || code === 'depression' || cat.includes('depression')) {
    const stdScore = Math.round(normScore(maxScore || 40));
    let severityLevel = 'Minimal';
    let identifiedProblem = 'Minimal or No Depressive Symptoms';
    let clinicalSummary = `Your score is ${totalScore}/${maxScore}. Your responses indicate typical day-to-day fluctuations without significant depressive symptom severity.`;
    let requiresFollowUp = false;
    let suggestedFollowUp = 'No clinical follow-up required. Maintain healthy lifestyle habits, restful sleep, and positive daily routines.';

    const thresholdSevere = maxScore === 27 ? 20 : 31;
    const thresholdModSevere = maxScore === 27 ? 15 : 21;
    const thresholdModerate = maxScore === 27 ? 10 : 11;
    const thresholdMild = maxScore === 27 ? 5 : 6;

    if (totalScore >= thresholdSevere) {
      severityLevel = 'Severe';
      identifiedProblem = 'Severe Depressive Symptom Reflection';
      clinicalSummary = `Your score of ${totalScore}/${maxScore} reflects frequent, intense difficulty that may significantly impair daily concentration, motivation, and vitality.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Comprehensive psychiatric consultation strongly recommended. Please consider scheduling an evaluation with our Behavioral Health department.';
    } else if (totalScore >= thresholdModSevere) {
      severityLevel = 'Moderate';
      identifiedProblem = 'Moderate Depressive Symptom Reflection';
      clinicalSummary = `Your score of ${totalScore}/${maxScore} indicates noticeable low mood, fatigue, or diminished interest in activities.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Clinical consultation with a licensed therapist recommended. Cognitive Behavioral Therapy (CBT) and structured counseling can be highly beneficial.';
    } else if (totalScore >= thresholdMild) {
      severityLevel = 'Mild';
      identifiedProblem = 'Mild Depressive Symptom Reflection';
      clinicalSummary = `Your score of ${totalScore}/${maxScore} indicates mild, intermittent mood dips that may relate to temporary stress or life demands.`;
      requiresFollowUp = false;
      suggestedFollowUp = 'Self-care practices, mood journaling, and guided relaxation exercises are encouraged.';
    }

    if (crisisFlag) {
      clinicalSummary += ' Immediate safety support: Responses indicated thoughts related to ending your life or self-harm.';
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

  // 2. Anxiety Screening (GAD7 / anxiety)
  if (code === 'gad7' || code === 'anxiety' || cat.includes('anxiety') && !code.includes('social')) {
    let severityLevel = 'Minimal';
    let identifiedProblem = 'Minimal Anxiety Symptoms';
    let clinicalSummary = `Your score of ${totalScore}/${maxScore} indicates tension and worry are within expected everyday baseline ranges.`;
    let requiresFollowUp = false;
    let suggestedFollowUp = 'No clinical follow-up required. Continue regular stress management and mindfulness practices.';

    const thresholdSevere = maxScore === 21 ? 15 : 31;
    const thresholdModerate = maxScore === 21 ? 10 : 21;
    const thresholdMild = maxScore === 21 ? 5 : 11;

    if (totalScore >= thresholdSevere) {
      severityLevel = 'Severe';
      identifiedProblem = 'High Anxiety Symptom Reflection';
      clinicalSummary = `Your score of ${totalScore}/${maxScore} reflects frequent uncontrollable worry, nervousness, and physiological tension.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Professional mental health consultation strongly advised for evidence-based cognitive restructuring and relaxation strategies.';
    } else if (totalScore >= thresholdModerate) {
      severityLevel = 'Moderate';
      identifiedProblem = 'Moderate Anxiety Symptom Reflection';
      clinicalSummary = `Your score of ${totalScore}/${maxScore} indicates noticeable anxiety and restlessness across situations.`;
      requiresFollowUp = true;
      suggestedFollowUp = 'Consultation with a clinical therapist recommended. Guided box breathing and stress reduction exercises can provide rapid relief.';
    } else if (totalScore >= thresholdMild) {
      severityLevel = 'Mild';
      identifiedProblem = 'Mild Anxiety Reflection';
      clinicalSummary = `Your score of ${totalScore}/${maxScore} indicates occasional nervousness or situational tension.`;
      requiresFollowUp = false;
      suggestedFollowUp = 'Self-care tools, progressive muscle relaxation, and calming meditation audio recommended.';
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

  // 3. Stress Assessment (stress)
  if (code === 'stress' || cat.includes('stress')) {
    const isHigh = totalScore >= 27;
    const isMod = totalScore >= 14;
    return {
      severityLevel: isHigh ? 'High' : isMod ? 'Moderate' : 'Low',
      identifiedProblem: isHigh ? 'Elevated Perceived Stress' : isMod ? 'Moderate Everyday Stress' : 'Low Perceived Stress',
      clinicalSummary: `Your perceived stress score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses reflect significant pressure, difficulty coping with demands, and feeling overwhelmed.'
          : isMod
          ? 'Responses indicate manageable situational stress with occasional overload.'
          : 'Responses indicate good coping balance and low perceived stress.'
      }`,
      requiresFollowUp: isHigh,
      suggestedFollowUp: isHigh
        ? 'Stress reduction counseling, time management evaluation, and biofeedback relaxation recommended.'
        : 'Maintain healthy boundaries, regular physical activity, and restorative sleep hygiene.',
      crisisAlert: false,
      aiRecommendation: isHigh ? 'Clinical consultation for stress mitigation advised.' : 'Continue positive stress management.',
    };
  }

  // 4. Burnout Assessment (burnout)
  if (code === 'burnout' || cat.includes('burnout')) {
    const isHigh = totalScore >= 27;
    const isMod = totalScore >= 14;
    return {
      severityLevel: isHigh ? 'High' : isMod ? 'Moderate' : 'Low',
      identifiedProblem: isHigh ? 'High Occupational Burnout & Exhaustion' : isMod ? 'Moderate Workplace Strain' : 'Low Burnout Risk',
      clinicalSummary: `Your burnout assessment score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses reflect chronic workplace exhaustion, cynicism, and diminished professional efficacy.'
          : isMod
          ? 'Responses reflect episodic work fatigue that warrants active boundary setting.'
          : 'Responses reflect healthy work engagement and sustainable occupational energy.'
      }`,
      requiresFollowUp: isHigh,
      suggestedFollowUp: isHigh
        ? 'Workplace mental health consultation, boundary restructuring, and clinical rest protocol recommended.'
        : 'Incorporate micro-breaks during the workday and maintain a clear separation between work and personal life.',
      crisisAlert: false,
      aiRecommendation: isHigh ? 'Occupational burnout intervention recommended.' : 'Maintain sustainable work boundaries.',
    };
  }

  // 5. Self-Esteem Scale (self_esteem / RSES)
  if (code === 'self_esteem' || code === 'rses' || cat.includes('esteem')) {
    const isLow = totalScore <= 14;
    const isHigh = totalScore >= 29;
    return {
      severityLevel: isLow ? 'Low' : isHigh ? 'High' : 'Moderate',
      identifiedProblem: isLow ? 'Low Perceived Self-Worth' : isHigh ? 'Strong Positive Self-Regard' : 'Balanced Self-Esteem',
      clinicalSummary: `Your self-esteem score is ${totalScore}/${maxScore}. ${
        isLow
          ? 'Responses indicate prominent feelings of self-criticism and doubt in personal worth.'
          : isHigh
          ? 'Responses indicate resilient self-confidence and healthy appreciation of personal strengths.'
          : 'Responses indicate a balanced, realistic view of self-worth with room for self-compassion.'
      }`,
      requiresFollowUp: isLow,
      suggestedFollowUp: isLow
        ? 'Supportive psychotherapy focusing on self-compassion, cognitive reframing, and addressing negative core beliefs is recommended.'
        : 'Continue cultivating self-compassion and affirming personal values.',
      crisisAlert: false,
      aiRecommendation: isLow ? 'Self-compassion CBT counseling recommended.' : 'Maintain positive self-affirmation.',
    };
  }

  // 6. Emotional Intelligence (emotional_intelligence)
  if (code === 'emotional_intelligence' || cat.includes('emotional intelligence')) {
    const isHigh = totalScore >= 29;
    const isDev = totalScore <= 14;
    return {
      severityLevel: isHigh ? 'High' : isDev ? 'Developing' : 'Moderate',
      identifiedProblem: isHigh ? 'High Emotional Awareness & Regulation' : isDev ? 'Developing Emotional Skills' : 'Balanced Emotional Intelligence',
      clinicalSummary: `Your emotional intelligence reflection score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'You demonstrate strong awareness of your own emotions, constructive coping mechanisms, and empathy toward others.'
          : isDev
          ? 'You may occasionally find it challenging to identify or modulate intense emotional states during stress.'
          : 'You possess solid everyday emotional awareness and functional communication skills.'
      }`,
      requiresFollowUp: false,
      suggestedFollowUp: isDev
        ? 'Explore mindfulness meditation, active listening techniques, and emotional journaling to deepen self-awareness.'
        : 'Continue practicing conscious emotional regulation in interpersonal interactions.',
      crisisAlert: false,
      aiRecommendation: 'Engage with mindfulness and interpersonal communication practices.',
    };
  }

  // 7. Personality Assessment (personality)
  if (code === 'personality' || cat.includes('personality')) {
    // Calculate 5 Big Five domain means if answers available
    const answers = extraContext?.answers || {};
    const questions = extraContext?.questions || [];
    const getScore = (qCode: string) => {
      const q = questions.find((item) => item.questionCode === qCode);
      if (!q) return 2;
      const ans = answers[q.id] || answers[qCode];
      const opts = q.options as Array<{ id: string; score: number }> | undefined;
      const found = opts?.find((o) => o.id === ans);
      return found ? found.score : 2;
    };

    const extraversion = ((getScore('per_01') + getScore('per_02')) / 2).toFixed(1);
    const agreeableness = ((getScore('per_03') + getScore('per_04')) / 2).toFixed(1);
    const conscientiousness = ((getScore('per_05') + getScore('per_06')) / 2).toFixed(1);
    const emotionalStability = ((getScore('per_07') + getScore('per_08')) / 2).toFixed(1);
    const openness = ((getScore('per_09') + getScore('per_10')) / 2).toFixed(1);

    return {
      severityLevel: 'Profile',
      identifiedProblem: 'Big-Five Reflective Trait Dimensions',
      clinicalSummary: `Five Personality Domain Means (0–4 scale): Extraversion: ${extraversion}/4 • Agreeableness: ${agreeableness}/4 • Conscientiousness: ${conscientiousness}/4 • Emotional Stability: ${emotionalStability}/4 • Openness: ${openness}/4. These reflect your self-reported tendencies across everyday situations.`,
      requiresFollowUp: false,
      suggestedFollowUp: 'Reflect on how your natural disposition aligns with your daily career, relationship, and wellness routines.',
      crisisAlert: false,
      aiRecommendation: 'Use trait awareness to design personalized work and wellness habits.',
    };
  }

  // 8. Sleep Quality Assessment (sleep_quality)
  if (code === 'sleep_quality' || cat.includes('sleep')) {
    const isSevere = totalScore >= 31;
    const isMod = totalScore >= 21;
    const isMild = totalScore >= 11;
    const safetyNotice = extraContext?.safetyNotices?.find((n) => n.includes('sleepy') || n.includes('driving'));

    return {
      severityLevel: isSevere ? 'Severe' : isMod ? 'Moderate' : isMild ? 'Mild' : 'Restful',
      identifiedProblem: isSevere ? 'Severe Sleep Disruption & Fatigue' : isMod ? 'Moderate Sleep Quality Impairment' : isMild ? 'Mild Sleep Irregularity' : 'Healthy Sleep Quality',
      clinicalSummary: `Your sleep assessment score is ${totalScore}/${maxScore}. ${
        isSevere
          ? 'Responses reflect significant insomnia, frequent awakenings, or unrefreshing sleep that impairs daytime focus.'
          : isMod
          ? 'Responses indicate noticeable difficulty with falling or staying asleep.'
          : isMild
          ? 'Responses indicate occasional sleep disruption.'
          : 'Responses indicate consistent, restorative sleep patterns.'
      }${safetyNotice ? ` Safety Alert: ${safetyNotice}` : ''}`,
      requiresFollowUp: isSevere || !!safetyNotice,
      suggestedFollowUp: isSevere || !!safetyNotice
        ? 'Medical consultation with a sleep specialist or physician recommended. Do not operate vehicles or heavy machinery when feeling fatigued.'
        : 'Maintain a consistent sleep-wake schedule, minimize blue light 60 mins before bed, and practice wind-down meditation.',
      crisisAlert: false,
      aiRecommendation: isSevere ? 'Clinical evaluation for chronic sleep disruption advised.' : 'Maintain bedtime hygiene routines.',
    };
  }

  // 9. Relationship Satisfaction Scale (relationship_satisfaction)
  if (code === 'relationship_satisfaction' || cat.includes('relationship')) {
    const isLow = totalScore <= 14;
    const isMod = totalScore <= 27;
    const safetyNotice = extraContext?.safetyNotices?.find((n) => n.includes('afraid') || n.includes('hurt') || n.includes('boundary'));

    return {
      severityLevel: isLow ? 'Low' : isMod ? 'Moderate' : 'High',
      identifiedProblem: isLow ? 'Relationship Strain / Distress' : isMod ? 'Moderate Relationship Harmony' : 'High Relationship Satisfaction',
      clinicalSummary: `Your relationship satisfaction score is ${totalScore}/${maxScore}. ${
        isLow
          ? 'Responses reflect friction, unaddressed boundaries, or feeling unsupported in this relationship.'
          : isMod
          ? 'Responses indicate a balanced bond with both supportive moments and areas for communication growth.'
          : 'Responses indicate strong mutual trust, communication, and emotional fulfillment.'
      }${safetyNotice ? ` Relational Safety Alert: ${safetyNotice}` : ''}`,
      requiresFollowUp: isLow || !!safetyNotice,
      suggestedFollowUp: safetyNotice
        ? 'SAFETY NOTICE: If you feel afraid, unsafe, or threatened by a partner or family member, confidential support is available. Call the National Domestic Violence Hotline (1-800-799-SAFE or text "START" to 88788).'
        : isLow
        ? 'Couples or relational communication counseling can help address recurring conflict patterns and rebuild connection.'
        : 'Continue practicing open dialogue, active appreciation, and clear boundaries.',
      crisisAlert: false,
      aiRecommendation: safetyNotice ? 'Access confidential relational safety resources.' : isLow ? 'Explore relational communication guidance.' : 'Continue healthy connection habits.',
    };
  }

  // 10. Resilience Scale (resilience)
  if (code === 'resilience' || cat.includes('resilience')) {
    const isHigh = totalScore >= 28;
    const isLow = totalScore <= 14;
    return {
      severityLevel: isHigh ? 'High' : isLow ? 'Low' : 'Moderate',
      identifiedProblem: isHigh ? 'High Psychological Resilience' : isLow ? 'Difficulty Recovering from Setbacks' : 'Moderate Resilience',
      clinicalSummary: `Your resilience reflection score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'You demonstrate strong psychological agility and the ability to bounce back effectively after adversity.'
          : isLow
          ? 'Recent setbacks may feel heavier or harder to process without structured external support.'
          : 'You possess standard adaptive coping skills with opportunities to strengthen problem-solving flexibility.'
      }`,
      requiresFollowUp: isLow,
      suggestedFollowUp: isLow
        ? 'Solution-focused therapy and stress recovery coaching can support building psychological resilience.'
        : 'Continue reinforcing supportive peer networks and realistic optimism.',
      crisisAlert: false,
      aiRecommendation: isLow ? 'Resilience-building counseling recommended.' : 'Maintain adaptive coping habits.',
    };
  }

  // 11. Life Satisfaction Scale (life_satisfaction)
  if (code === 'life_satisfaction' || cat.includes('life satisfaction')) {
    const isHigh = totalScore >= 28;
    const isLow = totalScore <= 14;
    return {
      severityLevel: isHigh ? 'High' : isLow ? 'Low' : 'Moderate',
      identifiedProblem: isHigh ? 'High Life Satisfaction & Fulfillment' : isLow ? 'Reduced Life Satisfaction' : 'Moderate Life Satisfaction',
      clinicalSummary: `Your life satisfaction appraisal score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses reflect meaningful alignment with your values and overall contentment with your current life trajectory.'
          : isLow
          ? 'Responses indicate dissatisfaction or frustration with current life circumstances or personal goals.'
          : 'Responses indicate a balanced general appraisal with areas for further growth.'
      }`,
      requiresFollowUp: isLow,
      suggestedFollowUp: isLow
        ? 'Values-based coaching or counseling can assist in identifying core aspirations and making intentional life adjustments.'
        : 'Continue engaging in activities that bring meaning, purpose, and community connection.',
      crisisAlert: false,
      aiRecommendation: 'Engage with values-oriented goal setting and wellness practices.',
    };
  }

  // 12. Social Anxiety Screening (social_anxiety)
  if (code === 'social_anxiety' || cat.includes('social anxiety')) {
    const isHigh = totalScore >= 31;
    const isMod = totalScore >= 21;
    const isMild = totalScore >= 11;
    return {
      severityLevel: isHigh ? 'Severe' : isMod ? 'Moderate' : isMild ? 'Mild' : 'Minimal',
      identifiedProblem: isHigh ? 'Elevated Social Anxiety & Scrutiny Concern' : isMod ? 'Moderate Social Discomfort' : isMild ? 'Mild Social Hesitation' : 'Minimal Social Anxiety',
      clinicalSummary: `Your social anxiety assessment score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses reflect intense fear of negative evaluation, embarrassment, or avoidance of social interactions.'
          : isMod
          ? 'Responses indicate noticeable nervousness in social or evaluative situations.'
          : isMild
          ? 'Responses reflect occasional shyness or situational self-consciousness.'
          : 'Responses reflect ease in social settings and minimal anxiety around evaluation.'
      }`,
      requiresFollowUp: isHigh || isMod,
      suggestedFollowUp: isHigh || isMod
        ? 'Cognitive Behavioral Therapy (CBT) with exposure techniques is the gold-standard support for overcoming social anxiety.'
        : 'Practice gradual social engagement and grounding exercises before group meetings.',
      crisisAlert: false,
      aiRecommendation: isHigh || isMod ? 'CBT for social confidence recommended.' : 'Maintain positive social exposure.',
    };
  }

  // 13. OCD Screening (ocd)
  if (code === 'ocd' || cat.includes('ocd') || cat.includes('obsessive')) {
    const isHigh = totalScore >= 31;
    const isMod = totalScore >= 21;
    const isMild = totalScore >= 11;
    return {
      severityLevel: isHigh ? 'Severe' : isMod ? 'Moderate' : isMild ? 'Mild' : 'Minimal',
      identifiedProblem: isHigh ? 'Elevated Obsessive-Compulsive Symptom Reflection' : isMod ? 'Moderate Repetitive Thoughts or Rituals' : isMild ? 'Mild Repetitive Thoughts' : 'Minimal OCD Traits',
      clinicalSummary: `Your OCD screening score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses reflect recurrent intrusive thoughts, urges, or repetitive rituals that consume noticeable time and cause distress.'
          : isMod
          ? 'Responses indicate intermittent repetitive checking, ordering, or intrusive thoughts.'
          : isMild
          ? 'Responses indicate occasional repetitive behaviors within manageable limits.'
          : 'Responses indicate minimal intrusive thought frequency or compulsive behaviors.'
      } Note: Having intrusive thoughts is common and does not indicate an intention to act.`,
      requiresFollowUp: isHigh || isMod,
      suggestedFollowUp: isHigh || isMod
        ? 'Specialized evaluation with an OCD specialist utilizing Exposure and Response Prevention (ERP) therapy is recommended.'
        : 'Mindfulness techniques and cognitive defusion can help reduce the grip of repetitive thoughts.',
      crisisAlert: false,
      aiRecommendation: isHigh || isMod ? 'ERP-trained mental health specialist consultation advised.' : 'Explore cognitive defusion exercises.',
    };
  }

  // 14. ADHD Screening (adhd)
  if (code === 'adhd' || cat.includes('adhd')) {
    const isHigh = totalScore >= 31;
    const isMod = totalScore >= 21;
    const isMild = totalScore >= 11;
    return {
      severityLevel: isHigh ? 'Severe' : isMod ? 'Moderate' : isMild ? 'Mild' : 'Typical',
      identifiedProblem: isHigh ? 'High ADHD-Related Trait Reflection' : isMod ? 'Moderate Executive & Focus Difficulties' : isMild ? 'Mild Attentional Fluctuations' : 'Typical Attentional Focus',
      clinicalSummary: `Your ADHD screening score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses reflect consistent difficulties with sustained attention, task initiation, working memory, or restlessness.'
          : isMod
          ? 'Responses indicate noticeable procrastination, distractibility, or disorganization across everyday tasks.'
          : isMild
          ? 'Responses reflect occasional focus lapses common during fatigue or busy periods.'
          : 'Responses reflect stable executive functioning and focus.'
      }`,
      requiresFollowUp: isHigh || isMod,
      suggestedFollowUp: isHigh || isMod
        ? 'Formal clinical ADHD assessment by a neuropsychologist or psychiatrist is recommended to evaluate attention and executive function.'
        : 'Implement structured time-blocking, visual organizers, and break larger tasks into small steps.',
      crisisAlert: false,
      aiRecommendation: isHigh ? 'Comprehensive adult ADHD diagnostic evaluation recommended.' : 'Utilize executive function organization tools.',
    };
  }

  // 15. Autism Screening (autism)
  if (code === 'autism' || cat.includes('autism')) {
    return {
      severityLevel: 'Profile',
      identifiedProblem: 'Autistic-Trait Self-Reflection Profile',
      clinicalSummary: `Your responses across the 10 reflection items describe your personal preferences in social communication, sensory processing, and daily routines. In accordance with clinical guidelines, this reflection activity does not produce an artificial single autism severity score.`,
      requiresFollowUp: false,
      suggestedFollowUp: 'If you are seeking a formal neurodivergent diagnostic assessment or sensory accommodation support, consultation with a specialized neurodevelopmental clinician is advised.',
      crisisAlert: false,
      aiRecommendation: 'Consult a neurodiversity-affirming clinician if comprehensive diagnostic clarity is desired.',
    };
  }

  // 16. PTSD Screening (ptsd)
  if (code === 'ptsd' || cat.includes('ptsd') || cat.includes('trauma')) {
    const isHigh = totalScore >= 31;
    const isMod = totalScore >= 21;
    const isMild = totalScore >= 11;
    return {
      severityLevel: isHigh ? 'Severe' : isMod ? 'Moderate' : isMild ? 'Mild' : 'Minimal',
      identifiedProblem: isHigh ? 'Significant Post-Traumatic Stress Reflection' : isMod ? 'Moderate Trauma-Related Stress' : isMild ? 'Mild Trauma Reactivity' : 'Minimal Trauma Reactivity',
      clinicalSummary: `Your post-traumatic stress screening score is ${totalScore}/${maxScore}. ${
        isHigh
          ? 'Responses indicate distressing intrusive memories, heightened reactivity, or avoidance linked to a traumatic event.'
          : isMod
          ? 'Responses indicate noticeable emotional distress or hypervigilance.'
          : isMild
          ? 'Responses reflect mild or situational reminders without widespread impairment.'
          : 'Responses indicate minimal post-traumatic distress.'
      }`,
      requiresFollowUp: isHigh || isMod,
      suggestedFollowUp: isHigh || isMod
        ? 'Trauma-informed evidence-based therapy such as EMDR or Cognitive Processing Therapy (CPT) is strongly recommended.'
        : 'Engage with nervous-system grounding exercises, safe supportive relationships, and mindfulness.',
      crisisAlert: false,
      aiRecommendation: isHigh || isMod ? 'Trauma-informed clinical therapy (EMDR/CPT) recommended.' : 'Practice somatic grounding techniques.',
    };
  }

  // 17. IQ Test / Reasoning Practice (iq)
  if (code === 'iq' || cat.includes('reasoning') || cat.includes('cognitive')) {
    return {
      severityLevel: totalScore >= 8 ? 'High' : totalScore >= 5 ? 'Moderate' : 'Developing',
      identifiedProblem: `${totalScore} of ${maxScore || 10} Reasoning Puzzles Solved Correctly`,
      clinicalSummary: `You correctly answered ${totalScore} out of ${maxScore || 10} reasoning puzzles. These practice questions exercise logical deduction, pattern recognition, and problem-solving skills. Note: This educational exercise does not represent an IQ score or percentile.`,
      requiresFollowUp: false,
      suggestedFollowUp: 'Keep your analytical mind engaged with regular problem solving, logic puzzles, reading, and brain exercises.',
      crisisAlert: false,
      aiRecommendation: 'Continue engaging in cognitive thinking and pattern-recognition challenges.',
    };
  }

  // Legacy K6 (General Psychological Distress: 0 - 24)
  if (code === 'k6' || cat.includes('distress')) {
    const stdScore = Math.round(normScore(24));
    const isHighDistress = stdScore >= 13;
    const scoreText = `${totalScore}/${maxScore}`;

    return {
      severityLevel: isHighDistress ? 'High' : 'Low',
      identifiedProblem: isHighDistress ? 'High Non-Specific Psychological Distress' : 'Low Psychological Distress',
      clinicalSummary: `Your score of ${scoreText} indicates ${isHighDistress ? 'elevated psychological distress' : 'psychological distress within the typical range'}.`,
      requiresFollowUp: isHighDistress,
      suggestedFollowUp: isHighDistress ? 'A formal clinical screening with a mental health professional is recommended.' : 'Maintain healthy sleep hygiene and social connections.',
      crisisAlert: false,
      aiRecommendation: isHighDistress ? 'Clinical mental health consultation recommended.' : 'Maintain wellness routines.',
    };
  }

  // Legacy WHO-5 (Well-Being Index: 0 - 25 raw)
  if (code === 'who5' || cat.includes('well-being')) {
    const percentageScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const reducedWellBeing = percentageScore <= 50;

    return {
      severityLevel: reducedWellBeing ? 'Reduced' : 'Adequate',
      identifiedProblem: reducedWellBeing ? 'Reduced Positive Well-Being' : 'Adequate & Positive Well-Being',
      clinicalSummary: `Your standardized WHO-5 score is ${percentageScore}/100 (Raw: ${totalScore}/${maxScore}).`,
      requiresFollowUp: reducedWellBeing,
      suggestedFollowUp: reducedWellBeing ? 'We recommend speaking with a healthcare professional to review vitality.' : 'Keep nurturing positive lifestyle habits.',
      crisisAlert: false,
      aiRecommendation: reducedWellBeing ? 'Clinical review for emotional vitality advised.' : 'Continue positive lifestyle habits.',
    };
  }

  // Legacy GSE (General Self-Efficacy: 10 - 40)
  if (code === 'gse' || cat.includes('efficacy')) {
    const stdScore = Math.round(normScore(40));
    return {
      severityLevel: stdScore < 26 ? 'Low' : stdScore >= 35 ? 'High' : 'Moderate',
      identifiedProblem: 'Self-Efficacy & Coping Confidence',
      clinicalSummary: `Your score is ${totalScore}/${maxScore}.`,
      requiresFollowUp: stdScore < 26,
      suggestedFollowUp: 'Strengthen self-efficacy through goal setting and solution-focused routines.',
      crisisAlert: false,
      aiRecommendation: 'Maintain proactive problem-solving habits.',
    };
  }

  // Legacy UCLA-3 (Loneliness: 3 - 9)
  if (code === 'ucla3' || cat.includes('loneliness')) {
    const stdScore = Math.round(normScore(9));
    return {
      severityLevel: stdScore >= 8 ? 'High' : stdScore >= 6 ? 'Moderate' : 'Low',
      identifiedProblem: 'Perceived Loneliness & Social Connection',
      clinicalSummary: `Your score is ${totalScore}/${maxScore}.`,
      requiresFollowUp: stdScore >= 8,
      suggestedFollowUp: 'Consider exploring community peer circles or consulting a counselor to work through feelings of isolation.',
      crisisAlert: false,
      aiRecommendation: 'Engage with supportive community groups.',
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
    // Check by ID first, then by code (exact, lower, upper)
    let assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, idOrCode),
    });

    if (!assessment) {
      assessment = await db.query.assessments.findFirst({
        where: eq(assessments.code, idOrCode),
      });
    }

    if (!assessment) {
      assessment = await db.query.assessments.findFirst({
        where: eq(assessments.code, idOrCode.toLowerCase()),
      });
    }

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
      optionE?: string;
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
          optionE: q.optionE || null,
          options: [
            { id: 'A', label: q.optionA, score: q.scoreMapping.option_a ?? q.scoreMapping.A ?? 0 },
            { id: 'B', label: q.optionB, score: q.scoreMapping.option_b ?? q.scoreMapping.B ?? 1 },
            { id: 'C', label: q.optionC, score: q.scoreMapping.option_c ?? q.scoreMapping.C ?? 2 },
            { id: 'D', label: q.optionD, score: q.scoreMapping.option_d ?? q.scoreMapping.D ?? 3 },
            ...(q.optionE ? [{ id: 'E', label: q.optionE, score: q.scoreMapping.option_e ?? q.scoreMapping.E ?? 4 }] : []),
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
    // 1. Retrieve the assessment (by ID or code)
    let assessment = await db.query.assessments.findFirst({
      where: eq(assessments.id, assessmentId),
    });

    if (!assessment) {
      assessment = await db.query.assessments.findFirst({
        where: eq(assessments.code, assessmentId),
      });
    }

    if (!assessment) {
      assessment = await db.query.assessments.findFirst({
        where: eq(assessments.code, assessmentId.toLowerCase()),
      });
    }

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
    const safetyNotices: string[] = [];

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
        (o) =>
          o.id === selectedValue ||
          o.id.toLowerCase() === selectedValue.toLowerCase() ||
          o.id.toUpperCase() === normKey ||
          o.label.toLowerCase() === selectedValue.toLowerCase(),
      );

      if (foundOption) {
        awardedScore = foundOption.score;
      } else if (typeof mapping[selectedValue] === 'number') {
        awardedScore = mapping[selectedValue];
      } else if (typeof mapping[normKey] === 'number') {
        awardedScore = mapping[normKey];
      }

      totalScore += awardedScore;

      // Safety checks from methodology and safetyRules
      if (
        (question.questionCode === 'PHQ9_09' && awardedScore > 0) ||
        (question.questionCode === 'dep_11' && (selectedValue.includes('yes') || selectedValue.includes('unsure'))) ||
        (question.questionCode === 'dep_12' && (selectedValue.includes('yes') || selectedValue.includes('unsure'))) ||
        ((question.questionCode === 'src_love_obsession_12' || question.questionCode === 'src_love_obsession_13') &&
          (selectedValue.includes('option_1') || selectedValue.includes('yes') || awardedScore > 0))
      ) {
        crisisFlag = true;
      }

      if (question.questionCode === 'slp_11' && (selectedValue.includes('yes') || selectedValue.includes('unsure'))) {
        safetyNotices.push('Sleepiness may impair driving or operating safety-critical equipment. Avoid driving when fatigued.');
      }

      if (question.questionCode === 'rel_11' && (selectedValue.includes('yes') || selectedValue.includes('unsure'))) {
        safetyNotices.push('Feeling afraid of harm or retaliation for setting boundaries is a serious relationship safety concern.');
      }
    }

    // Fallback max score if not computable dynamically
    if (maxPossibleScore === 0) {
      maxPossibleScore = assessment.totalQuestions * 4;
    }

    // 4. Compare with validated ranges & generate screening results
    const evaluation = evaluateAssessmentScore(
      assessment.code,
      assessment.category,
      totalScore,
      maxPossibleScore,
      crisisFlag,
      {
        answers: payload.answers,
        questions,
        safetyNotices,
      },
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
