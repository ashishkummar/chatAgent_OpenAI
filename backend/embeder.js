import fs from 'fs';
import mammoth from 'mammoth';
import dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';

dotenv.config({ path: "../.env" });
dotenv.config();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ Correct Pinecone Initialization
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });

// ✅ Ensure the Pinecone index exists
const ensureIndex = async (indexName, dimension) => {
    try {
      const existingIndexes = await pinecone.listIndexes();
      
      // ✅ Fix: Ensure it correctly accesses the array of index names
      const indexNames = existingIndexes.indexes.map(idx => idx.name);
  
      if (!indexNames.includes(indexName)) {
        await pinecone.createIndex({
          name: indexName,
          dimension: dimension,
          metric: 'cosine',
          spec: { serverless: { cloud: "aws", region: "us-east-1" } },
        });
        console.log(`✅ Created Pinecone index: ${indexName}`);
      } else {
        console.log(`✅ Pinecone index '${indexName}' already exists.`);
      }
    } catch (error) {
      console.error('❌ Error ensuring Pinecone index:', error);
    }
  };
  

// ✅ Extract text from a .docx file
const extractText = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
};

// ✅ Split text into chunks
const splitText = (text, chunkSize = 800, overlap = 100) => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize - overlap) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
};

// ✅ Generate embeddings
const getEmbedding = async (text, model) => {
  try {
    const response = await openai.embeddings.create({
      model: model,
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error generating embedding:', error);
    return null;
  }
};

// ✅ Insert embeddings into Pinecone (correct format)
const insertEmbeddings = async (indexName, embeddings) => {
  try {
    const index = pinecone.index(indexName);
    await index.upsert(embeddings); // ✅ Fixed format
    console.log(`✅ Inserted ${embeddings.length} embeddings into Pinecone index: '${indexName}'`);
  } catch (error) {
    console.error('❌ Error inserting embeddings into Pinecone:', error);
  }
};

// ✅ Process document
const processDocument = async (filePath) => {
  const indexName = 'dc-api-docs';

  // ✅ Ensure Pinecone index exists BEFORE processing
  console.log(`🔍 Checking Pinecone index '${indexName}'...`);
  await ensureIndex(indexName, 1536);

  console.log('📄 Extracting text from document...');
  const text = await extractText(filePath);
  const chunks = splitText(text);

  console.log(`🧩 Splitting text into ${chunks.length} chunks...`);

  // ✅ Generate embeddings
  const embeddings = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await getEmbedding(chunk, 'text-embedding-ada-002');
    if (embedding) {
      embeddings.push({
        id: `chunk-${i}`,
        values: embedding,
        metadata: { text: chunk },
      });
    }
  }

  // ✅ Insert embeddings
  if (embeddings.length > 0) {
    console.log(`📌 Inserting ${embeddings.length} embeddings into Pinecone...`);
    await insertEmbeddings(indexName, embeddings);
  } else {
    console.log('⚠️ No embeddings generated.');
  }
};

// ✅ Run the script
processDocument('data/dc-conf-api.docx');
