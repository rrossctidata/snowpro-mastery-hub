import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { BookOpen, Clock, Target, BarChart3, CheckCircle2, Snowflake } from "lucide-react";
import { DOMAINS, EXAM_CONFIG } from "@/lib/constants";

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <Snowflake className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold tracking-tight">SnowPro Prep</span>
          </div>
          <div className="flex gap-3">
            {user ?
            <Button onClick={() => navigate("/dashboard")}>Dashboard</Button> :

            <>
                <Button variant="ghost" onClick={() => navigate("/auth")}>Log In</Button>
                <Button onClick={() => navigate("/auth?mode=signup")}>Sign Up Free</Button>
              </>
            }
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 md:py-28 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            COF-C03 Certification
            <Snowflake className="h-4 w-4" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl">
            Pass the <span className="text-primary">SnowPro Core</span> Exam with Confidence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Realistic practice tests with {EXAM_CONFIG.totalQuestions} questions, {EXAM_CONFIG.timeLimitMinutes}-minute timer, and scaled scoring — just like the real exam. Track your progress and master every domain.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Button size="lg" className="text-base px-8" onClick={() => navigate(user ? "/dashboard" : "/auth?mode=signup")}>
              {user ? "Go to Dashboard" : "Start Studying Free"}
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y bg-muted/50">
        <div className="container py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
          { label: "Questions per Test", value: "100", icon: BookOpen },
          { label: "Time Limit", value: "115 min", icon: Clock },
          { label: "Passing Score", value: "750/1000", icon: Target },
          { label: "Exam Domains", value: "5", icon: BarChart3 }].
          map((s) =>
          <div key={s.label} className="space-y-2">
              <s.icon className="h-8 w-8 mx-auto text-primary" />
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need to Pass</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
          { icon: Target, title: "Practice Tests", desc: "Realistic 100-question timed exams matching the real domain distribution and scaled scoring." },
          { icon: BookOpen, title: "Study Mode", desc: "Learn at your own pace. Get instant feedback and explanations for every question." },
          { icon: BarChart3, title: "Progress Tracking", desc: "Track scores over time, identify weak domains, and measure your improvement." }].
          map((f) =>
          <Card key={f.title} className="border-0 shadow-md">
              <CardContent className="pt-6 space-y-3">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <f.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold">{f.title}</h3>
                <p className="text-muted-foreground text-sm">{f.desc}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Domains */}
      <section className="border-t bg-muted/50">
        <div className="container py-20">
          <h2 className="text-3xl font-bold text-center mb-12">Exam Domains</h2>
          <div className="max-w-2xl mx-auto space-y-4">
            {DOMAINS.map((d) =>
            <div key={d.id} className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{d.id} {d.name}</span>
                    <span className="text-sm font-bold text-primary">{d.weight * 100}%</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-secondary overflow-hidden">
                    <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${d.weight * 100}%` }} />

                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-20 text-center">
        <div className="mx-auto max-w-xl space-y-4">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary" />
          <h2 className="text-3xl font-bold">Ready to Get Certified?</h2>
          <p className="text-muted-foreground">Join now and start preparing for the SnowPro Core exam today.</p>
          <Button size="lg" className="text-base px-8" onClick={() => navigate(user ? "/dashboard" : "/auth?mode=signup")}>
            Get Started
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>SnowPro Prep — Not affiliated with Snowflake Inc.</p>
        </div>
      </footer>
    </div>);

}