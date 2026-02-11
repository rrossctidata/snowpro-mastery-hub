import { DOMAINS, EXAM_CONFIG } from "./constants";

interface DomainResult {
  correct: number;
  total: number;
}

export function calculateScaledScore(
  domainScores: Record<string, DomainResult>
): number {
  let weightedScore = 0;

  for (const domain of DOMAINS) {
    const result = domainScores[domain.id];
    if (result && result.total > 0) {
      const accuracy = result.correct / result.total;
      weightedScore += accuracy * domain.weight;
    }
  }

  return Math.round(weightedScore * EXAM_CONFIG.maxScore);
}

export function isPassingScore(score: number): boolean {
  return score >= EXAM_CONFIG.passingScore;
}
