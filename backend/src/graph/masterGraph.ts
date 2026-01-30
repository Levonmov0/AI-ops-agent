/**
 * Master graph orchestrating the multi-agent system.
 *
 * Routes user requests through FrontDeskAgent to specialized agents.
 */

import { StateGraph, END, START } from "@langchain/langgraph";
import { ConversationState } from "./state.js";
import { classifyIntent, routeRequest } from "../agents/frontDeskAgent.js";
import {
  callLlmRag,
  executeRagTools,
  shouldContinueRag,
} from "../agents/ragAgent.js";
import {
  callLlmBooking,
  executeBookingTools,
  shouldContinueBooking,
} from "../agents/bookingAgent.js";

/**
 * Builds and compiles the LangGraph state machine.
 *
 * Graph structure:
 * - Entry: classify_intent (FrontDeskAgent)
 * - Routes to: RAGAgent, BookingAgent, or END
 * - Each agent runs a tool-calling loop until complete
 */
export function buildMasterGraph() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graph = new StateGraph(ConversationState) as any;

  graph.addNode("classify_intent", classifyIntent);
  graph.addNode("rag_call_llm", callLlmRag);
  graph.addNode("rag_execute_tools", executeRagTools);
  graph.addNode("booking_call_llm", callLlmBooking);
  graph.addNode("booking_execute_tools", executeBookingTools);

  graph.addEdge(START, "classify_intent");

  graph.addConditionalEdges("classify_intent", routeRequest, {
    END: END,
    rag_call_llm: "rag_call_llm",
    booking_call_llm: "booking_call_llm",
  });

  graph.addConditionalEdges(
    "rag_call_llm",
    (state: typeof ConversationState.State) =>
      shouldContinueRag(state) ? "continue" : "end",
    { continue: "rag_execute_tools", end: END }
  );
  graph.addEdge("rag_execute_tools", "rag_call_llm");

  graph.addConditionalEdges(
    "booking_call_llm",
    (state: typeof ConversationState.State) =>
      shouldContinueBooking(state) ? "continue" : "end",
    { continue: "booking_execute_tools", end: END }
  );
  graph.addEdge("booking_execute_tools", "booking_call_llm");

  return graph.compile();
}
