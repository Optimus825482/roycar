// ─── Local Embedding Service (Model-Independent) ───
// Generates 384-dim vectors using character n-gram hashing
// No external API dependency — works with any LLM provider

import crypto from "crypto";

const VECTOR_DIM = 384;

/**
 * Tokenize Turkish/English text into normalized tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Generate character n-grams from a token
 */
function charNgrams(token: string, n: number = 3): string[] {
  const padded = `<${token}>`;
  const grams: string[] = [];
  for (let i = 0; i <= padded.length - n; i++) {
    grams.push(padded.slice(i, i + n));
  }
  return grams;
}

/**
 * Hash a string to a vector index (0 to dim-1)
 */
function hashToIndex(s: string, dim: number): number {
  const hash = crypto.createHash("md5").update(s).digest();
  return hash.readUInt32LE(0) % dim;
}

/**
 * Hash a string to +1 or -1 (for sign in hashing trick)
 */
function hashToSign(s: string): number {
  const hash = crypto
    .createHash("md5")
    .update(s + "_sign")
    .digest();
  return hash.readUInt8(0) % 2 === 0 ? 1 : -1;
}

/**
 * Generate a 384-dimensional embedding vector from text.
 * Uses feature hashing (hashing trick) with character n-grams.
 * Produces consistent vectors for similar texts.
 */
export function generateEmbedding(text: string): number[] {
  const vec = new Float64Array(VECTOR_DIM);
  const tokens = tokenize(text);

  for (const token of tokens) {
    // Word-level hash
    const wordIdx = hashToIndex(token, VECTOR_DIM);
    vec[wordIdx] += hashToSign(token);

    // Character n-gram hashes (captures subword similarity)
    for (const gram of charNgrams(token, 3)) {
      const idx = hashToIndex(gram, VECTOR_DIM);
      vec[idx] += hashToSign(gram) * 0.5;
    }
  }

  // L2 normalize
  let norm = 0;
  for (let i = 0; i < VECTOR_DIM; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < VECTOR_DIM; i++) vec[i] /= norm;
  }

  return Array.from(vec);
}

/**
 * Cosine similarity between two vectors (for in-memory comparison)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot; // Already L2-normalized, so dot product = cosine similarity
}

export const EMBEDDING_DIM = VECTOR_DIM;
