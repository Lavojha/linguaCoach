export const LANGUAGES = [
  { id: "English", label: "English", native: "English", flag: "🇬🇧" },
  { id: "Hindi", label: "Hindi", native: "हिन्दी", flag: "🇮🇳" },
  { id: "Spanish", label: "Spanish", native: "Español", flag: "🇪🇸" },
  { id: "French", label: "French", native: "Français", flag: "🇫🇷" },
  { id: "German", label: "German", native: "Deutsch", flag: "🇩🇪" },
  { id: "Japanese", label: "Japanese", native: "日本語", flag: "🇯🇵" },
  { id: "Italian", label: "Italian", native: "Italiano", flag: "🇮🇹" },
  { id: "Portuguese", label: "Portuguese", native: "Português", flag: "🇵🇹" },
  { id: "Korean", label: "Korean", native: "한국어", flag: "🇰🇷" },
] as const;

export type Language = (typeof LANGUAGES)[number]["id"];
export const LEVELS = ["Beginner", "Elementary", "Intermediate", "Upper-intermediate", "Advanced"] as const;
export type Level = (typeof LEVELS)[number];
export const SCENARIOS = [
  { id: "free-talk", label: "Free Talk", description: "Relaxed everyday conversation" },
  { id: "restaurant", label: "Restaurant", description: "Order food and handle a real situation" },
  { id: "travel", label: "Travel", description: "Airport, hotel, directions and travel" },
  { id: "interview", label: "Job Interview", description: "Practice professional interview answers" },
  { id: "friends", label: "Making Friends", description: "Meet someone new and keep the conversation going" },
  { id: "work", label: "Work", description: "Meetings, updates and workplace conversation" },
] as const;
export type ScenarioId = (typeof SCENARIOS)[number]["id"];
