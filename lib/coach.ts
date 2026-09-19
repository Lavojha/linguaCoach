import type { Language, Level, ScenarioId } from "./languages";

export type TranscriptMessage = {
  role: "user" | "coach";
  text: string;
  timestamp: number;
};

export type CoachAnalysis = {
  overall: number;
  fluency: number;
  grammar: number;
  vocabulary: number;
  confidence: number;
  summary: string;
  corrections: Array<{ original: string; improved: string; explanation: string }>;
  vocabulary: Array<{ word: string; meaning: string; example: string }>;
  nextSteps: string[];
};

export type SessionConfig = { language: Language; level: Level; scenario: ScenarioId };
