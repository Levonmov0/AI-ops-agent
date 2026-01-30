/**
 * Conversation state schema for the multi-agent system.
 *
 * Extends LangGraph's MessagesAnnotation with routing intent.
 */

import { Annotation, MessagesAnnotation } from "@langchain/langgraph";

/** Conversation state containing message history and routing intent. */
export const ConversationState = Annotation.Root({
  ...MessagesAnnotation.spec,
  intent: Annotation<string>({
    reducer: (_, newIntent) => newIntent,
    default: () => "",
  }),
});

export type ConversationStateType = typeof ConversationState.State;
