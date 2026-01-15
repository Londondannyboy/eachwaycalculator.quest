import {
  CopilotRuntime,
  GoogleGenerativeAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest } from "next/server";

// Lazy initialization to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null;
let serviceAdapter: GoogleGenerativeAIAdapter | null = null;
let runtime: CopilotRuntime | null = null;

function getRuntime() {
  if (!genAI) {
    genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  }
  if (!serviceAdapter) {
    serviceAdapter = new GoogleGenerativeAIAdapter({ model: "gemini-1.5-flash" });
  }
  if (!runtime) {
    runtime = new CopilotRuntime();
  }
  return { runtime, serviceAdapter };
}

export const POST = async (req: NextRequest) => {
  const { runtime, serviceAdapter } = getRuntime();

  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
