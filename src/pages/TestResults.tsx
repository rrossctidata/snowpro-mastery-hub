import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAINS, EXAM_CONFIG } from "@/lib/constants";
import { CheckCircle2, XCircle, Flag, ChevronDown, ChevronUp } from "lucide-react";

interface TestAnswer {
  id: string;
  question_id: string;
  user_answers: string[];
  is_correct: boolean | null;
  is_flagged: boolean;
  questions: {
    domain: string;
    question_text: string;
    question_type: string;
    options: any;
    correct_answers: string[];
    explanation: string | null;
  };
}

export default function TestResults() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<any>(null);
  const [testAnswers, setTestAnswers] = useState<TestAnswer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    (async () => {
      const [{ data: att }, { data: ans }] = await Promise.all([
        supabase.from("test_attempts").select("*").eq("id", attemptId).single(),
        supabase.from("test_answers").select("*, questions(*)").eq("attempt_id", attemptId),
      ]);
      setAttempt(att);
      setTestAnswers((ans as unknown as TestAnswer[]) || []);
      setLoading(false);
    })();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  if (!attempt) return <div>Not found</div>;

  const domainScores = attempt.domain_scores as Record<string, { correct: number; total: number }> || {};

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-8 max-w-4xl">
        {/* Score hero */}
        <Card className={`border-2 ${attempt.is_pass ? "border-green-500" : "border-destructive"}`}>
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <div className={`text-6xl font-extrabold ${attempt.is_pass ? "text-green-600" : "text-destructive"}`}>
              {attempt.score}
            </div>
            <p className="text-lg text-muted-foreground">out of {EXAM_CONFIG.maxScore}</p>
            <div className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold ${
              attempt.is_pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}>
              {attempt.is_pass ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {attempt.is_pass ? "PASSED" : "FAILED"} — {EXAM_CONFIG.passingScore} needed
            </div>
            <p className="text-sm text-muted-foreground">
              {attempt.correct_count}/{attempt.total_questions} correct
              {attempt.time_remaining_seconds != null && ` · ${Math.floor(attempt.time_remaining_seconds / 60)} min remaining`}
            </p>
          </CardContent>
        </Card>

        {/* Domain breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DOMAINS.map((d) => {
              const ds = domainScores[d.id];
              const pct = ds && ds.total > 0 ? Math.round((ds.correct / ds.total) * 100) : 0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="font-medium truncate mr-2">{d.id} {d.name}</span>
                    <span className="font-semibold shrink-0">
                      {ds ? `${ds.correct}/${ds.total} (${pct}%)` : "—"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 70 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-destructive"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3">
          <Button onClick={() => navigate("/test")}>Take New Test</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Dashboard</Button>
        </div>

        {/* Question review */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Question Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {testAnswers.map((ta, i) => {
              const q = ta.questions;
              if (!q) return null;
              const options = Array.isArray(q.options) ? q.options : [];
              const isExpanded = expandedQ === ta.id;
              return (
                <div key={ta.id} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/50 transition-colors"
                    onClick={() => setExpandedQ(isExpanded ? null : ta.id)}
                  >
                    <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      ta.is_correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm truncate">{q.question_text}</span>
                    {ta.is_flagged && <Flag className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    {isExpanded ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t pt-3">
                      <p className="text-sm">{q.question_text}</p>
                      <div className="space-y-1.5">
                        {options.map((opt: any) => {
                          const isUserPick = ta.user_answers.includes(opt.id);
                          const isCorrect = q.correct_answers.includes(opt.id);
                          return (
                            <div
                              key={opt.id}
                              className={`text-sm p-2 rounded ${
                                isCorrect ? "bg-green-50 border border-green-200" : isUserPick ? "bg-red-50 border border-red-200" : "bg-muted/30"
                              }`}
                            >
                              <span className="flex items-center gap-2">
                                {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                                {isUserPick && !isCorrect && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                                {opt.text}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {q.explanation && (
                        <div className="bg-primary/5 rounded-lg p-3 text-sm text-muted-foreground">
                          <span className="font-semibold text-foreground">Explanation: </span>
                          {q.explanation}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
