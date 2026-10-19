"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import {
  Sparkles,
  Play,
  Pause,
  CheckCircle,
  Clock,
  Calendar,
  Filter,
  ArrowRight,
  Wind,
  Volume2,
  VolumeX,
  RotateCcw,
  BookOpen,
  Check,
  Headphones,
  Sliders,
  ChevronRight,
  ChevronLeft,
  Star,
  Layers,
  Compass,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface TherapyProgram {
  id: string;
  title: string;
  resourceType: string;
  category: string;
  description: string;
  difficultyLevel: string;
  durationMinutes: number;
  sessionCount?: number;
  durationWeeks?: number;
  dailyMinutes?: number;
  emoji?: string;
  gradientStyle?: string;
  audioUrl: string | null;
  videoUrl: string | null;
}

interface UserProgress {
  id: string;
  userId: string;
  resourceId: string;
  startTime: string;
  completionTime: string | null;
  status: "Completed" | "Skipped" | "In Progress";
  progressPercentage: number;
}

interface ProgramSession {
  number: number;
  title: string;
  duration: string;
  objective: string;
  practicePrompt: string;
}

const CATEGORIES = ["All", "DBT", "CBT", "ACT", "Sleep", "Anxiety", "Focus", "Relaxation"];

const GRADIENT_MAP: Record<string, string> = {
  purple: "from-indigo-600/90 via-purple-600/80 to-purple-400/90",
  emerald: "from-emerald-600/90 via-emerald-500/80 to-teal-400/90",
  teal: "from-teal-600/90 via-teal-500/80 to-cyan-400/90",
  green: "from-green-600/90 via-emerald-500/80 to-lime-400/90",
  blue: "from-sky-500/90 via-blue-600/80 to-indigo-500/90",
  lime: "from-emerald-500/90 via-lime-500/80 to-green-400/90",
  ocean: "from-blue-600/90 via-sky-500/80 to-cyan-400/90",
  mint: "from-teal-500/90 via-emerald-500/80 to-teal-400/90",
};

interface ModalityTopic {
  code: string;
  name: string;
  badge: string;
  icon: string;
  subtitle: string;
  description: string;
  matchCategories: string[];
}

const MODALITY_TOPICS: ModalityTopic[] = [
  {
    code: "DBT",
    name: "Dialectical Behavior Therapy",
    badge: "2 Programs",
    icon: "⚖️",
    subtitle: "Mindfulness, Emotional Regulation & Distress Tolerance",
    description: "DBT integrates cognitive-behavioral tools with mindful acceptance to help you manage emotional reactivity, tolerate distress, and foster meaningful interpersonal connection.",
    matchCategories: ["DBT"],
  },
  {
    code: "CBT",
    name: "Cognitive Behavioral Therapy",
    badge: "2 Programs",
    icon: "🎯",
    subtitle: "Cognitive Restructuring & Behavioral Activation",
    description: "Evidence-based CBT frameworks to challenge intrusive thoughts, build positive self-esteem, and leverage constructive action to break free from depressive inertia.",
    matchCategories: ["CBT"],
  },
  {
    code: "ACT",
    name: "Acceptance & Commitment Therapy",
    badge: "1 Program",
    icon: "🌿",
    subtitle: "Psychological Flexibility & Values-Guided Living",
    description: "Learn to embrace inner experiences without judgment while actively committing to values-driven actions that build a rich, purpose-filled life.",
    matchCategories: ["ACT"],
  },
  {
    code: "Sleep",
    name: "Restorative Sleep Hygiene",
    badge: "1 Program",
    icon: "😴",
    subtitle: "Circadian Synchronization & Somatic Down-Regulation",
    description: "Clinical circadian hygiene protocols and gentle somatic wind-down practices designed to dismantle bedtime insomnia loops and restore natural sleep architecture.",
    matchCategories: ["Sleep"],
  },
  {
    code: "Focus",
    name: "Positive Psychology & Flourishing",
    badge: "1 Program",
    icon: "⭐",
    subtitle: "Character Strengths, Gratitude & Flow States",
    description: "Empirically validated positive psychology practices to foster optimism, activate deep flow, and nurture authentic psychological thriving.",
    matchCategories: ["Focus"],
  },
  {
    code: "Anxiety",
    name: "Interpersonal & Relationship Therapy",
    badge: "1 Program",
    icon: "💕",
    subtitle: "Attachment Security & Healthy Boundary Architecture",
    description: "Deconstruct relationship anxiety, cultivate secure attachment habits, and communicate needs with compassionate clarity and healthy boundaries.",
    matchCategories: ["Anxiety"],
  },
];

// Bespoke clinical curricula for all 8 therapy programs
const PROGRAM_CURRICULA: Record<string, ProgramSession[]> = {
  "emotional regulation": [
    {
      number: 1,
      title: "Decoding Emotional Signals & Triggers",
      duration: "20 min",
      objective: "Understand the evolutionary purpose of emotions and identify primary vs. secondary emotional reactions.",
      practicePrompt: "Notice a moment this week when a secondary emotion (like anger or guilt) covered up a primary emotion (like hurt or sadness). What was the true root?",
    },
    {
      number: 2,
      title: "The Body-Emotion Loop & Somatic Cueing",
      duration: "25 min",
      objective: "Map the physiological signs of emotional escalation (heart rate, gut tension, jaw clenching).",
      practicePrompt: "Where in your body do you first register anger or anxiety? Practice taking 3 deep diaphragmatic breaths directly into that sensation.",
    },
    {
      number: 3,
      title: "Checking the Facts & Cognitive Filtering",
      duration: "25 min",
      objective: "Differentiate emotional interpretations from factual reality to prevent catastrophic spiraling.",
      practicePrompt: "Write down an event that triggered you recently. Strip away the story and list only the objective, verifiable facts.",
    },
    {
      number: 4,
      title: "Opposite Action Protocol",
      duration: "25 min",
      objective: "Identify emotional action urges (e.g., hiding when ashamed) and intentionally execute the opposite behavior.",
      practicePrompt: "When you feel the urge to isolate today, take one small opposite action: reach out or step into a shared physical space.",
    },
    {
      number: 5,
      title: "PLEASE Skills & Biological Vulnerability",
      duration: "25 min",
      objective: "Address physical vulnerability factors (sleep, nutrition, exercise) that drastically lower emotional tolerance.",
      practicePrompt: "Which physical factor has contributed most to your emotional reactivity lately? What is one realistic adjustment you can make today?",
    },
    {
      number: 6,
      title: "Distress Tolerance & TIPP Crisis Protocol",
      duration: "30 min",
      objective: "Apply Temperature, Intense exercise, Paced breathing, and Paired muscle relaxation during high emotional distress.",
      practicePrompt: "Practice 60 seconds of cold water facial splash or intense physical pacing during an acute stress spike.",
    },
    {
      number: 7,
      title: "Mindfulness of Current Emotion (Wave Meditation)",
      duration: "25 min",
      objective: "Learn to ride the wave of an intense emotion without suppressing it or impulsively acting upon it.",
      practicePrompt: "Visualize your current emotion as an ocean wave: observe its peak, breathe through it, and watch it naturally recede.",
    },
    {
      number: 8,
      title: "Long-Term Emotional Mastery & Relapse Shield",
      duration: "30 min",
      objective: "Formulate a personalized emotional regulation toolkit and identify high-risk trigger environments.",
      practicePrompt: "Write down your 3 core go-to regulation anchor skills to revisit whenever you feel stress resurfacing.",
    },
  ],

  "dialectical behavior therapy": [
    {
      number: 1,
      title: "Wise Mind: Balancing Emotion & Reason",
      duration: "25 min",
      objective: "Integrate Emotional Mind and Reasonable Mind to access intuitive, centered Wise Mind.",
      practicePrompt: "Before making a key decision today, pause and ask your Wise Mind: 'What is the balanced, grounded truth here?'",
    },
    {
      number: 2,
      title: "Core Mindfulness: 'What' & 'How' Skills",
      duration: "25 min",
      objective: "Master the skills to Observe, Describe, and Participate non-judgmentally and one-mindfully.",
      practicePrompt: "Pick an everyday activity (washing hands, drinking tea) and engage with complete, undivided one-minded awareness.",
    },
    {
      number: 3,
      title: "Crisis Survival: The STOP & TIPP Protocol",
      duration: "30 min",
      objective: "Halt impulsive reactions through Stop, Take a step back, Observe, and Proceed mindfully.",
      practicePrompt: "In a moment of rising irritation, physically pause and run through S-T-O-P before speaking.",
    },
    {
      number: 4,
      title: "Radical Acceptance of Difficult Realities",
      duration: "35 min",
      objective: "Accept reality as it is without approving of pain, reducing suffering caused by fighting what cannot be changed.",
      practicePrompt: "What difficult reality in your life are you currently resisting? What changes if you whisper: 'It is what it is'?",
    },
    {
      number: 5,
      title: "Emotion Regulation: Checking Facts & Problem Solving",
      duration: "30 min",
      objective: "Diagnose whether an emotion fits the facts, and determine whether to change the emotion or change the environment.",
      practicePrompt: "Does your current emotional intensity match the actual scale of the event? If not, what fact was distorted?",
    },
    {
      number: 6,
      title: "Interpersonal Effectiveness: DEAR MAN",
      duration: "35 min",
      objective: "Describe, Express, Assert, Reinforce, Mindful, Appear confident, Negotiate to ask for what you need or say no clearly.",
      practicePrompt: "Draft a concise DEAR MAN script for an interpersonal boundary or request you have been putting off.",
    },
    {
      number: 7,
      title: "Relationship Harmony: GIVE & FAST Skills",
      duration: "30 min",
      objective: "Maintain relationship goodwill (GIVE) while protecting your personal self-respect and integrity (FAST).",
      practicePrompt: "Notice how you can remain gentle and validating with someone while refusing to compromise your own core values.",
    },
    {
      number: 8,
      title: "Dialectical Synthesis & A Life Worth Living",
      duration: "35 min",
      objective: "Synthesize opposing forces (acceptance vs. change) to craft and sustain your personal vision of a life worth living.",
      practicePrompt: "Write down the two most transformative DBT skills you will carry forward into your daily lifestyle.",
    },
  ],

  "self-esteem building": [
    {
      number: 1,
      title: "Uncovering the Roots of Self-Worth",
      duration: "20 min",
      objective: "Map the origin of negative core beliefs (the inner critic) and identify how conditional worth developed.",
      practicePrompt: "Whose voice does your inner critic sound like? When in your life did you first start believing that voice?",
    },
    {
      number: 2,
      title: "Identifying Cognitive Traps & Distortions",
      duration: "25 min",
      objective: "Recognize cognitive distortions that erode confidence: all-or-nothing thinking, emotional reasoning, and mental filtering.",
      practicePrompt: "Catch yourself making a global generalization ('I always mess up') and rewrite it as a specific, realistic observation.",
    },
    {
      number: 3,
      title: "Cross-Examining the Inner Critic",
      duration: "25 min",
      objective: "Put harsh self-judgments on trial: examine evidence for and against, identifying assumptions vs. objective reality.",
      practicePrompt: "If a court demanded proof beyond a reasonable doubt for your harsher self-critique, what evidence would actually hold up?",
    },
    {
      number: 4,
      title: "Developing Compassionate Self-Dialogue",
      duration: "25 min",
      objective: "Transition from internal criticism to self-supportive coaching, adopting the compassionate friend perspective.",
      practicePrompt: "Write a short paragraph of guidance to yourself in the exact loving tone you would use for your dearest friend.",
    },
    {
      number: 5,
      title: "Signature Strengths & Competence Inventory",
      duration: "25 min",
      objective: "Build a concrete evidence base of past resilience, genuine competencies, and character virtues.",
      practicePrompt: "Record 3 specific challenges you have overcome in your life that prove your inherent strength and adaptability.",
    },
    {
      number: 6,
      title: "Overcoming People-Pleasing & Boundary Erosion",
      duration: "25 min",
      objective: "Differentiate between genuine kindness and approval-seeking behavior; establish assertive self-advocacy.",
      practicePrompt: "Practice saying a polite, clear 'No' to a low-stakes request that drains your emotional energy.",
    },
    {
      number: 7,
      title: "De-linking Worth from External Productivity",
      duration: "25 min",
      objective: "Separate personal worth from output, physical appearance, social media metrics, and perfectionism.",
      practicePrompt: "Affirm: 'My fundamental worth as a human is constant, regardless of how much I produce today.'",
    },
    {
      number: 8,
      title: "Unconditional Self-Acceptance & Future Resiliency",
      duration: "30 min",
      objective: "Cement unconditional self-acceptance (USA) and build a relapse prevention blueprint for vulnerability moments.",
      practicePrompt: "Define your core anchor affirmation to read whenever self-doubt threatens to pull you down.",
    },
  ],

  "behavioral activation": [
    {
      number: 1,
      title: "The Mood-Behavior Cycle & Inertia Breakdown",
      duration: "20 min",
      objective: "Understand how withdrawal feeds depressive fatigue, and why waiting for motivation never works.",
      practicePrompt: "Notice one task you avoided today because you 'didn't feel like it'. How did avoiding it impact your overall mood?",
    },
    {
      number: 2,
      title: "Activity & Mood Baseline Tracking",
      duration: "25 min",
      objective: "Track hourly activities and rate them on Mood (1-10) to discover unconscious energy drainers and mood boosters.",
      practicePrompt: "Log your activities for the afternoon and note which one gave even a single-point bump to your mood.",
    },
    {
      number: 3,
      title: "Mastery vs. Pleasure Calibration",
      duration: "25 min",
      objective: "Balance your daily routine with activities that generate a sense of accomplishment (Mastery) and enjoyment (Pleasure).",
      practicePrompt: "Schedule one small task for mastery (e.g., filing a document) and one for pleasure (e.g., listening to an album) tomorrow.",
    },
    {
      number: 4,
      title: "Deconstructing Tasks: The 5-Minute Micro-Action",
      duration: "25 min",
      objective: "Overcome task paralysis by shrinking intimidating obligations into bite-sized, 5-minute executable micro-steps.",
      practicePrompt: "Pick an overwhelming project and complete just the first 5-minute micro-step today.",
    },
    {
      number: 5,
      title: "Values-Anchored Activity Scheduling",
      duration: "25 min",
      objective: "Align your weekly schedule with deep personal values (creativity, health, community) rather than mere obligations.",
      practicePrompt: "Choose one core value and schedule a concrete 20-minute action dedicated strictly to honoring it.",
    },
    {
      number: 6,
      title: "Navigating Internal Obstacles & Avoidance Triggers",
      duration: "30 min",
      objective: "Anticipate thoughts like 'What's the point?' and construct pre-planned 'If-Then' implementation intentions.",
      practicePrompt: "Formulate an implementation plan: 'If my mind tells me to stay in bed, then I will put on my sneakers and step outside for 2 minutes.'",
    },
    {
      number: 7,
      title: "Social Re-engagement & Interpersonal Momentum",
      duration: "25 min",
      objective: "Counter anti-social withdrawal with calibrated, low-pressure interpersonal interactions.",
      practicePrompt: "Send a brief, pressure-free check-in message to a friend or acquaintance you miss.",
    },
    {
      number: 8,
      title: "Long-Term Momentum Architecture & Relapse Shield",
      duration: "30 min",
      objective: "Build an automated weekly routine that sustains behavioral momentum and detects early warning signs of inertia.",
      practicePrompt: "Write down your early warning signals of depressive withdrawal and your immediate activation antidote.",
    },
  ],

  "acceptance & commitment": [
    {
      number: 1,
      title: "Creative Hopelessness: Dropping the Struggle",
      duration: "25 min",
      objective: "Recognize that fighting, avoiding, and numbing unwanted internal experiences only intensifies emotional suffering.",
      practicePrompt: "What strategies have you used to eliminate anxiety or sadness that haven't worked long-term? What if you stopped fighting?",
    },
    {
      number: 2,
      title: "Cognitive Defusion: Thoughts are Just Thoughts",
      duration: "25 min",
      objective: "Create healthy distance between yourself and your automatic thoughts; label thoughts as mental events, not orders.",
      practicePrompt: "Transform 'I am a failure' into 'I notice my mind is giving me the thought that I am a failure.'",
    },
    {
      number: 3,
      title: "Expansion & Acceptance: Making Room for Sensations",
      duration: "30 min",
      objective: "Open up to physical sensations of discomfort, breathing into tight spaces instead of tensing against them.",
      practicePrompt: "Where is physical tension showing up right now? Gently visualize expanding the space around it to let it be.",
    },
    {
      number: 4,
      title: "Contacting the Present Moment: Mindful Grounding",
      duration: "25 min",
      objective: "Anchor awareness in the sensory 'here and now' through 5-senses orientation to exit rumination.",
      practicePrompt: "Engage the 5-4-3-2-1 technique: notice 5 things you see, 4 you feel, 3 you hear, 2 you smell, 1 you taste.",
    },
    {
      number: 5,
      title: "The Observing Self (Self-as-Context)",
      duration: "30 min",
      objective: "Discover the unchanging perspective of awareness behind all passing thoughts, feelings, memories, and sensations.",
      practicePrompt: "Notice the part of you that is aware of what you are thinking right now. That observer remains calm and unbroken.",
    },
    {
      number: 6,
      title: "Values Clarification: What Truly Matters to You?",
      duration: "30 min",
      objective: "Strip away societal expectations to uncover your deepest heart's desires for how you want to live and treat others.",
      practicePrompt: "If no one was judging you and success was guaranteed, what kind of human being would you dedicate your life to being?",
    },
    {
      number: 7,
      title: "Committed Action: Walking Toward What Matters",
      duration: "30 min",
      objective: "Translate core values into realistic, values-aligned behavioral commitments, accepting whatever discomfort arises.",
      practicePrompt: "Identify one values-guided action you will take today, even if fear or hesitation comes along for the ride.",
    },
    {
      number: 8,
      title: "Psychological Flexibility Mastery",
      duration: "30 min",
      objective: "Integrate all 6 core ACT Hexaflex pillars into an enduring, agile way of being in the world.",
      practicePrompt: "Write your personal ACT manifesto: 'I am willing to experience [discomfort] in service of [my values].'",
    },
  ],

  "sleep improvement": [
    {
      number: 1,
      title: "The Science of Sleep Architecture & Circadian Pacing",
      duration: "15 min",
      objective: "Deconstruct REM vs. Deep Sleep stages, sleep pressure (adenosine), and circadian rhythm entrainment.",
      practicePrompt: "Calculate your ideal sleep window: what consistent wake-up time will you commit to for the next 7 days?",
    },
    {
      number: 2,
      title: "Stimulus Control Therapy: Re-associating Bed with Sleep",
      duration: "15 min",
      objective: "Eliminate bed-wake associations; enforce the 20-minute rule (leave bed if awake > 20 min).",
      practicePrompt: "Tonight, if awake for more than 20 minutes, move to a dim chair and do a calming non-screen activity.",
    },
    {
      number: 3,
      title: "Bedroom Environmental & Light Architecture",
      duration: "15 min",
      objective: "Optimize temperature (65°F/18°C), blackout darkness, acoustic pink/brown noise, and blue-light filtration.",
      practicePrompt: "Make one physical modification to your sleep sanctuary today to maximize darkness and cool airflow.",
    },
    {
      number: 4,
      title: "Somatic Progressive Muscle Relaxation & Body Scan",
      duration: "20 min",
      objective: "Systematically tense and release muscle groups from toes to crown to trigger parasympathetic down-regulation.",
      practicePrompt: "Practice the 10-minute guided somatic muscle release tonight right before getting under the covers.",
    },
    {
      number: 5,
      title: "Constructive Worry Time & Nighttime Rumination Triage",
      duration: "15 min",
      objective: "Schedule dedicated 15-minute daytime worry journaling to prevent late-night thought spiraling.",
      practicePrompt: "Write down your top 3 tomorrow-worries and their immediate next action step 2 hours before bed.",
    },
    {
      number: 6,
      title: "Circadian Light Timing & Caffeine Half-Life Management",
      duration: "15 min",
      objective: "Leverage morning sunlight exposure (10-15 min) to anchor melatonin release, and establish a caffeine curfew.",
      practicePrompt: "Get 10 minutes of direct morning sunlight within 30 minutes of waking up tomorrow.",
    },
    {
      number: 7,
      title: "Middle-of-the-Night Awakening Protocols",
      duration: "15 min",
      objective: "Master non-catastrophizing self-talk during 3:00 AM awakenings: reframe awake time as quiet somatic rest.",
      practicePrompt: "When waking up tonight, repeat: 'Even quiet resting in bed recharges my body. I don't need to force sleep.'",
    },
    {
      number: 8,
      title: "Lifelong Sleep Resilience & Jet Lag/Shift Blueprints",
      duration: "20 min",
      objective: "Build an enduring sleep maintenance blueprint to navigate travel, acute stress, and seasonal shifts.",
      practicePrompt: "Document your non-negotiable bedtime unwind checklist to protect your sleep quality for life.",
    },
  ],

  "positive psychology": [
    {
      number: 1,
      title: "The PERMA Model & The Anatomy of Flourishing",
      duration: "20 min",
      objective: "Explore Positive Emotion, Engagement, Relationships, Meaning, and Accomplishment as foundations of well-being.",
      practicePrompt: "Which pillar of PERMA (Positive emotion, Engagement, Relationships, Meaning, Accomplishment) needs the most care right now?",
    },
    {
      number: 2,
      title: "Signature Character Strengths Discovery",
      duration: "20 min",
      objective: "Identify your top VIA Character Strengths (e.g., curiosity, kindness, bravery, fairness, humor).",
      practicePrompt: "Select one of your signature strengths and deliberately use it in a novel way today.",
    },
    {
      number: 3,
      title: "Three Good Things & Gratitude Savoring",
      duration: "20 min",
      objective: "Rewire the brain's negativity bias through daily intentional savoring and causal gratitude attribution.",
      practicePrompt: "Write down 3 things that went well today and specify *why* they happened.",
    },
    {
      number: 4,
      title: "Activating Flow States & Deep Engagement",
      duration: "20 min",
      objective: "Calibrate challenge level vs. skill level to enter high-efficiency, timeless flow states in daily pursuits.",
      practicePrompt: "Identify an activity where you completely lose track of time. How can you schedule 45 minutes for it this week?",
    },
    {
      number: 5,
      title: "Constructive Meaning & Purpose Architecture",
      duration: "20 min",
      objective: "Connect mundane daily responsibilities to a larger existential purpose and contribution to others.",
      practicePrompt: "How does one simple task you do each day quietly serve or uplift another person or community?",
    },
    {
      number: 6,
      title: "Active-Constructive Responding & Relational Capital",
      duration: "20 min",
      objective: "Master responding enthusiastically to others' good news to dramatically deepen social bonds.",
      practicePrompt: "When someone shares positive news today, actively validate their excitement and ask curious follow-up questions.",
    },
    {
      number: 7,
      title: "Cultivating Optimistic Explanatory Styles & Grit",
      duration: "20 min",
      objective: "Reframe setbacks as temporary, specific, and changeable rather than permanent and pervasive.",
      practicePrompt: "Take a recent frustration and write down 2 specific ways in which it is temporary and solvable.",
    },
    {
      number: 8,
      title: "The Flourishing Habit Blueprint & Giving Back",
      duration: "25 min",
      objective: "Institutionalize high-vibe rituals into your ongoing lifestyle and plan your acts of altruistic contribution.",
      practicePrompt: "Design your daily 5-minute flourishing ritual that you will protect every single morning.",
    },
  ],

  "relationship therapy": [
    {
      number: 1,
      title: "Decoding Attachment Styles & Emotional Wiring",
      duration: "25 min",
      objective: "Understand Anxious, Avoidant, and Secure attachment blueprints and your automatic relationship triggers.",
      practicePrompt: "In moments of relationship conflict, do you tend to pursue and over-explain, or withdraw and shut down?",
    },
    {
      number: 2,
      title: "The 4 Communication Traps (Gottman's Horsemen)",
      duration: "25 min",
      objective: "Recognize Criticism, Contempt, Defensiveness, and Stonewalling, and study their research-backed antidotes.",
      practicePrompt: "Notice which of the 4 horsemen shows up most often in your disagreements. What is its gentle antidote?",
    },
    {
      number: 3,
      title: "Non-Violent Communication (NVC) Framework",
      duration: "25 min",
      objective: "Communicate using Observations, Feelings, Needs, and Requests without blame or projection.",
      practicePrompt: "Draft a message using NVC: 'When [observation], I felt [feeling], because I need [need]. Would you be willing to [request]?'",
    },
    {
      number: 4,
      title: "Architecting Compassionate & Clear Boundaries",
      duration: "25 min",
      objective: "Set boundaries as an act of connection rather than punishment; eliminate passive-aggressive resentment.",
      practicePrompt: "Identify one boundary you need to set with love, without justifying or over-explaining yourself.",
    },
    {
      number: 5,
      title: "Emotional Attunement & Bid Recognition",
      duration: "25 min",
      objective: "Notice and 'turn toward' subtle verbal and non-verbal emotional bids for connection from partners or friends.",
      practicePrompt: "Catch one bid for connection today (a glance, a sigh, a comment) and turn toward it with undivided presence.",
    },
    {
      number: 6,
      title: "Somatic De-escalation During Relational Flooding",
      duration: "25 min",
      objective: "Learn to recognize physiological flooding (pulse > 100 bpm) and call for a constructive 20-minute timeout.",
      practicePrompt: "Agree with yourself on a respectful timeout cue: 'I am getting flooded right now. I need 20 minutes to calm down so we can talk gently.'",
    },
    {
      number: 7,
      title: "The Art of the Repair Attempt & Sincere Apologies",
      duration: "25 min",
      objective: "Practice initiating and accepting micro-repairs during conflict before negative sentiment override settles in.",
      practicePrompt: "What is your favorite gentle repair phrase? E.g., 'Can we hit pause and start over? I love you and I want to hear you.'",
    },
    {
      number: 8,
      title: "Cultivating Lasting Trust & Secure Relational Anchors",
      duration: "30 min",
      objective: "Establish regular relational check-ins, shared meaning rituals, and enduring emotional safety.",
      practicePrompt: "Write down 3 appreciation statements to share with someone important in your life today.",
    },
  ],
};

// Returns the tailored clinical curriculum corresponding to each program's exact modality
function getProgramSessions(programTitle: string): ProgramSession[] {
  const normalized = (programTitle || "").toLowerCase().trim();
  for (const [key, sessions] of Object.entries(PROGRAM_CURRICULA)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return sessions;
    }
  }
  return PROGRAM_CURRICULA["emotional regulation"];
}

export default function TherapyPage() {
  const queryClient = useQueryClient();

  // Active Hub Tab: 'programs' | 'breathing' | 'soundscapes'
  const [activeTab, setActiveTab] = useState<"programs" | "breathing" | "soundscapes">("programs");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Selected Program Modal
  const [activeProgram, setActiveProgram] = useState<TherapyProgram | null>(null);
  const [activeSession, setActiveSession] = useState<ProgramSession | null>(null);

  // Orbital Navigation & Spotlight States
  const [selectedTopicIndex, setSelectedTopicIndex] = useState(0); // 0 = DBT
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [programDisplayMode, setProgramDisplayMode] = useState<"orbital" | "grid">("orbital");

  // Guided Practice Session Timer
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerSecondsLeft, setTimerSecondsLeft] = useState(300); // 5 min default

  // Breathing Visualizer State
  const [breathingTechnique, setBreathingTechnique] = useState<"box" | "478">("box");
  const [breathingPhase, setBreathingPhase] = useState<"Inhale" | "Hold" | "Exhale" | "Rest">("Inhale");
  const [breathingSecondsLeft, setBreathingSecondsLeft] = useState(4);
  const [isBreathingActive, setIsBreathingActive] = useState(false);
  const [breathingCyclesCompleted, setBreathingCyclesCompleted] = useState(0);

  // Ambient Soundscape State
  const [playingSounds, setPlayingSounds] = useState<Record<string, boolean>>({
    rain: false,
    ocean: false,
    brownNoise: false,
    forest: false,
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const noiseNodesRef = useRef<Record<string, { gain: GainNode; stop: () => void }>>({});

  // 1. Fetch Therapy Programs
  const { data: programs, isLoading: loadingPrograms } = useQuery<TherapyProgram[]>({
    queryKey: ["therapy", "programs"],
    queryFn: () => apiFetch<TherapyProgram[]>("/therapy/programs"),
  });

  // 2. Fetch User Progress Records
  const { data: progressList } = useQuery<UserProgress[]>({
    queryKey: ["therapy", "progress"],
    queryFn: () => apiFetch<UserProgress[]>("/therapy/progress"),
  });

  // 3. Start Program Mutation
  const startProgressMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiFetch<UserProgress>(`/therapy/progress/${resourceId}`, {
        method: "POST",
      }),
    onSuccess: (data) => {
      toast.success("Program started! 🚀");
      queryClient.invalidateQueries({ queryKey: ["therapy", "progress"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to start program.");
    },
  });

  // 4. Update Progress Percentage Mutation
  const updateProgressMutation = useMutation({
    mutationFn: ({
      id,
      progressPercentage,
      status,
    }: {
      id: string;
      progressPercentage: number;
      status?: string;
    }) =>
      apiFetch<UserProgress>(`/therapy/progress/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ progressPercentage, status }),
      }),
    onSuccess: () => {
      toast.success("Progress updated! Keep up the momentum.");
      queryClient.invalidateQueries({ queryKey: ["therapy", "progress"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update progress.");
    },
  });

  // Reset confirmation dialog states
  const [programToReset, setProgramToReset] = useState<TherapyProgram | null>(null);
  const [showResetAllDialog, setShowResetAllDialog] = useState(false);

  // 5. Reset Single Program Mutation
  const resetProgramMutation = useMutation({
    mutationFn: (resourceId: string) =>
      apiFetch<{ success: boolean; message: string }>(`/therapy/progress/${resourceId}/reset`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("Program progress has been reset.");
      queryClient.invalidateQueries({ queryKey: ["therapy", "progress"] });
      setProgramToReset(null);
      if (activeSession) setActiveSession(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset program progress.");
    },
  });

  // 6. Reset All Programs Mutation
  const resetAllMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ success: boolean; message: string }>("/therapy/progress/reset-all", {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("All therapy programs have been reset to 0%!");
      queryClient.invalidateQueries({ queryKey: ["therapy", "progress"] });
      setShowResetAllDialog(false);
      if (activeSession) setActiveSession(null);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset all programs.");
    },
  });

  // Handle Practice Session Timer
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning && timerSecondsLeft > 0) {
      interval = setInterval(() => {
        setTimerSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (timerSecondsLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      toast.success("Practice session completed! Wonderful job taking time for yourself.");
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning, timerSecondsLeft]);

  // Breathing Visualizer Loop
  useEffect(() => {
    if (!isBreathingActive) return;

    const interval = setInterval(() => {
      setBreathingSecondsLeft((prev) => {
        if (prev > 1) return prev - 1;

        // Transition phases
        if (breathingTechnique === "box") {
          // 4-4-4-4
          if (breathingPhase === "Inhale") {
            setBreathingPhase("Hold");
            return 4;
          } else if (breathingPhase === "Hold") {
            setBreathingPhase("Exhale");
            return 4;
          } else if (breathingPhase === "Exhale") {
            setBreathingPhase("Rest");
            return 4;
          } else {
            setBreathingPhase("Inhale");
            setBreathingCyclesCompleted((c) => c + 1);
            return 4;
          }
        } else {
          // 4-7-8
          if (breathingPhase === "Inhale") {
            setBreathingPhase("Hold");
            return 7;
          } else if (breathingPhase === "Hold") {
            setBreathingPhase("Exhale");
            return 8;
          } else {
            setBreathingPhase("Inhale");
            setBreathingCyclesCompleted((c) => c + 1);
            return 4;
          }
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathingActive, breathingPhase, breathingTechnique]);

  // Web Audio Ambient Synthesizer
  const toggleSound = (soundKey: "rain" | "ocean" | "brownNoise" | "forest") => {
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    const currentlyPlaying = playingSounds[soundKey];

    if (currentlyPlaying) {
      // Stop sound
      if (noiseNodesRef.current[soundKey]) {
        noiseNodesRef.current[soundKey].stop();
        delete noiseNodesRef.current[soundKey];
      }
      setPlayingSounds((prev) => ({ ...prev, [soundKey]: false }));
    } else {
      // Start sound synthesis
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);

      if (soundKey === "brownNoise" || soundKey === "ocean") {
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          output[i] = (lastOut + 0.02 * white) / 1.02;
          lastOut = output[i];
          output[i] *= 3.5;
        }
      } else {
        // Rain / Forest: white noise with gentle filtering
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
      }

      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const filter = ctx.createBiquadFilter();
      if (soundKey === "rain") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1000, ctx.currentTime);
      } else if (soundKey === "ocean") {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(450, ctx.currentTime);
      } else if (soundKey === "forest") {
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(800, ctx.currentTime);
        filter.Q.setValueAtTime(1.2, ctx.currentTime);
      } else {
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(300, ctx.currentTime);
      }

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.15, ctx.currentTime);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      whiteNoise.start();

      noiseNodesRef.current[soundKey] = {
        gain,
        stop: () => {
          try {
            whiteNoise.stop();
            whiteNoise.disconnect();
          } catch {
            // Already stopped
          }
        },
      };

      setPlayingSounds((prev) => ({ ...prev, [soundKey]: true }));
    }
  };

  const handleOpenProgram = (prog: TherapyProgram) => {
    setActiveProgram(prog);
    const existing = progressList?.find((p) => p.resourceId === prog.id);
    if (!existing) {
      startProgressMutation.mutate(prog.id);
    }
  };

  const handleStartSession = (session: ProgramSession) => {
    setActiveSession(session);
    setTimerSecondsLeft(session.number * 3 * 60 + 120); // Dynamic timer
    setIsTimerRunning(true);
  };

  const handleCompleteSession = (sessionNumber: number) => {
    if (!activeProgram) return;
    const existingProgress = progressList?.find((p) => p.resourceId === activeProgram.id);
    const totalSessions = activeProgram.sessionCount || 8;
    const newPercentage = Math.min(Math.round((sessionNumber / totalSessions) * 100), 100);

    if (existingProgress) {
      updateProgressMutation.mutate({
        id: existingProgress.id,
        progressPercentage: newPercentage,
        status: newPercentage >= 100 ? "Completed" : "In Progress",
      });
    }
  };

  const filteredPrograms = programs?.filter((p) => {
    if (selectedCategory === "All") return true;
    return (
      p.category.toLowerCase() === selectedCategory.toLowerCase() ||
      p.resourceType.toLowerCase() === selectedCategory.toLowerCase()
    );
  });

  const activeTopic = MODALITY_TOPICS[selectedTopicIndex] || MODALITY_TOPICS[0];
  const topicPrograms =
    programs?.filter((p) =>
      activeTopic.matchCategories.some(
        (cat) => cat.toLowerCase() === p.category.toLowerCase()
      )
    ) || [];

  const currentSpotlightProgram =
    topicPrograms.find((p) => p.id === selectedProgramId) || topicPrograms[0];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12 animate-in fade-in-50 duration-200">
      {/* Top Hero & Hub Navigation */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-background border p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clinical Programs & Somatic Relaxation Suite</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
            Therapy & Relaxation
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            Evidence-based psychological programs (DBT, CBT, ACT), guided somatic breathwork, and ambient soundscapes to anchor and restore balance.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-card border shadow-2xs self-stretch sm:self-auto">
          <button
            onClick={() => setActiveTab("programs")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "programs"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Programs ({programs?.length || 8})</span>
          </button>

          <button
            onClick={() => setActiveTab("breathing")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "breathing"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Wind className="w-3.5 h-3.5" />
            <span>Breathing</span>
          </button>

          <button
            onClick={() => setActiveTab("soundscapes")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeTab === "soundscapes"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>Soundscapes</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          TAB 1: THERAPY PROGRAMS (ORBITAL ARC HERO + SPOTLIGHT WITH MINI-SWITCHER)
          ========================================================================= */}
      {activeTab === "programs" && (
        <div className="space-y-8">
          {/* =========================================================================
              CALM THERAPEUTIC TEAL / GLASSMORPHIC ORBITAL ARC HERO (MATCHING USER SCREENSHOT)
              ========================================================================= */}
          <div className="relative rounded-3xl border border-teal-500/25 bg-linear-to-b from-teal-950/20 via-card to-card dark:from-teal-950/40 dark:via-background dark:to-background p-6 sm:p-8 overflow-hidden backdrop-blur-xl shadow-xl space-y-6">
            {/* Soft Ambient Teal Backlight Glow */}
            <div className="absolute -top-28 left-1/2 -translate-x-1/2 w-[520px] h-64 bg-teal-500/15 blur-3xl pointer-events-none rounded-full" />

            {/* Top HUD Bar */}
            <div className="relative z-10 flex items-center justify-between gap-4 text-xs">
              {/* Left Pill (Matching "# PLANETARY ARCHIVE") */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-semibold bg-teal-500/10 border border-teal-500/30 text-teal-600 dark:text-teal-300">
                <Compass className="w-3.5 h-3.5" />
                <span className="tracking-wider uppercase">Clinical Modalities</span>
              </div>

              {/* Center Carousel Counter & Nav (Matching "< 01 / 05 >") */}
              <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-card/80 border border-teal-500/20 shadow-xs">
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx =
                      selectedTopicIndex === 0 ? MODALITY_TOPICS.length - 1 : selectedTopicIndex - 1;
                    setSelectedTopicIndex(nextIdx);
                    const nextTopic = MODALITY_TOPICS[nextIdx];
                    const nextProgs = programs?.filter((p) =>
                      nextTopic.matchCategories.some(
                        (cat) => cat.toLowerCase() === p.category.toLowerCase()
                      )
                    );
                    if (nextProgs && nextProgs.length > 0) {
                      setSelectedProgramId(nextProgs[0].id);
                    }
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 transition-colors"
                  title="Previous modality"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono font-bold tracking-widest text-[11px] text-foreground">
                  {String(selectedTopicIndex + 1).padStart(2, "0")} /{" "}
                  {String(MODALITY_TOPICS.length).padStart(2, "0")}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const nextIdx = (selectedTopicIndex + 1) % MODALITY_TOPICS.length;
                    setSelectedTopicIndex(nextIdx);
                    const nextTopic = MODALITY_TOPICS[nextIdx];
                    const nextProgs = programs?.filter((p) =>
                      nextTopic.matchCategories.some(
                        (cat) => cat.toLowerCase() === p.category.toLowerCase()
                      )
                    );
                    if (nextProgs && nextProgs.length > 0) {
                      setSelectedProgramId(nextProgs[0].id);
                    }
                  }}
                  className="w-5 h-5 rounded-full flex items-center justify-center text-muted-foreground hover:text-teal-400 hover:bg-teal-500/10 transition-colors"
                  title="Next modality"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Right: Display Mode or Reset All (Matching "INTERACTIVE ORBITAL ARC") */}
              <div className="flex items-center gap-2">
                {progressList && progressList.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowResetAllDialog(true)}
                    className="h-7 text-[11px] gap-1 text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-colors rounded-xl"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span className="hidden sm:inline">Reset All</span>
                  </Button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setProgramDisplayMode((prev) => (prev === "orbital" ? "grid" : "orbital"))
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-medium bg-card/80 border border-teal-500/20 text-[11px] text-muted-foreground hover:text-foreground hover:border-teal-500/40 transition-colors shadow-2xs"
                >
                  <Layers className="w-3.5 h-3.5 text-teal-500" />
                  <span className="hidden sm:inline">
                    {programDisplayMode === "orbital" ? "Orbital Spotlight" : "Browse All Grid"}
                  </span>
                </button>
              </div>
            </div>

            {/* =========================================================================
                THE CURVED ORBITAL ARC (Tilted Cards along trajectory)
                ========================================================================= */}
            <div className="relative pt-4 pb-2">
              {/* SVG Trajectory dashed curve */}
              <svg
                className="absolute top-1/2 left-0 w-full -translate-y-1/2 h-28 pointer-events-none stroke-teal-500/25 dark:stroke-teal-400/20"
                fill="none"
                preserveAspectRatio="none"
                viewBox="0 0 800 120"
              >
                <path
                  d="M 20 90 Q 400 15 780 90"
                  strokeWidth="1.5"
                  strokeDasharray="4 6"
                />
              </svg>

              {/* Topic Cards Container */}
              <div className="relative z-10 flex items-center justify-center gap-2 sm:gap-4 overflow-x-auto py-6 px-2 scrollbar-none">
                {MODALITY_TOPICS.map((topic, idx) => {
                  const isSelected = idx === selectedTopicIndex;
                  const diff = idx - selectedTopicIndex;

                  // Curved arc CSS transforms based on relative offset
                  let rotationDeg = 0;
                  let translateYPx = 0;
                  if (diff === -2) {
                    rotationDeg = -8;
                    translateYPx = 16;
                  } else if (diff === -1) {
                    rotationDeg = -4;
                    translateYPx = 6;
                  } else if (diff === 0) {
                    rotationDeg = 0;
                    translateYPx = -4;
                  } else if (diff === 1) {
                    rotationDeg = 4;
                    translateYPx = 6;
                  } else if (diff === 2) {
                    rotationDeg = 8;
                    translateYPx = 16;
                  } else {
                    rotationDeg = diff > 0 ? 10 : -10;
                    translateYPx = 22;
                  }

                  const topicCount =
                    programs?.filter((p) =>
                      topic.matchCategories.some(
                        (cat) => cat.toLowerCase() === p.category.toLowerCase()
                      )
                    ).length || (topic.code === "DBT" || topic.code === "CBT" ? 2 : 1);

                  return (
                    <button
                      key={topic.code}
                      type="button"
                      onClick={() => {
                        setSelectedTopicIndex(idx);
                        const nextPrograms = programs?.filter((p) =>
                          topic.matchCategories.some(
                            (cat) => cat.toLowerCase() === p.category.toLowerCase()
                          )
                        );
                        if (nextPrograms && nextPrograms.length > 0) {
                          setSelectedProgramId(nextPrograms[0].id);
                        }
                      }}
                      style={{
                        transform: `rotate(${rotationDeg}deg) translateY(${translateYPx}px)`,
                      }}
                      className={`relative flex flex-col items-center justify-between w-24 sm:w-28 h-28 sm:h-32 rounded-3xl p-3 transition-all duration-300 ease-out select-none flex-shrink-0 cursor-pointer ${
                        isSelected
                          ? "bg-teal-500/15 dark:bg-teal-900/40 border-2 border-teal-400 dark:border-teal-300 shadow-[0_0_25px_rgba(45,212,191,0.4)] scale-105 z-20"
                          : "bg-card/75 dark:bg-teal-950/30 border border-teal-500/20 hover:border-teal-400/50 hover:bg-card/90 opacity-75 hover:opacity-100 z-10"
                      }`}
                    >
                      {/* Top Star Badge (Matching reference golden star) */}
                      <div className="self-end">
                        <Star
                          className={`w-3 h-3 ${
                            isSelected
                              ? "text-amber-400 fill-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]"
                              : "text-muted-foreground/30"
                          }`}
                        />
                      </div>

                      {/* Modality Icon */}
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-xl transition-transform ${
                          isSelected ? "scale-110 drop-shadow-md" : "opacity-80"
                        }`}
                      >
                        {topic.icon}
                      </div>

                      {/* Modality Code / Name */}
                      <div className="text-center space-y-0.5 w-full">
                        <p
                          className={`text-xs font-extrabold tracking-wider truncate ${
                            isSelected
                              ? "text-teal-600 dark:text-teal-300 font-black"
                              : "text-foreground/80"
                          }`}
                        >
                          {topic.code}
                        </p>
                        <p className="text-[9px] text-muted-foreground font-medium truncate">
                          {topicCount} {topicCount === 1 ? "Program" : "Programs"}
                        </p>
                      </div>

                      {/* Active glowing indicator pip at bottom */}
                      {isSelected && (
                        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_#2dd4bf]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Central Orbital Anchor Dial (Matching reference central glowing circle) */}
            <div className="flex flex-col items-center justify-center space-y-2 pt-1 relative z-10">
              <div className="w-13 h-13 rounded-full bg-teal-950/80 dark:bg-teal-950 border-2 border-teal-400 shadow-[0_0_22px_rgba(45,212,191,0.45)] flex items-center justify-center text-2xl transition-all duration-300">
                <span>{activeTopic.icon}</span>
              </div>

              <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-card/90 border border-teal-500/30 text-teal-600 dark:text-teal-300 shadow-xs">
                <span>
                  📍 {topicPrograms.length} Clinical {topicPrograms.length === 1 ? "Program" : "Programs"} Active
                </span>
              </div>
            </div>

            {/* Headline & Subtitle Reveal (Matching reference "CHOOSE YOUR MONUMENT") */}
            <div className="text-center space-y-1.5 max-w-2xl mx-auto pt-1 relative z-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground uppercase">
                {activeTopic.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold tracking-wider text-teal-600 dark:text-teal-400 uppercase">
                {activeTopic.subtitle}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1">
                {activeTopic.description}
              </p>
            </div>
          </div>

          {/* =========================================================================
              SPOTLIGHT CARD WITH MINI-SWITCHER (USER CHOICE #3)
              ========================================================================= */}
          {programDisplayMode === "orbital" && currentSpotlightProgram && (
            <div className="space-y-6 animate-in fade-in-50 duration-300">
              {/* Mini-Switcher for topics with multiple programs (e.g. DBT -> Emotional Regulation & Dialectical Behavior Therapy) */}
              {topicPrograms.length > 1 && (
                <div className="flex flex-wrap items-center justify-center gap-2 p-1.5 rounded-2xl bg-card border border-teal-500/25 max-w-xl mx-auto shadow-xs">
                  {topicPrograms.map((prog) => {
                    const isSelected = prog.id === currentSpotlightProgram.id;
                    const progProgress = progressList?.find((p) => p.resourceId === prog.id);
                    const isCompleted =
                      progProgress?.status === "Completed" ||
                      (progProgress?.progressPercentage ?? 0) >= 100;

                    return (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => setSelectedProgramId(prog.id)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all min-w-[200px] ${
                          isSelected
                            ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                        }`}
                      >
                        <span className="text-base">{prog.emoji}</span>
                        <span className="truncate">{prog.title}</span>
                        {isCompleted ? (
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-300 flex-shrink-0" />
                        ) : progProgress ? (
                          <span className="text-[10px] opacity-80 font-mono flex-shrink-0">
                            ({progProgress.progressPercentage}%)
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* The Featured Spotlight Card */}
              {(() => {
                const prog = currentSpotlightProgram;
                const progress = progressList?.find((p) => p.resourceId === prog.id);
                const isCompleted =
                  progress?.status === "Completed" || (progress?.progressPercentage ?? 0) >= 100;
                const isInProgress = progress && !isCompleted;
                const gradientClass =
                  GRADIENT_MAP[prog.gradientStyle || "emerald"] || GRADIENT_MAP.emerald;
                const sessions = getProgramSessions(prog.title);

                return (
                  <div className="max-w-4xl mx-auto rounded-3xl border border-teal-500/25 bg-card shadow-xl overflow-hidden backdrop-blur-md">
                    {/* Top Header Banner matching the gradient */}
                    <div
                      className={`relative h-44 sm:h-52 bg-linear-to-r ${gradientClass} p-6 sm:p-8 flex items-end justify-between overflow-hidden select-none`}
                    >
                      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
                      <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-black/10 blur-xl pointer-events-none" />

                      <div className="flex items-center gap-4 z-10">
                        <span className="text-6xl sm:text-7xl drop-shadow-lg transition-transform hover:scale-105">
                          {prog.emoji || "🌿"}
                        </span>
                        <div className="text-white space-y-1">
                          <span className="px-3 py-0.5 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md border border-white/30">
                            {prog.category} Modality
                          </span>
                          <h3 className="text-xl sm:text-3xl font-black text-white">
                            {prog.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-white/90 line-clamp-1">
                            {prog.description}
                          </p>
                        </div>
                      </div>

                      <div className="z-10 flex flex-col items-end gap-2">
                        <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/25 backdrop-blur-md text-white border border-white/30 shadow-xs">
                          {prog.sessionCount || 8} Clinical Sessions
                        </span>
                        <span className="text-xs font-semibold text-white/90 bg-black/20 backdrop-blur-sm px-2.5 py-0.5 rounded-md">
                          {prog.difficultyLevel}
                        </span>
                      </div>
                    </div>

                    {/* Body Details */}
                    <div className="p-6 sm:p-8 space-y-6">
                      {/* Metadata Specs Bar */}
                      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-muted/30 border text-xs text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-4 flex-wrap">
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            <Clock className="w-4 h-4 text-teal-500" />
                            <span>Duration: {prog.durationWeeks || 8} weeks</span>
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            <Calendar className="w-4 h-4 text-teal-500" />
                            <span>Daily Practice: {prog.dailyMinutes || 25} min/day</span>
                          </span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="flex items-center gap-1.5 font-semibold text-foreground">
                            <BookOpen className="w-4 h-4 text-teal-500" />
                            <span>Structure: 8 Guided Milestones</span>
                          </span>
                        </div>

                        {/* Reset option on the spotlight spec bar */}
                        {progress && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProgramToReset(prog)}
                            className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 px-2.5 rounded-lg"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reset Program</span>
                          </Button>
                        )}
                      </div>

                      {/* Progress Bar (if active) */}
                      {progress && (
                        <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-foreground">Your Program Progress</span>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-teal-600 dark:text-teal-400">
                                {progress.progressPercentage}% Completed
                              </span>
                              {isCompleted && (
                                <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                  <CheckCircle className="w-3 h-3" /> Mastered
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${progress.progressPercentage}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Curriculum Roadmap Preview (All 8 Sessions) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Clinical Curriculum (8 Milestones)
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            Click any session to practice
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                          {sessions.map((sess) => {
                            const sessCompleted =
                              progress &&
                              (progress.progressPercentage >= (sess.number / 8) * 100 ||
                                progress.status === "Completed");

                            return (
                              <div
                                key={sess.number}
                                onClick={() => {
                                  setActiveProgram(prog);
                                  handleStartSession(sess);
                                }}
                                className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-xs ${
                                  sessCompleted
                                    ? "bg-emerald-500/5 border-emerald-500/25 hover:border-emerald-500/50"
                                    : "bg-card hover:border-teal-500/40 hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div
                                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                      sessCompleted
                                        ? "bg-emerald-500 text-white"
                                        : "bg-muted text-muted-foreground"
                                    }`}
                                  >
                                    {sessCompleted ? <Check className="w-3.5 h-3.5" /> : sess.number}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground truncate">
                                      {sess.title}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {sess.duration} • {sess.objective}
                                    </p>
                                  </div>
                                </div>
                                <Play className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 opacity-60 hover:opacity-100 flex-shrink-0" />
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Bottom Spotlight CTA Bar */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/60">
                        <div className="flex items-center gap-2">
                          {progress && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setProgramToReset(prog)}
                              className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive/40 rounded-xl gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reset Program Progress</span>
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenProgram(prog)}
                            className="text-xs text-muted-foreground hover:text-foreground rounded-xl"
                          >
                            View Full Details Modal
                          </Button>
                        </div>

                        <Button
                          size="default"
                          onClick={() => handleOpenProgram(prog)}
                          className="w-full sm:w-auto px-6 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2 shadow-lg shadow-teal-600/25 text-sm"
                        >
                          <span>
                            {isCompleted
                              ? "Review Program"
                              : isInProgress
                              ? "Continue Program"
                              : "Start Program"}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* =========================================================================
              BROWSE ALL GRID MODE (OPTIONAL TOGGLE)
              ========================================================================= */}
          {programDisplayMode === "grid" && (
            <div className="space-y-6">
              {/* Category Filter Chips */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <span className="text-muted-foreground font-medium flex items-center gap-1 text-[11px] mr-1 flex-shrink-0">
                  <Filter className="w-3 h-3" /> Filter by:
                </span>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full font-semibold transition-all text-xs whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-card border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loadingPrograms ? (
                  [1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-80 rounded-3xl bg-muted/60 animate-pulse" />
                  ))
                ) : filteredPrograms && filteredPrograms.length > 0 ? (
                  filteredPrograms.map((prog) => {
                    const progress = progressList?.find((p) => p.resourceId === prog.id);
                    const isCompleted =
                      progress?.status === "Completed" || (progress?.progressPercentage ?? 0) >= 100;
                    const isInProgress = progress && !isCompleted;
                    const gradientClass =
                      GRADIENT_MAP[prog.gradientStyle || "emerald"] || GRADIENT_MAP.emerald;

                    return (
                      <div
                        key={prog.id}
                        onClick={() => handleOpenProgram(prog)}
                        className="group flex flex-col justify-between overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xs hover:border-teal-500/50 hover:shadow-lg transition-all cursor-pointer"
                      >
                        <div
                          className={`relative h-36 bg-linear-to-r ${gradientClass} p-5 flex items-center justify-between overflow-hidden select-none`}
                        >
                          <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/15 blur-xl pointer-events-none" />
                          <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-black/10 blur-lg pointer-events-none" />

                          <span className="text-5xl group-hover:scale-110 group-hover:rotate-3 transition-transform drop-shadow-md z-10">
                            {prog.emoji || "🌿"}
                          </span>

                          <div className="self-start z-10">
                            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                              {prog.sessionCount || 8} Sessions
                            </span>
                          </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                              {prog.title}
                            </h3>
                            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-3">
                              {prog.description}
                            </p>
                          </div>

                          <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1.5 font-medium">
                                <Clock className="w-3.5 h-3.5 text-primary" />
                                <span>{prog.durationWeeks || 8} weeks</span>
                              </span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="flex items-center gap-1.5 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span>{prog.dailyMinutes || 25} min/day</span>
                              </span>
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-secondary text-secondary-foreground border">
                                {prog.difficultyLevel || "Beginner"}
                              </span>
                            </div>

                            {progress && (
                              <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between text-xs">
                                  <span className="text-muted-foreground font-medium">Your Progress</span>
                                  <span className="font-bold text-foreground">
                                    {progress.progressPercentage}%
                                  </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${progress.progressPercentage}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="pt-2 flex items-center justify-between border-t border-border/50">
                              <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 group-hover:gap-2 transition-all">
                                <span>
                                  {isCompleted
                                    ? "Review Program"
                                    : isInProgress
                                    ? "Continue Program"
                                    : "Start Program"}
                                </span>
                                <ArrowRight className="w-4 h-4" />
                              </span>

                              <div className="flex items-center gap-1.5">
                                {progress && (
                                  <button
                                    type="button"
                                    title="Reset program progress"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setProgramToReset(prog);
                                    }}
                                    className="px-2 py-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-xs flex items-center gap-1 font-medium border border-transparent hover:border-destructive/20"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span className="text-[11px]">Reset</span>
                                  </button>
                                )}

                                {isCompleted && (
                                  <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                    <CheckCircle className="w-3.5 h-3.5" /> Completed
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <Card className="col-span-3 p-12 text-center text-muted-foreground text-sm">
                    No programs found matching category &ldquo;{selectedCategory}&rdquo;.
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: INTERACTIVE BREATHING VISUALIZER
          ========================================================================= */}
      {activeTab === "breathing" && (
        <Card className="p-8 sm:p-12 text-center space-y-8 max-w-2xl mx-auto shadow-md rounded-3xl">
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-foreground flex items-center justify-center gap-2">
              <Wind className="w-5 h-5 text-primary" />
              <span>Somatic Pacing & Breathwork</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Follow the expanding circle to down-regulate your nervous system and relieve acute physiological tension.
            </p>
          </div>

          {/* Technique Picker */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => {
                setBreathingTechnique("box");
                setBreathingPhase("Inhale");
                setBreathingSecondsLeft(4);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                breathingTechnique === "box"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Box Breathing (4-4-4-4)
            </button>
            <button
              onClick={() => {
                setBreathingTechnique("478");
                setBreathingPhase("Inhale");
                setBreathingSecondsLeft(4);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                breathingTechnique === "478"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              Relaxing Breath (4-7-8)
            </button>
          </div>

          {/* Animated Breathing Circle */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 mx-auto flex items-center justify-center">
            {/* Outer pulsating aura */}
            <div
              className={`absolute inset-0 rounded-full transition-all duration-1000 ${
                isBreathingActive && breathingPhase === "Inhale"
                  ? "bg-primary/20 scale-105"
                  : isBreathingActive && breathingPhase === "Hold"
                  ? "bg-amber-500/20 scale-100"
                  : isBreathingActive && breathingPhase === "Exhale"
                  ? "bg-teal-500/15 scale-90"
                  : "bg-muted/30 scale-95"
              }`}
            />

            {/* Main Interactive Circle */}
            <div
              className={`w-48 h-48 sm:w-56 sm:h-56 rounded-full border-4 flex flex-col items-center justify-center transition-all duration-1000 shadow-lg ${
                breathingPhase === "Inhale"
                  ? "border-primary bg-primary/10 scale-105"
                  : breathingPhase === "Hold"
                  ? "border-amber-500 bg-amber-500/10 scale-105"
                  : breathingPhase === "Exhale"
                  ? "border-teal-500 bg-teal-500/10 scale-95"
                  : "border-muted bg-card scale-95"
              }`}
            >
              <span className="text-xs uppercase tracking-widest font-extrabold text-muted-foreground">
                {isBreathingActive ? breathingPhase : "Ready"}
              </span>
              <span className="text-4xl font-extrabold text-foreground my-1">
                {isBreathingActive ? breathingSecondsLeft : "Start"}
              </span>
              <span className="text-[11px] text-muted-foreground font-medium">
                {isBreathingActive ? `${breathingCyclesCompleted} cycles` : "Click below"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={() => setIsBreathingActive(!isBreathingActive)}
              className="rounded-2xl px-6 font-semibold"
            >
              {isBreathingActive ? (
                <>
                  <Pause className="w-4 h-4 mr-2" /> Pause Exercise
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" /> Begin Breathing Exercise
                </>
              )}
            </Button>
            {isBreathingActive && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setIsBreathingActive(false);
                  setBreathingPhase("Inhale");
                  setBreathingSecondsLeft(4);
                  setBreathingCyclesCompleted(0);
                }}
                className="rounded-2xl"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* =========================================================================
          TAB 3: CALMING AMBIENT SOUNDSCAPES
          ========================================================================= */}
      {activeTab === "soundscapes" && (
        <Card className="p-8 max-w-3xl mx-auto space-y-6 rounded-3xl shadow-md">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              <span>Ambient Soundscapes & Binaural Noise</span>
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Soothing, synthesizer-crafted audio layers. Keep them playing in the background while studying, winding down, or journaling.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {[
              { key: "rain" as const, title: "Gentle Rain", emoji: "🌧️", desc: "Steady rainfall on leaves to calm anxious chatter." },
              { key: "ocean" as const, title: "Ocean Swells", emoji: "🌊", desc: "Rhythmic rolling surf for deep alpha-wave relaxation." },
              { key: "forest" as const, title: "Forest Breeze", emoji: "🌲", desc: "Rustling pine needles and serene wilderness air." },
              { key: "brownNoise" as const, title: "Deep Brown Noise", emoji: "🎧", desc: "Low-frequency sonic warmth ideal for ADHD focus & sleep." },
            ].map((sound) => {
              const isPlaying = playingSounds[sound.key];
              return (
                <div
                  key={sound.key}
                  className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                    isPlaying
                      ? "border-primary bg-primary/10 shadow-xs"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-3xl flex-shrink-0">{sound.emoji}</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-foreground truncate">{sound.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{sound.desc}</p>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant={isPlaying ? "default" : "outline"}
                    onClick={() => toggleSound(sound.key)}
                    className="rounded-xl h-9 px-3 gap-1.5 flex-shrink-0"
                  >
                    {isPlaying ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    <span>{isPlaying ? "Mute" : "Play"}</span>
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* =========================================================================
          MODAL: PROGRAM DETAILS & INTERACTIVE 8-SESSION ROADMAP
          ========================================================================= */}
      <Dialog
        open={!!activeProgram}
        onOpenChange={(open) => {
          if (!open) {
            setActiveProgram(null);
            setActiveSession(null);
            setIsTimerRunning(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-hidden p-0 rounded-3xl border border-teal-500/25 bg-card flex flex-col shadow-2xl">
          {activeProgram && (
            <div className="flex flex-col h-full max-h-[90vh] overflow-hidden">
              {/* Vibrant Header Banner matching the card */}
              <div
                className={`relative min-h-[130px] sm:min-h-[140px] bg-linear-to-r ${
                  GRADIENT_MAP[activeProgram.gradientStyle || "emerald"] || GRADIENT_MAP.emerald
                } p-6 flex items-end justify-between overflow-hidden select-none flex-shrink-0`}
              >
                <div className="flex items-center gap-3.5 z-10 min-w-0 pr-8">
                  <span className="text-5xl drop-shadow-md flex-shrink-0">{activeProgram.emoji || "🌿"}</span>
                  <div className="text-white space-y-0.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-white/20 backdrop-blur-md border border-white/30 inline-block">
                      {activeProgram.category} Therapy
                    </span>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white truncate">
                      {activeProgram.title}
                    </h2>
                  </div>
                </div>

                <div className="z-10 flex-shrink-0">
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30 shadow-xs">
                    {activeProgram.sessionCount || 8} Sessions
                  </span>
                </div>
              </div>

              {/* Modal Body: Single Smooth Scroll Container without Horizontal Leakage */}
              <div className="p-6 space-y-6 overflow-y-auto overflow-x-hidden flex-1 scrollbar-thin">
                {/* Clinical description */}
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Clinical Overview
                  </h4>
                  <p className="text-sm text-foreground leading-relaxed break-words">
                    {activeProgram.description}
                  </p>
                </div>

                {/* Metadata Pills */}
                <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/40 border text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5 font-medium flex-shrink-0">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    <span>Duration: {activeProgram.durationWeeks || 8} weeks</span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border hidden sm:inline" />
                  <span className="flex items-center gap-1.5 font-medium flex-shrink-0">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Daily Practice: {activeProgram.dailyMinutes || 25} min/day</span>
                  </span>
                  <span className="w-1 h-1 rounded-full bg-border hidden sm:inline" />
                  <span className="flex-shrink-0">Difficulty: <strong>{activeProgram.difficultyLevel}</strong></span>
                </div>

                {/* Active Program Progress & Reset Action inside Modal */}
                {(() => {
                  const progProgress = progressList?.find((p) => p.resourceId === activeProgram.id);
                  if (!progProgress) return null;
                  return (
                    <div className="p-4 rounded-2xl bg-muted/30 border space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-foreground truncate">Your Progress</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary flex-shrink-0">
                            {progProgress.progressPercentage}%
                          </span>
                          {progProgress.status === "Completed" && (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-md flex-shrink-0">
                              <CheckCircle className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setProgramToReset(activeProgram)}
                          className="h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 px-2.5 rounded-lg flex-shrink-0"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reset Program</span>
                        </Button>
                      </div>

                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progProgress.progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Active Session Guided Timer Drawer (if open) */}
                {activeSession && (
                  <div className="p-5 rounded-2xl border-2 border-primary/40 bg-primary/5 space-y-4 animate-in fade-in-50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <span className="text-xs font-bold text-primary uppercase tracking-wide block">
                          Session {activeSession.number} in progress
                        </span>
                        <h3 className="text-base font-bold text-foreground break-words">
                          {activeSession.title}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {activeSession.objective}
                        </p>
                      </div>

                      {/* Timer Display */}
                      <div className="px-3 py-1.5 rounded-xl bg-card border font-mono font-bold text-base text-primary flex-shrink-0 shadow-2xs">
                        {Math.floor(timerSecondsLeft / 60)}:
                        {(timerSecondsLeft % 60).toString().padStart(2, "0")}
                      </div>
                    </div>

                    {/* Reflection / Practice Prompt */}
                    <div className="p-3 rounded-xl bg-card border text-xs text-foreground/90 space-y-1 overflow-hidden">
                      <strong className="text-primary flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5 flex-shrink-0" /> Practice Reflection:
                      </strong>
                      <p className="leading-relaxed italic break-words">&ldquo;{activeSession.practicePrompt}&rdquo;</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsTimerRunning(!isTimerRunning)}
                        className="text-xs rounded-xl h-8 px-3"
                      >
                        {isTimerRunning ? "Pause Timer" : "Resume Timer"}
                      </Button>

                      <Button
                        size="sm"
                        onClick={() => handleCompleteSession(activeSession.number)}
                        className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-8 px-3.5 flex-shrink-0"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Complete Session {activeSession.number}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* 8-Session Roadmap List (Rendered without nested scrollbar) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Program Curriculum (8 Sessions)
                    </h4>
                    <span className="text-[11px] text-muted-foreground">Click Start to practice</span>
                  </div>

                  <div className="space-y-2">
                    {getProgramSessions(activeProgram.title).map((session) => {
                      const existingProgress = progressList?.find(
                        (p) => p.resourceId === activeProgram.id
                      );
                      const isCompleted =
                        existingProgress &&
                        (existingProgress.progressPercentage >= (session.number / 8) * 100 ||
                          existingProgress.status === "Completed");

                      return (
                        <div
                          key={session.number}
                          className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 text-xs ${
                            isCompleted
                              ? "bg-emerald-500/5 border-emerald-500/25"
                              : "bg-card hover:border-primary/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                isCompleted
                                  ? "bg-emerald-500 text-white"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {isCompleted ? <Check className="w-3.5 h-3.5" /> : session.number}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-foreground truncate">
                                {session.title}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {session.objective}
                              </p>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            variant={isCompleted ? "ghost" : "outline"}
                            onClick={() => handleStartSession(session)}
                            className="h-7 px-2.5 text-xs rounded-lg gap-1 flex-shrink-0"
                          >
                            <span>{isCompleted ? "Revisit" : "Start"}</span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: CONFIRM RESET SINGLE PROGRAM
          ========================================================================= */}
      <Dialog
        open={!!programToReset}
        onOpenChange={(open) => {
          if (!open && !resetProgramMutation.isPending) {
            setProgramToReset(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Reset Program Progress?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Are you sure you want to reset your progress for{" "}
              <strong className="text-foreground">{programToReset?.title}</strong>? Your completion
              percentage and session history will return to 0% so you can begin fresh.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProgramToReset(null)}
              disabled={resetProgramMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (programToReset) {
                  resetProgramMutation.mutate(programToReset.id);
                }
              }}
              disabled={resetProgramMutation.isPending}
              className="rounded-xl text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetProgramMutation.isPending ? "Resetting..." : "Reset Program"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: CONFIRM RESET ALL PROGRAMS
          ========================================================================= */}
      <Dialog
        open={showResetAllDialog}
        onOpenChange={(open) => {
          if (!open && !resetAllMutation.isPending) {
            setShowResetAllDialog(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-md rounded-3xl p-6 space-y-4">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
              <RotateCcw className="w-6 h-6" />
            </div>
            <DialogTitle className="text-lg font-bold">
              Reset All Therapy Programs?
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              This will reset your progress across <strong>all therapy programs</strong> back to 0%. All completed session records and milestones will be cleared. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowResetAllDialog(false)}
              disabled={resetAllMutation.isPending}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => resetAllMutation.mutate()}
              disabled={resetAllMutation.isPending}
              className="rounded-xl text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resetAllMutation.isPending ? "Resetting All..." : "Yes, Reset All"}</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
