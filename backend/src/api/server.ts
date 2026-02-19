/**
 * Express API server for the Gym Assistant.
 *
 * Run with: npx tsx src/api/server.ts
 */

import express, { Request, Response } from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { initializeRagComponents } from "../agents/ragAgent.js";
import { initializeBookingComponents } from "../agents/bookingAgent.js";
import { buildMasterGraph } from "../graph/masterGraph.js";
import { getResponseContent } from "../lib/agentUtils.js";
import "dotenv/config";

const app = express();
app.use(cors({
  exposedHeaders: ["RateLimit-Limit", "RateLimit-Remaining", "RateLimit-Reset"],
}));
app.use(express.json());

const chatRateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Demo limit reached: 15 messages per IP per day. Please try again tomorrow." },
});

const sessions = new Map<string, BaseMessage[]>();
let compiledGraph: ReturnType<typeof buildMasterGraph>;

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

/**
 * Chat endpoint - sends a message and receives an AI response.
 *
 * @example POST /api/chat { "message": "Hello", "sessionId": "optional" }
 */
app.post("/api/chat", chatRateLimiter, async (req: Request, res: Response) => {
  const { message, sessionId = crypto.randomUUID() } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const history = sessions.get(sessionId) || [];
  history.push(new HumanMessage(message));

  try {
    const prevLength = history.length;
    const result = await compiledGraph.invoke({ messages: history });
    sessions.set(sessionId, result.messages as BaseMessage[]);
    const newMessages = result.messages.slice(prevLength);
    const toolsUsed = newMessages.filter((msg: BaseMessage) => msg.getType() === "tool").map((msg: any) => msg.name)
    const agentUsed = result.intent

    const content = getResponseContent(result.messages);
    
    const confirmationMatch = content.match(/\[CONFIRM_ACTION\]([\s\S]*?)\[\/CONFIRM_ACTION\]/);
    
    if (confirmationMatch) {
      const parsed = JSON.parse(confirmationMatch[1].trim());
      return res.json({
        response: parsed.message,
        type: "confirmation",
        sessionId,
        tools: toolsUsed,
        agent: agentUsed
      })
    }

    return res.json({ response: content, type: "text",  sessionId, tools: toolsUsed, agent: agentUsed});
  } catch (error) {
    console.error("Chat error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    return res.status(500).json({ error: message, type: "error" });
  }
});

/** Clears a session's conversation history. */
app.delete("/api/session/:sessionId", (req: Request, res: Response) => {
  sessions.delete(req.params.sessionId);
  res.json({ success: true });
});

async function initialize() {
  const pdfPath = process.env.RAG_PDF_PATH || "../Strength_and_Conditioning_RAG_Test_Document.pdf";

  console.log("Initializing components...");
  await initializeRagComponents(pdfPath);
  initializeBookingComponents();
  compiledGraph = buildMasterGraph();
  console.log("API ready");
}

const PORT = process.env.PORT || 3001;

initialize().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
