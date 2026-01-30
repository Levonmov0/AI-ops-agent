/**
 * RAG Agent - answers questions using document retrieval.
 *
 * Uses a vector store to find relevant gym information and context.
 */

import type { ConversationStateType } from "../graph/state.js";
import { retrieverTool, setRetriever } from "../tools/ragTools.js";
import { loadPdf, createVectorStore, getRetriever } from "../lib/vectorStore.js";
import {
  createAgent,
  shouldContinue,
  callLlm,
  executeTools,
  type Agent,
} from "../lib/agentUtils.js";

const SYSTEM_PROMPT = `
You are an assistant that answers questions about Strength & Conditioning Gym.
Use only the provided context. If the answer is not in the context, say you don't have the information.
Be concise and to the point.
`;

let agent: Agent | null = null;

/**
 * Initializes the RAG pipeline: loads PDF, creates embeddings, and configures the agent.
 *
 * Must be called before the agent can process requests.
 *
 * @param pdfPath - Path to the gym information PDF document.
 */
export async function initializeRagComponents(
  pdfPath: string = "../Strength_and_Conditioning_RAG_Test_Document.pdf"
): Promise<void> {
  const documents = await loadPdf(pdfPath);
  const vectorStore = await createVectorStore(documents);
  const retriever = getRetriever(vectorStore);
  setRetriever(retriever);

  agent = createAgent({
    systemPrompt: SYSTEM_PROMPT,
    tools: [retrieverTool],
  });

  console.log("RAG components initialized.");
}

/** Checks if the agent has pending tool calls. */
export function shouldContinueRag(state: ConversationStateType): boolean {
  return shouldContinue(state);
}

/** Invokes the LLM with the RAG system prompt. */
export async function callLlmRag(
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  if (!agent) {
    throw new Error("RAG components not initialized.");
  }
  return callLlm(agent, state);
}

/** Executes retriever tool calls from the last message. */
export async function executeRagTools(
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  if (!agent) {
    throw new Error("RAG components not initialized.");
  }
  return executeTools(agent, state);
}
