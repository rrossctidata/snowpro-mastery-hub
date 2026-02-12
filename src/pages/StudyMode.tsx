import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DOMAINS } from "@/lib/constants";
import { CheckCircle2, XCircle, ChevronRight, BookOpen, Shuffle, Loader2 } from "lucide-react";

interface QuestionOption { id: string; text: string; }
interface Question {
  id: string; domain: string; question_text: string; question_type: string;
  options: QuestionOption[]; explanation: string | null;
}

interface RevealedResult {
  is_correct: boolean;
  correct_answers: string[];
  explanation: string | null;
}

export default function StudyMode() {
  const { user } = useAuth();
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [revealedResult, setRevealedResult] = useState<RevealedResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch from the public view (no correct_answers)
    (supabase as any).from("questions_public").select("*").then(({ data }: any) => {
      const qs = (data || []).map((q: any) => ({
        ...q,
        options: Array.isArray(q.options) ? q.options : [],
      })) as Question[];
      setAllQuestions(qs);
      setLoading(false);
    });
  }, []);

  const startStudy = () => {
    let pool = allQuestions;
    if (selectedDomains.length > 0) {
      pool = allQuestions.filter((q) => selectedDomains.includes(q.domain));
    }
    setQuestions([...pool].sort(() => Math.random() - 0.5));
    setCurrentIdx(0);
    setSelectedAnswers([]);
    setRevealed(false);
    setRevealedResult(null);
    setStarted(true);
  };

  const toggleDomain = (id: string) => {
    setSelectedDomains((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const checkAnswer = async () => {
    if (!questions[currentIdx]) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke("check-answer", {
        body: {
          question_id: questions[currentIdx].id,
          user_answers: selectedAnswers,
        },
      });
      if (error) {
        setRevealedResult({ is_correct: false, correct_answers: [], explanation: "Failed to check answer." });
      } else {
        setRevealedResult(data as RevealedResult);
      }
    } catch {
      setRevealedResult({ is_correct: false, correct_answers: [], explanation: "Failed to check answer." });
    }
    setRevealed(true);
    setChecking(false);
  };

  const nextQuestion = () => {
    setCurrentIdx((i) => i + 1);
    setSelectedAnswers([]);
    setRevealed(false);
    setRevealedResult(null);
  };

  const setAnswer = (optId: string, isMulti: boolean) => {
    if (revealed) return;
    if (isMulti) {
      setSelectedAnswers((prev) =>
        prev.includes(optId) ? prev.filter((a) => a !== optId) : [...prev, optId]
      );
    } else {
      setSelectedAnswers([optId]);
    }
  };

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

  if (!started) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-8 max-w-2xl space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Study Mode</h1>
            <p className="text-muted-foreground">Learn at your own pace with instant feedback</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Select Domains (optional)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {DOMAINS.map((d) => (
                <label key={d.id} className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={selectedDomains.includes(d.id)}
                    onCheckedChange={() => toggleDomain(d.id)}
                  />
                  <span className="text-sm">{d.id} {d.name}</span>
                </label>
              ))}
              <p className="text-xs text-muted-foreground">Leave all unchecked to study all domains.</p>
            </CardContent>
          </Card>
          <Button size="lg" className="gap-2" onClick={startStudy} disabled={allQuestions.length === 0}>
            <BookOpen className="h-5 w-5" />
            {allQuestions.length === 0 ? "No questions available" : "Start Studying"}
          </Button>
        </main>
      </div>
    );
  }

  if (currentIdx >= questions.length) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-8 max-w-2xl text-center space-y-6">
          <CheckCircle2 className="h-16 w-16 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Study Complete!</h1>
          <p className="text-muted-foreground">You've reviewed all {questions.length} questions.</p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => { setStarted(false); setSelectedDomains([]); }}>
              <Shuffle className="h-4 w-4 mr-1" /> Study Again
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const q = questions[currentIdx];
  const correctAnswers = revealedResult?.correct_answers || [];
  const isCorrect = revealedResult?.is_correct || false;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8 max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            Question {currentIdx + 1} of {questions.length}
          </span>
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
            Domain {q.domain}
          </span>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="font-medium">{q.question_text}</p>
            <p className="text-xs text-muted-foreground">
              {q.question_type === "multi" ? "Select all that apply" : "Select one"}
            </p>

            {q.question_type === "single" ? (
              <RadioGroup value={selectedAnswers[0] || ""} onValueChange={(v) => setAnswer(v, false)}>
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isUserPick = selectedAnswers.includes(opt.id);
                    const isCorrectOpt = revealed && correctAnswers.includes(opt.id);
                    let bg = "";
                    if (revealed) {
                      if (isCorrectOpt) bg = "bg-green-50 border-green-200";
                      else if (isUserPick) bg = "bg-red-50 border-red-200";
                    }
                    return (
                      <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${bg}`}>
                        <RadioGroupItem value={opt.id} className="mt-0.5" disabled={revealed} />
                        <span className="text-sm flex-1">{opt.text}</span>
                        {revealed && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                        {revealed && isUserPick && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                      </label>
                    );
                  })}
                </div>
              </RadioGroup>
            ) : (
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const isUserPick = selectedAnswers.includes(opt.id);
                  const isCorrectOpt = revealed && correctAnswers.includes(opt.id);
                  let bg = "";
                  if (revealed) {
                    if (isCorrectOpt) bg = "bg-green-50 border-green-200";
                    else if (isUserPick) bg = "bg-red-50 border-red-200";
                  }
                  return (
                    <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${bg}`}>
                      <Checkbox checked={isUserPick} onCheckedChange={() => setAnswer(opt.id, true)} className="mt-0.5" disabled={revealed} />
                      <span className="text-sm flex-1">{opt.text}</span>
                      {revealed && isCorrectOpt && <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />}
                      {revealed && isUserPick && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                    </label>
                  );
                })}
              </div>
            )}

            {revealed && revealedResult && (
              <div className={`p-4 rounded-lg ${isCorrect ? "bg-green-50" : "bg-red-50"}`}>
                <p className={`font-semibold text-sm ${isCorrect ? "text-green-700" : "text-red-700"}`}>
                  {isCorrect ? "Correct!" : "Incorrect"}
                </p>
                {revealedResult.explanation && (
                  <p className="text-sm text-muted-foreground mt-2">{revealedResult.explanation}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          {!revealed ? (
            <Button onClick={checkAnswer} disabled={selectedAnswers.length === 0 || checking}>
              {checking ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Checking...</> : "Check Answer"}
            </Button>
          ) : (
            <Button onClick={nextQuestion} className="gap-1">
              Next Question <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
