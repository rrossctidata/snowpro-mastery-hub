import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { EXAM_CONFIG, DOMAIN_QUESTION_COUNTS } from "@/lib/constants";
import { Flag, Clock, ChevronLeft, ChevronRight, Send, Snowflake } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  domain: string;
  question_text: string;
  question_type: string;
  options: QuestionOption[];
  explanation: string | null;
}

interface AnswerState {
  userAnswers: string[];
  isFlagged: boolean;
}

export default function PracticeTest() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(EXAM_CONFIG.timeLimitMinutes * 60);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Load questions from the public view (no correct_answers exposed)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: allQ } = await (supabase as any).from("questions_public").select("*");
      if (!allQ || allQ.length === 0) {
        toast({ title: "No questions", description: "Please upload questions to the question bank first.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }

      // Group by domain and pick weighted random
      const byDomain: Record<string, Question[]> = {};
      allQ.forEach((q: any) => {
        const opts = Array.isArray(q.options) ? q.options : [];
        const question: Question = { ...q, options: opts as unknown as QuestionOption[] };
        if (!byDomain[q.domain]) byDomain[q.domain] = [];
        byDomain[q.domain].push(question);
      });

      const selected: Question[] = [];
      Object.entries(DOMAIN_QUESTION_COUNTS).forEach(([domainId, count]) => {
        const pool = byDomain[domainId] || [];
        const shuffled = [...pool].sort(() => Math.random() - 0.5);
        selected.push(...shuffled.slice(0, count));
      });

      // If not enough, fill from remaining
      if (selected.length < EXAM_CONFIG.totalQuestions) {
        const usedIds = new Set(selected.map((q) => q.id));
        const remaining = allQ
          .filter((q: any) => !usedIds.has(q.id))
          .sort(() => Math.random() - 0.5);
        for (const q of remaining) {
          if (selected.length >= EXAM_CONFIG.totalQuestions) break;
          const opts = Array.isArray(q.options) ? q.options : [];
          selected.push({ ...q, options: opts as unknown as QuestionOption[] });
        }
      }

      const finalQuestions = selected.slice(0, EXAM_CONFIG.totalQuestions).sort(() => Math.random() - 0.5);
      setQuestions(finalQuestions);

      // Init answers
      const initAnswers: Record<string, AnswerState> = {};
      finalQuestions.forEach((q) => (initAnswers[q.id] = { userAnswers: [], isFlagged: false }));
      setAnswers(initAnswers);

      // Create attempt
      const { data: attempt } = await supabase
        .from("test_attempts")
        .insert({ user_id: user.id, mode: "practice", total_questions: finalQuestions.length })
        .select()
        .single();
      if (attempt) setAttemptId(attempt.id);

      setLoading(false);
    })();
  }, [user]);

  // Timer
  useEffect(() => {
    if (loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const currentQ = questions[currentIdx];

  const setAnswer = (questionId: string, optionId: string, isMulti: boolean) => {
    setAnswers((prev) => {
      const current = prev[questionId] || { userAnswers: [], isFlagged: false };
      let newAnswers: string[];
      if (isMulti) {
        newAnswers = current.userAnswers.includes(optionId)
          ? current.userAnswers.filter((a) => a !== optionId)
          : [...current.userAnswers, optionId];
      } else {
        newAnswers = [optionId];
      }
      return { ...prev, [questionId]: { ...current, userAnswers: newAnswers } };
    });
  };

  const toggleFlag = () => {
    if (!currentQ) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQ.id]: { ...prev[currentQ.id], isFlagged: !prev[currentQ.id]?.isFlagged },
    }));
  };

  const handleSubmit = useCallback(async () => {
    if (submitting || !attemptId) return;
    setSubmitting(true);
    clearInterval(timerRef.current);

    // Submit answers to server-side edge function for scoring
    const answersPayload = questions.map((q) => {
      const ans = answers[q.id] || { userAnswers: [], isFlagged: false };
      return {
        question_id: q.id,
        user_answers: ans.userAnswers,
        is_flagged: ans.isFlagged,
      };
    });

    try {
      const { data, error } = await supabase.functions.invoke("submit-test", {
        body: {
          attempt_id: attemptId,
          answers: answersPayload,
          time_remaining_seconds: timeLeft,
        },
      });

      if (error) {
        toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
        setSubmitting(false);
        return;
      }

      navigate(`/results/${attemptId}`);
    } catch (err) {
      toast({ title: "Submission failed", description: "Please try again.", variant: "destructive" });
      setSubmitting(false);
    }
  }, [submitting, attemptId, questions, answers, timeLeft, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <Snowflake className="h-12 w-12 text-primary mx-auto animate-spin" />
          <p className="text-muted-foreground">Preparing your exam...</p>
        </div>
      </div>
    );
  }

  if (!currentQ) return null;

  const answeredCount = Object.values(answers).filter((a) => a.userAnswers.length > 0).length;
  const flaggedCount = Object.values(answers).filter((a) => a.isFlagged).length;
  const ans = answers[currentQ.id] || { userAnswers: [], isFlagged: false };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="border-b bg-card sticky top-0 z-50 px-4 py-2">
        <div className="flex items-center justify-between max-w-5xl mx-auto">
          <div className="flex items-center gap-4">
            <Snowflake className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">
              Q {currentIdx + 1}/{questions.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {answeredCount} answered · {flaggedCount} flagged
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timeLeft < 300 ? "text-destructive" : ""}`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowNav(!showNav)}>
              Navigator
            </Button>
            <Button size="sm" variant="destructive" onClick={handleSubmit} disabled={submitting}>
              <Send className="h-4 w-4 mr-1" /> {submitting ? "Submitting..." : "Submit"}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-5xl mx-auto w-full">
        {/* Question */}
        <div className="flex-1 p-6 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                Domain {currentQ.domain}
              </span>
              <span className="text-xs font-medium text-muted-foreground ml-2">
                {currentQ.question_type === "multi" ? "Select all that apply" : "Select one"}
              </span>
            </div>
            <Button
              variant={ans.isFlagged ? "default" : "outline"}
              size="sm"
              onClick={toggleFlag}
              className="gap-1 shrink-0"
            >
              <Flag className="h-3.5 w-3.5" />
              {ans.isFlagged ? "Flagged" : "Flag"}
            </Button>
          </div>

          <p className="text-base leading-relaxed font-medium">{currentQ.question_text}</p>

          {currentQ.question_type === "single" ? (
            <RadioGroup
              value={ans.userAnswers[0] || ""}
              onValueChange={(v) => setAnswer(currentQ.id, v, false)}
            >
              <div className="space-y-3">
                {currentQ.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <RadioGroupItem value={opt.id} className="mt-0.5" />
                    <span className="text-sm">{opt.text}</span>
                  </label>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <div className="space-y-3">
              {currentQ.options.map((opt) => (
                <label
                  key={opt.id}
                  className="flex items-start gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    checked={ans.userAnswers.includes(opt.id)}
                    onCheckedChange={() => setAnswer(currentQ.id, opt.id, true)}
                    className="mt-0.5"
                  />
                  <span className="text-sm">{opt.text}</span>
                </label>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
              disabled={currentIdx === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
              disabled={currentIdx === questions.length - 1}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* Navigator panel */}
        {showNav && (
          <div className="w-64 border-l bg-card p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-3">Question Navigator</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {questions.map((q, i) => {
                const a = answers[q.id];
                const isAnswered = a?.userAnswers.length > 0;
                const isFlagged = a?.isFlagged;
                const isCurrent = i === currentIdx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(i)}
                    className={`h-9 w-9 rounded text-xs font-medium border transition-colors ${
                      isCurrent ? "ring-2 ring-primary" : ""
                    } ${isAnswered ? "bg-primary text-primary-foreground" : "bg-card"} ${
                      isFlagged ? "border-amber-400 border-2" : ""
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
            <div className="mt-4 space-y-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded bg-primary" /> Answered
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded border-2 border-amber-400" /> Flagged
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded border" /> Unanswered
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
