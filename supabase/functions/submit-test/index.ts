import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Domain weights matching src/lib/constants.ts
const DOMAINS = [
  { id: "1.0", weight: 0.31 },
  { id: "2.0", weight: 0.20 },
  { id: "3.0", weight: 0.18 },
  { id: "4.0", weight: 0.21 },
  { id: "5.0", weight: 0.10 },
];
const MAX_SCORE = 1000;
const PASSING_SCORE = 750;

interface AnswerInput {
  question_id: string;
  user_answers: string[];
  is_flagged: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client to verify user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { attempt_id, answers, time_remaining_seconds } = await req.json() as {
      attempt_id: string;
      answers: AnswerInput[];
      time_remaining_seconds: number;
    };

    if (!attempt_id || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify attempt belongs to user and is not already completed
    const { data: attempt, error: attemptErr } = await adminClient
      .from("test_attempts")
      .select("*")
      .eq("id", attempt_id)
      .eq("user_id", userId)
      .is("completed_at", null)
      .single();

    if (attemptErr || !attempt) {
      return new Response(JSON.stringify({ error: "Test attempt not found or already completed" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch correct answers using service role (bypasses RLS)
    const questionIds = answers.map((a) => a.question_id);
    const { data: questions, error: qErr } = await adminClient
      .from("questions")
      .select("id, domain, correct_answers")
      .in("id", questionIds);

    if (qErr || !questions) {
      return new Response(JSON.stringify({ error: "Failed to fetch questions" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const questionMap = new Map(questions.map((q: any) => [q.id, q]));

    // Calculate scores server-side
    const domainScores: Record<string, { correct: number; total: number }> = {};
    let correctCount = 0;

    const answerRows = answers.map((ans) => {
      const q = questionMap.get(ans.question_id);
      if (!q) {
        return {
          attempt_id,
          question_id: ans.question_id,
          user_answers: ans.user_answers,
          is_correct: false,
          is_flagged: ans.is_flagged,
          answered_at: ans.user_answers.length > 0 ? new Date().toISOString() : null,
        };
      }

      const isCorrect =
        q.correct_answers.length === ans.user_answers.length &&
        q.correct_answers.every((ca: string) => ans.user_answers.includes(ca));

      if (!domainScores[q.domain]) domainScores[q.domain] = { correct: 0, total: 0 };
      domainScores[q.domain].total++;
      if (isCorrect) {
        domainScores[q.domain].correct++;
        correctCount++;
      }

      return {
        attempt_id,
        question_id: ans.question_id,
        user_answers: ans.user_answers,
        is_correct: isCorrect,
        is_flagged: ans.is_flagged,
        answered_at: ans.user_answers.length > 0 ? new Date().toISOString() : null,
      };
    });

    // Calculate scaled score
    let weightedScore = 0;
    for (const domain of DOMAINS) {
      const result = domainScores[domain.id];
      if (result && result.total > 0) {
        const accuracy = result.correct / result.total;
        weightedScore += accuracy * domain.weight;
      }
    }
    const scaledScore = Math.round(weightedScore * MAX_SCORE);
    const isPass = scaledScore >= PASSING_SCORE;

    // Save results using service role
    await adminClient.from("test_answers").insert(answerRows);
    await adminClient
      .from("test_attempts")
      .update({
        score: scaledScore,
        correct_count: correctCount,
        completed_at: new Date().toISOString(),
        time_remaining_seconds: time_remaining_seconds,
        domain_scores: domainScores,
        is_pass: isPass,
      })
      .eq("id", attempt_id);

    return new Response(
      JSON.stringify({
        score: scaledScore,
        correct_count: correctCount,
        total_questions: answers.length,
        domain_scores: domainScores,
        is_pass: isPass,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
