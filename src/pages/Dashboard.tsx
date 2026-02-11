import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAINS, EXAM_CONFIG } from "@/lib/constants";
import { Play, BookOpen, Trophy, Target, Hash, TrendingUp } from "lucide-react";

interface AttemptRow {
  id: string;
  score: number | null;
  is_pass: boolean | null;
  completed_at: string | null;
  domain_scores: any;
  total_questions: number;
  correct_count: number | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("test_attempts")
      .select("*")
      .eq("mode", "practice")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: false })
      .then(({ data }) => {
        setAttempts((data as AttemptRow[]) || []);
        setLoading(false);
      });
  }, [user]);

  const completedTests = attempts.length;
  const avgScore = completedTests > 0
    ? Math.round(attempts.reduce((s, a) => s + (a.score || 0), 0) / completedTests)
    : 0;
  const passRate = completedTests > 0
    ? Math.round((attempts.filter((a) => a.is_pass).length / completedTests) * 100)
    : 0;

  // Aggregate domain performance
  const domainAgg: Record<string, { correct: number; total: number }> = {};
  DOMAINS.forEach((d) => (domainAgg[d.id] = { correct: 0, total: 0 }));
  attempts.forEach((a) => {
    if (a.domain_scores && typeof a.domain_scores === "object") {
      const scores = a.domain_scores as Record<string, { correct: number; total: number }>;
      Object.entries(scores).forEach(([k, v]) => {
        if (domainAgg[k]) {
          domainAgg[k].correct += v.correct;
          domainAgg[k].total += v.total;
        }
      });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Your SnowPro Core exam preparation overview</p>
        </div>

        {/* Quick actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button size="lg" className="gap-2" onClick={() => navigate("/test")}>
            <Play className="h-5 w-5" /> Start Practice Test
          </Button>
          <Button size="lg" variant="outline" className="gap-2" onClick={() => navigate("/study")}>
            <BookOpen className="h-5 w-5" /> Study Mode
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Tests Taken", value: completedTests, icon: Hash },
            { label: "Avg Score", value: completedTests ? `${avgScore}/1000` : "—", icon: Target },
            { label: "Pass Rate", value: completedTests ? `${passRate}%` : "—", icon: Trophy },
            { label: "Passing", value: `${EXAM_CONFIG.passingScore}+`, icon: TrendingUp },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Domain breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DOMAINS.map((d) => {
              const agg = domainAgg[d.id];
              const pct = agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : 0;
              return (
                <div key={d.id}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="font-medium truncate mr-2">{d.id} {d.name}</span>
                    <span className="font-semibold shrink-0">{agg.total > 0 ? `${pct}%` : "—"}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {completedTests === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Complete a practice test to see your domain performance.</p>
            )}
          </CardContent>
        </Card>

        {/* Recent tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No tests yet. Start your first practice test!</p>
            ) : (
              <div className="space-y-3">
                {attempts.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/results/${a.id}`)}
                  >
                    <div>
                      <p className="font-medium text-sm">Practice Test</p>
                      <p className="text-xs text-muted-foreground">
                        {a.completed_at ? new Date(a.completed_at).toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${a.is_pass ? "text-green-600" : "text-destructive"}`}>
                        {a.score}/1000
                      </p>
                      <p className={`text-xs font-medium ${a.is_pass ? "text-green-600" : "text-destructive"}`}>
                        {a.is_pass ? "PASS" : "FAIL"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
