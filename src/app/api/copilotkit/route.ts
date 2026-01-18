import {
  CopilotRuntime,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { HttpAgent } from "@ag-ui/client";
import { NextRequest } from "next/server";

// Use empty adapter since we're only using one agent
const serviceAdapter = new ExperimentalEmptyAdapter();

// Create CopilotRuntime with HttpAgent pointing to our Pydantic AI agent
const runtime = new CopilotRuntime({
  agents: {
    each_way_agent: new HttpAgent({
      url: process.env.AGENT_URL
        ? `${process.env.AGENT_URL}/agui/`
        : "http://localhost:8000/agui/",
    }),
  },
});

// Next.js API route handler
export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
