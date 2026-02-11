export const DOMAINS = [
  { id: "1.0", name: "Snowflake AI Data Cloud Features & Architecture", weight: 0.31 },
  { id: "2.0", name: "Account Management and Data Governance", weight: 0.20 },
  { id: "3.0", name: "Data Loading, Unloading, and Connectivity", weight: 0.18 },
  { id: "4.0", name: "Performance Optimization, Querying, and Transformation", weight: 0.21 },
  { id: "5.0", name: "Data Collaboration", weight: 0.10 },
] as const;

export const EXAM_CONFIG = {
  totalQuestions: 100,
  timeLimitMinutes: 115,
  passingScore: 750,
  maxScore: 1000,
} as const;

export const DOMAIN_QUESTION_COUNTS: Record<string, number> = {
  "1.0": 31,
  "2.0": 20,
  "3.0": 18,
  "4.0": 21,
  "5.0": 10,
};
