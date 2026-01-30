/**
 * RAG tools for the RAGAgent.
 *
 * The retriever must be initialized via `setRetriever` before use.
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import type { VectorStoreRetriever } from "@langchain/core/vectorstores";

let retriever: VectorStoreRetriever | null = null;

/**
 * Injects the vector store retriever for document search.
 *
 * Must be called during initialization before the RAGAgent processes requests.
 */
export function setRetriever(r: VectorStoreRetriever): void {
  retriever = r;
}

export const retrieverTool = new DynamicStructuredTool({
  name: "retriever_tool",
  description:
    "Search and return information from the strength and conditioning gym documents",
  schema: z.object({
    query: z.string().describe("The search query"),
  }),
  func: async ({ query }) => {
    if (!retriever) {
      throw new Error("Retriever not initialized. Call setRetriever() first.");
    }

    const docs = await retriever.invoke(query);

    if (!docs.length) {
      return "No relevant information found.";
    }

    return docs.map((doc, i) => `Document ${i + 1}:\n${doc.pageContent}\n`).join("\n\n");
  },
});

/** All RAG tools available to the RAGAgent. */
export const ragTools = [retrieverTool];
