import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = "";
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(current.trim());
        current = "";
      } else if (char === "\n" || (char === "\r" && text[i + 1] === "\n")) {
        if (char === "\r") i++;
        row.push(current.trim());
        current = "";
        if (row.length > 1) rows.push(row);
        row = [];
      } else {
        current += char;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.length > 1) rows.push(row);
  }
  return rows;
}

function parseOptions(choicesText: string): { key: string; text: string }[] {
  const options: { key: string; text: string }[] = [];
  // Match patterns like "A. ...", "B. ...", etc.
  const regex = /([A-F])\.\s+([\s\S]*?)(?=(?:\n[A-F]\.\s)|$)/g;
  let match;
  while ((match = regex.exec(choicesText)) !== null) {
    options.push({ key: match[1], text: match[2].trim() });
  }
  return options;
}

function parseCorrectAnswers(answerText: string): string[] {
  // Could be "B" or "A, B, C" or "A, B, C, D"
  return answerText.split(",").map((a) => a.trim()).filter(Boolean);
}

function mapDomain(domainText: string): string {
  // Extract domain number like "1.0", "2.0", etc.
  const match = domainText.match(/^(\d+\.\d+)/);
  return match ? match[1] : domainText;
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
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify user identity
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

    const supabase = createClient(supabaseUrl, serviceKey);

    const { csv_content } = await req.json();
    if (!csv_content) {
      return new Response(JSON.stringify({ error: "csv_content required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rows = parseCSV(csv_content);
    // Skip header row
    const dataRows = rows.slice(1);

    const questions = dataRows.map((row) => {
      // Columns: Question, Choices, Correct Answer(s), Difficulty, Domain, Explanation, Question Type, Source URL
      const [questionText, choices, correctAnswer, _difficulty, domain, explanation, questionType, _sourceUrl] = row;

      const options = parseOptions(choices);
      const correctAnswers = parseCorrectAnswers(correctAnswer);
      const domainId = mapDomain(domain);
      const qType = questionType?.toLowerCase().includes("select") ? "multi" : "single";

      return {
        question_text: questionText,
        options: options,
        correct_answers: correctAnswers,
        domain: domainId,
        explanation: explanation || null,
        question_type: qType,
      };
    });

    // Filter out any malformed entries
    const valid = questions.filter(
      (q) => q.question_text && q.options.length >= 2 && q.correct_answers.length >= 1 && q.domain
    );

    // Insert in batches of 50
    let inserted = 0;
    for (let i = 0; i < valid.length; i += 50) {
      const batch = valid.slice(i, i + 50);
      const { error } = await supabase.from("questions").insert(batch);
      if (error) {
        console.error("Batch insert error:", error);
        return new Response(
          JSON.stringify({ error: error.message, inserted }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      inserted += batch.length;
    }

    return new Response(
      JSON.stringify({ success: true, total_parsed: valid.length, inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
