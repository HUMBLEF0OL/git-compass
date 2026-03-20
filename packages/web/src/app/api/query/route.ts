import { NextRequest, NextResponse } from "next/server";
import { 
  getAIProvider, 
  AIProviderType, 
  queryAnalysis 
} from "@git-compass/core";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      query, 
      analysisContext,
      aiProvider = "openai",
      aiApiKey = ""
    } = body;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    const finalApiKey = aiApiKey || process.env.OPENAI_API_KEY;
    if (!finalApiKey) {
      return NextResponse.json({ error: "AI API Key is missing. Please provide one in Settings." }, { status: 401 });
    }

    const providerType = aiProvider === "anthropic" ? AIProviderType.ANTHROPIC : 
                         aiProvider === "google" ? AIProviderType.GEMINI : 
                         AIProviderType.OPENAI;
                         
    const provider = getAIProvider(providerType, finalApiKey);
    
    // Perfrom the query
    const answer = await queryAnalysis(provider, query, analysisContext);

    return NextResponse.json({ answer });
  } catch (err: any) {
    console.error("AI Query failed:", err);
    return NextResponse.json({ error: err.message || "Query failed" }, { status: 500 });
  }
}
