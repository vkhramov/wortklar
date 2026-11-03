export type PartOfSpeech =
  | 'noun'
  | 'verb'
  | 'adjective'
  | 'adverb'
  | 'preposition'
  | 'conjunction'
  | 'pronoun'
  | 'particle'
  | 'phrase'
  | 'numeral'
  | 'determiner';

export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2';

export type LearningMode =
  | 'ru-de'
  | 'en-de'
  | 'de-ru'
  | 'de-en';

export type Article = 'der' | 'die' | 'das';

export type CaseRequired = 'Akkusativ' | 'Dativ' | 'Genitiv' | 'Wechsel';

export interface ExampleSentence {
  de: string;
  en: string;
  ru: string;
}

export interface VocabEntry {
  id: string;
  lemma: string;
  pos: PartOfSpeech;
  level: CefrLevel;
  topics: string[];
  frequency: 1 | 2 | 3 | 4 | 5;
  en: string[];
  ru: string[];
  example: ExampleSentence;
  notes?: { en?: string; ru?: string };
  illustration?: string;
  article?: Article;
  plural?: string;
  conjugations?: {
    ich: string;
    du: string;
    er: string;
    wir: string;
    ihr: string;
    sie: string;
  };
  separable?: boolean;
  reflexive?: boolean;
  irregular?: boolean;
  auxiliary?: 'haben' | 'sein' | 'haben/sein';
  caseRequired?: CaseRequired;
  wechsel?: boolean;
  caseHint?: { en: string; ru: string };
}

export type CardState = 'new' | 'learning' | 'review' | 'relearning' | 'known';

export interface CardProgress {
  entryId: string;
  state: CardState;
  easeFactor: number;
  interval: number;
  repetitions: number;
  learningStep: number;
  dueDate: string;
  lastReview: string | null;
  lapses: number;
  correctCount: number;
  incorrectCount: number;
  markedKnown: boolean;
  introducedAt: string | null;
}

export interface DailyStats {
  date: string;
  reviewsDone: number;
  newLearned: number;
  correct: number;
  incorrect: number;
}

export interface UserSettings {
  mode: LearningMode;
  dailyGoal: number;
  sessionSize: number;
  newPerSession: number;
  topics: string[];
  levels: CefrLevel[];
  showUmlautButtons: boolean;
}

export interface AppProgress {
  cards: Record<string, CardProgress>;
  streak: number;
  lastStudyDate: string | null;
  daily: DailyStats[];
  settings: UserSettings;
  createdAt: string;
  /** ISO timestamp for cross-device merge / GitHub sync. */
  updatedAt?: string;
  version: number;
}

export type AnswerVerdict =
  | 'correct'
  | 'partial'
  | 'incorrect';

export interface AnswerResult {
  verdict: AnswerVerdict;
  message: { en: string; ru: string };
  expected: string;
  normalizedExpected: string;
  normalizedGiven: string;
  articleIssue?: boolean;
}

export interface SessionItem {
  entry: VocabEntry;
  kind: 'new' | 'review' | 'relearning';
  reason: string;
}
