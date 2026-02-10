import { ChatOpenAI } from "@langchain/openai";
import {
  SystemMessage,
  ToolMessage,
  AIMessage,
  BaseMessage,
} from "@langchain/core/messages";
import type { StructuredToolInterface } from "@langchain/core/tools";
import type { ConversationStateType } from "../graph/state.js";
import { MODEL_CONFIG } from "./llm.js";

/** Configuration for initializing a tool-enabled LLM agent. */
export interface AgentConfig {
  systemPrompt: string;
  tools: StructuredToolInterface[];
  temperature?: number;
}

/** Encapsulates an LLM with bound tools and lookup dictionary. */
export interface Agent {
  llmWithTools: ReturnType<ChatOpenAI["bindTools"]>;
  toolsDict: Map<string, StructuredToolInterface>;
  systemPrompt: string;
}

/**
 * Creates a tool-enabled agent from the provided configuration.
 *
 * Binds the tools to the LLM and builds a lookup dictionary for tool execution.
 */
export function createAgent(config: AgentConfig): Agent {
  const llm = new ChatOpenAI({
    model: MODEL_CONFIG.modelName,
    temperature: config.temperature ?? MODEL_CONFIG.agentTemperature,
  });

  const llmWithTools = llm.bindTools(config.tools);
  const toolsDict = new Map(config.tools.map((tool) => [tool.name, tool]));

  return { llmWithTools, toolsDict, systemPrompt: config.systemPrompt };
}

/**
 * Determines if the agent has pending tool calls to execute.
 *
 * Used as a condition in LangGraph to decide whether to continue the tool loop.
 */
export function shouldContinue(state: ConversationStateType): boolean {
  const lastMessage = state.messages[state.messages.length - 1];

  if (lastMessage instanceof AIMessage && lastMessage.tool_calls) {
    return lastMessage.tool_calls.length > 0;
  }

  const msg = lastMessage as { tool_calls?: unknown[] };
  if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
    return msg.tool_calls.length > 0;
  }

  return false;
}

/**
 * Invokes the LLM with the agent's system prompt and conversation history.
 *
 * @returns Partial state containing the LLM response message.
 */
export async function callLlm(
  agent: Agent,
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  const messages: BaseMessage[] = [
    new SystemMessage(agent.systemPrompt),
    ...state.messages,
  ];
  const response = await agent.llmWithTools.invoke(messages);
  return { messages: [response] };
}

/**
 * Executes all tool calls from the last AI message.
 *
 * Looks up each tool by name and invokes it with the provided arguments.
 *
 * @returns Partial state containing ToolMessage results.
 * @throws If a requested tool is not found in the agent's tool dictionary.
 */
export async function executeTools(
  agent: Agent,
  state: ConversationStateType
): Promise<Partial<ConversationStateType>> {
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = (lastMessage as AIMessage).tool_calls;

  if (!toolCalls || toolCalls.length === 0) {
    return { messages: [] };
  }

  const results: ToolMessage[] = [];

  for (const toolCall of toolCalls) {
    const tool = agent.toolsDict.get(toolCall.name);
    if (!tool) {
      throw new Error(`Tool ${toolCall.name} not found.`);
    }

    const result = await tool.invoke(toolCall.args);
    results.push(
      new ToolMessage({
        tool_call_id: toolCall.id || "",
        name: toolCall.name,
        content: String(result),
      })
    );
  }

  return { messages: results };
}

/**
 * Wraps the common agent pattern: nullable agent + shouldContinue/callLlm/executeTools wrappers.
 *
 * Eliminates the duplicated boilerplate across ragAgent.ts and bookingAgent.ts.
 */
export class AgentNode {
  private agent: Agent | null = null;
  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  initialize(config: AgentConfig): void {
    this.agent = createAgent(config);
  }

  private getAgent(): Agent {
    if (!this.agent) {
      throw new Error(`${this.name} not initialized.`);
    }
    return this.agent;
  }

  shouldContinue = (state: ConversationStateType): boolean => {
    return shouldContinue(state);
  };

  callLlm = async (
    state: ConversationStateType
  ): Promise<Partial<ConversationStateType>> => {
    return callLlm(this.getAgent(), state);
  };

  executeTools = async (
    state: ConversationStateType
  ): Promise<Partial<ConversationStateType>> => {
    return executeTools(this.getAgent(), state);
  };
}

/**
 * Extracts the text content from the last message in a result.
 */
export function getResponseContent(messages: BaseMessage[]): string {
  const lastMessage = messages[messages.length - 1];
  return typeof lastMessage.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
}
