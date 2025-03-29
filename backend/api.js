import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import { Pinecone } from "@pinecone-database/pinecone";

dotenv.config({ path: "../.env" });
dotenv.config();

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

const INDEX_NAME = "dc-api-docs"; // Pinecone index name
const EMBEDDING_MODEL = "text-embedding-ada-002"; // OpenAI embedding model
const LLM_MODEL = "gpt-4-turbo"; // Best OpenAI model
const DEFAULT_QUERY = "Tell me about hybrid gallery limitation"; // Default query

// ✅ Convert query to embedding
const getEmbedding = async (text) => {
  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("❌ Error generating embedding:", error);
    return null;
  }
};

// ✅ Search Pinecone for relevant results
const queryPinecone = async (queryEmbedding) => {
  try {
    const index = pinecone.index(INDEX_NAME);
    const response = await index.query({
      topK: 5, // Fetch top 5 relevant matches
      vector: queryEmbedding,
      includeValues: false,
      includeMetadata: true,
    });

    return response.matches.map((match) => match.metadata.text);
  } catch (error) {
    console.error("❌ Error querying Pinecone:", error);
    return [];
  }
};

// ✅ Refine response using GPT-4-turbo
const refineResponse = async (query, context) => {
  try {
    const prompt = `You are an AI assistant that answers queries based on the given context.\n\nQuery: ${query}\n\nContext:\n${context.join("\n")}\n\nProvide a well-structured and concise answer.`;

    const response = await openai.chat.completions.create({
      model: LLM_MODEL,
      messages: [{ role: "system", content: prompt }],
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error("❌ Error refining response:", error);
    return "Error generating a refined response.";
  }
};

// ✅ API endpoint for querying
app.post("/ask", async (req, res) => {
  const query = req.body.query || DEFAULT_QUERY; // Use default query if not provided
  console.log(`🔍 Searching for: "${query}"`);

  const queryEmbedding = await getEmbedding(query);
  if (!queryEmbedding) {
    return res.status(500).json({ error: "Failed to generate query embedding." });
  }

  const results = await queryPinecone(queryEmbedding);
  if (results.length === 0) {
    return res.json({ message: "No relevant results found." });
  }

  const refinedAnswer = await refineResponse(query, results);
  res.json({ query, refinedAnswer });
});

// ✅ Start Express server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
