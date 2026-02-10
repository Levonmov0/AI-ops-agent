/**
 * RAG Agent - answers questions using document retrieval.
 *
 * Uses a vector store to find relevant gym information and context.
 */

import { retrieverTool, setRetriever } from "../tools/ragTools.js";
import { loadPdf, createVectorStore, getRetriever } from "../lib/vectorStore.js";
import { AgentNode } from "../lib/agentUtils.js";

const SYSTEM_PROMPT = `
You are an assistant that answers questions about Strength & Conditioning Gym.
Use only the provided context. If the answer is not in the context, say you don't have the information.
Be concise and to the point.
`;

const ragNode = new AgentNode("RAG");

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

  ragNode.initialize({
    systemPrompt: SYSTEM_PROMPT,
    tools: [retrieverTool],
  });

  console.log("RAG components initialized.");
}

export const shouldContinueRag = ragNode.shouldContinue;
export const callLlmRag = ragNode.callLlm;
export const executeRagTools = ragNode.executeTools;
