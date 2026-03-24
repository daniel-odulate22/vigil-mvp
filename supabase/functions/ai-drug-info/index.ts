import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are Vigil AI, a medication information assistant built into the Vigil health app. Your role is to help patients understand their medications.

You can help with:
- Explaining what a medication is and what it treats
- Common side effects and what to watch for
- Food and drug interactions
- Storage and handling instructions
- General dosage guidance (always defer to their doctor for specific doses)
- Explaining medical terminology in plain language

IMPORTANT RULES:
- Always recommend consulting a doctor or pharmacist for medical decisions
- Never diagnose conditions or recommend specific treatments
- Be concise but thorough — patients need clarity
- If unsure, say so honestly
- Include relevant warnings when discussing medications
- Format responses with clear headings and bullet points when appropriate`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, medications } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context about user's current medications if provided
    let contextMessage = SYSTEM_PROMPT;
    if (medications && medications.length > 0) {
      contextMessage += `\n\nThe patient currently takes these medications:\n${medications
        .map((m: { medication_name: string; dosage?: string; frequency?: string }) =>
          `- ${m.medication_name}${m.dosage ? ` (${m.dosage})` : ""}${m.frequency ? ` — ${m.frequency}` : ""}`
        )
        .join("\n")}\n\nKeep this context in mind when answering questions about interactions or side effects.`;
    }

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: contextMessage },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-drug-info error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
