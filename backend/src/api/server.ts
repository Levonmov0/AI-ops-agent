/**
 * Express API server for the Gym Assistant.
 *
 * Run with: npx tsx src/api/server.ts
 */

import express, { Request, Response } from "express";
import cors from "cors";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { initializeRagComponents } from "../agents/ragAgent.js";
import { initializeBookingComponents } from "../agents/bookingAgent.js";
import { buildMasterGraph } from "../graph/masterGraph.js";
import "dotenv/config";

const app = express();
app.use(cors());
app.use(express.json());

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
app.post("/api/chat", async (req: Request, res: Response) => {
  const { message, sessionId = crypto.randomUUID() } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const history = sessions.get(sessionId) || [];
  history.push(new HumanMessage(message));

  try {
    const result = await compiledGraph.invoke({ messages: history });
    sessions.set(sessionId, result.messages as BaseMessage[]);

    const lastMessage = result.messages[result.messages.length - 1];
    const content =
      typeof lastMessage.content === "string"
        ? lastMessage.content
        : JSON.stringify(lastMessage.content);

    return res.json({ response: content, sessionId });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ error: "Internal server error" });
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
