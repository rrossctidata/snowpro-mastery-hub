import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DOMAINS, EXAM_CONFIG } from "@/lib/constants";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function Progress() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("test_attempts")
      .select("*")
      .eq("mode", "practice")
      .not("completed_at", "is", null)
      .order("completed_at", { ascending: true })
      .then(({ data }) => {
        setAttempts(data || []);
        setLoading(false);
      });
  }, [user]);

  const totalTests = attempts.length;
  const totalCorrect = attempts.reduce((s, a) => s + (a.correct_count || 0), 0);
  const totalQuestions = attempts.reduce((s, a) => s + (a.total_questions || 0), 0);
  const overallAccuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const passCount = attempts.filter((a) => a.is_pass).length;

  const chartData = attempts.map((a, i) => ({
    name: `Test ${i + 1}`,
    score: a.score,
    date: new Date(a.completed_at).toLocaleDateString(),
  }));

  // Domain aggregation
  const domainAgg: Record<string, { correct: number; total: number }> = {};
  DOMAINS.forEach((d) => (domainAgg[d.id] = { correct: 0, total: 0 }));
  attempts.forEach((a) => {
    if (a.domain_scores && typeof a.domain_scores === "object") {
      Object.entries(a.domain_scores as Record<string, { correct: number; total: number }>).forEach(([k, v]) => {
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
      <main className="container py-8 space-y-8 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Progress</h1>
          <p className="text-muted-foreground">Track your improvement over time</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Tests Completed", value: totalTests },
            { label: "Overall Accuracy", value: `${overallAccuracy}%` },
            { label: "Tests Passed", value: passCount },
            { label: "Questions Answered", value: totalQuestions },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-6 text-center">
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Score chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Score History</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Complete practice tests to see your score history.</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis domain={[0, 1000]} className="text-xs" />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border rounded-lg p-2 shadow text-sm">
                          <p className="font-medium">{d.name}</p>
                          <p>Score: {d.score}/1000</p>
                          <p className="text-xs text-muted-foreground">{d.date}</p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={EXAM_CONFIG.passingScore} stroke="hsl(152, 60%, 42%)" strokeDasharray="5 5" label="Pass" />
                  <Line type="monotone" dataKey="score" stroke="hsl(199, 89%, 48%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Domain heatmap */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Domain Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {DOMAINS.map((d) => {
              const agg = domainAgg[d.id];
              const pct = agg.total > 0 ? Math.round((agg.correct / agg.total) * 100) : 0;
              const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : pct >= 1 ? "bg-destructive" : "bg-secondary";
              return (
                <div key={d.id}>
                  <div className="flex justify-between mb-1 text-sm">
                    <span className="font-medium truncate mr-2">{d.id} {d.name}</span>
                    <span className="font-semibold shrink-0">{agg.total > 0 ? `${pct}% (${agg.correct}/${agg.total})` : "—"}</span>
                  </div>
                  <div className="h-3 rounded-full bg-secondary overflow-hidden">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
