// src/lib/groq.ts

import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

export type GroqMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const FALLBACK_RESPONSE =
  "I'm sorry, I couldn't process your request right now. Please try again later.";

export async function callGroq(
  messages: GroqMessage[],
  systemPrompt: string
): Promise<string> {
  let groqApiKey: string | null = null;
  let groqModel = "llama-3.3-70b-versatile";
  let groqTemperature = 0.7;

  try {
    const config = await prisma.clubConfig.findUnique({
      where: { id: "main" },
      select: {
        groqApiKey: true,
        groqModel: true,
        groqTemperature: true,
      },
    });

    const DECOMMISSIONED_MODELS = ["llama3-70b-8192", "llama3-8b-8192", "mixtral-8x7b-32768"];
    if (config) {
      groqApiKey = config.groqApiKey || null;
      const dbModel = config.groqModel || "";
      groqModel = dbModel && !DECOMMISSIONED_MODELS.includes(dbModel)
        ? dbModel
        : "llama-3.3-70b-versatile";
      groqTemperature = config.groqTemperature ?? 0.7;
    }
  } catch (configError) {
    console.error(
      "[groq.ts] Failed to fetch Groq config from database:",
      configError
    );
  }

  if (!groqApiKey) {
    groqApiKey = process.env.GROQ_API_KEY || null;
  }

  // Also check env var first as a bootstrap if DB had no key
  if (!groqApiKey && process.env.GROQ_API_KEY) {
    groqApiKey = process.env.GROQ_API_KEY;
  }

  if (!groqApiKey) {
    console.error(
      "[groq.ts] No Groq API key available — neither in database nor in GROQ_API_KEY env var."
    );
    return FALLBACK_RESPONSE;
  }

  try {
    const client = new Groq({ apiKey: groqApiKey });

    type GroqCompletionMessage = { role: "system" | "user" | "assistant"; content: string };
    const allMessages: GroqCompletionMessage[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((m): GroqCompletionMessage => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const completion = await client.chat.completions.create({
      model: groqModel,
      temperature: groqTemperature,
      max_tokens: 1000,
      messages: allMessages,
    });

    const content = completion.choices?.[0]?.message?.content;

    if (!content || content.trim() === "") {
      console.error(
        "[groq.ts] Groq returned an empty response for model:",
        groqModel
      );
      return FALLBACK_RESPONSE;
    }

    return content.trim();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(
        "[groq.ts] Groq API call failed:",
        error.message,
        "Model:",
        groqModel
      );
    } else {
      console.error("[groq.ts] Groq API call failed with unknown error:", error);
    }
    return FALLBACK_RESPONSE;
  }
}