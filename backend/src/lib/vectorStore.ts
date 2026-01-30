import { HNSWLib } from "@langchain/community/vectorstores/hnswlib";
import { OpenAIEmbeddings } from "@langchain/openai";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import type { Document } from "@langchain/core/documents";
import * as fs from "fs";
import * as path from "path";
import "dotenv/config";

const EMBEDDING_MODEL = "text-embedding-3-small";
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const TOP_K = 5;
const PERSIST_DIRECTORY = "./vectorstore";

/**
 * Loads a PDF and splits it into chunks for embedding.
 *
 * Uses recursive character splitting to maintain semantic coherence.
 */
export async function loadPdf(pdfPath: string): Promise<Document[]> {
  const loader = new PDFLoader(pdfPath);
  const pages = await loader.load();
  console.log(`Loaded ${pages.length} pages from PDF.`);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  return splitter.splitDocuments(pages);
}

/**
 * Creates or loads a persisted HNSWLib vector store.
 *
 * If a saved index exists on disk, loads it instead of re-embedding documents.
 * Otherwise, creates embeddings and persists the index for future use.
 */
export async function createVectorStore(documents: Document[]): Promise<HNSWLib> {
  const embeddings = new OpenAIEmbeddings({ model: EMBEDDING_MODEL });

  if (fs.existsSync(path.join(PERSIST_DIRECTORY, "hnswlib.index"))) {
    console.log("Loading vector store from disk...");
    return HNSWLib.load(PERSIST_DIRECTORY, embeddings);
  }

  console.log("Creating new vector store...");
  const vectorStore = await HNSWLib.fromDocuments(documents, embeddings);
  await vectorStore.save(PERSIST_DIRECTORY);
  console.log("Vector store saved.");

  return vectorStore;
}

/** Creates a similarity-based retriever that returns the top K matching documents. */
export function getRetriever(vectorStore: HNSWLib) {
  return vectorStore.asRetriever({ k: TOP_K });
}
