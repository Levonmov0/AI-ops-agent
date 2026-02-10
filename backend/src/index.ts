/**
 * CLI entry point for the Gym Assistant.
 *
 * Run with: npx tsx src/index.ts
 */

import * as readline from "readline";
import { HumanMessage, BaseMessage } from "@langchain/core/messages";
import { initializeRagComponents } from "./agents/ragAgent.js";
import { initializeBookingComponents } from "./agents/bookingAgent.js";
import { buildMasterGraph } from "./graph/masterGraph.js";
import { getResponseContent } from "./lib/agentUtils.js";
import "dotenv/config";

/** Runs the interactive CLI conversation loop. */
async function run(compiledGraph: ReturnType<typeof buildMasterGraph>) {
  console.log("Welcome to the Gym Assistant!");
  console.log('Type "exit" or "quit" to end the conversation.\n');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let conversationHistory: BaseMessage[] = [];

  const askQuestion = (): void => {
    rl.question("You: ", async (userInput) => {
      userInput = userInput.trim();

      if (userInput.toLowerCase() === "exit" || userInput.toLowerCase() === "quit") {
        console.log("Goodbye!");
        rl.close();
        return;
      }

      if (!userInput) {
        askQuestion();
        return;
      }

      conversationHistory.push(new HumanMessage(userInput));

      try {
        const result = await compiledGraph.invoke({ messages: conversationHistory });
        conversationHistory = result.messages as BaseMessage[];
        const content = getResponseContent(result.messages);
        console.log(`Assistant: ${content}\n`);
      } catch (error) {
        console.error(`Error: ${error}\n`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

async function main() {
  const pdfPath = process.env.RAG_PDF_PATH || "../Strength_and_Conditioning_RAG_Test_Document.pdf";

  console.log("Initializing components...\n");
  await initializeRagComponents(pdfPath);
  initializeBookingComponents();

  const masterGraph = buildMasterGraph();
  await run(masterGraph);
}

main().catch(console.error);
