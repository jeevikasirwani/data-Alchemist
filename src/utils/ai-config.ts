import { InferenceClient } from '@huggingface/inference';

// Configuration
export const AI_CONFIG = {
    MODEL_NAME: process.env.HUGGING_FACE_MODEL || 'sentence-transformers/all-MiniLM-L6-v2',
    API_KEY: process.env.HUGGING_FACE_API_KEY,
    BATCH_SIZE: 5, // Process up to 5 similarity calculations in one API call
    CACHE_SIZE: 1000 // Maximum number of cached similarities
};

// Initialize Hugging Face client
export const hf = new InferenceClient(AI_CONFIG.API_KEY);

// Global cache for similarity calculations
const similarityCache = new Map<string, number>();
const cacheOrderQueue: string[] = [];

// Type for similarity response
export interface SimilarityResponse {
    score: number;
    label1: string;
    label2: string;
}

// Cache management
function addToCache(key: string, value: number) {
    if (similarityCache.size >= AI_CONFIG.CACHE_SIZE) {
        // Remove oldest entries
        const oldestKey = cacheOrderQueue.shift();
        if (oldestKey) {
            similarityCache.delete(oldestKey);
        }
    }
    similarityCache.set(key, value);
    cacheOrderQueue.push(key);
}

function getCacheKey(text1: string, text2: string): string {
    // Ensure consistent ordering for cache keys
    return text1 <= text2 ? `${text1}||${text2}` : `${text2}||${text1}`;
}

// Utility function to calculate similarity between two texts
export async function calculateSimilarity(text1: string, text2: string): Promise<number> {
    const cacheKey = getCacheKey(text1.toLowerCase(), text2.toLowerCase());
    
    // Check cache first
    if (similarityCache.has(cacheKey)) {
        return similarityCache.get(cacheKey)!;
    }
    
    try {
        const response = await hf.featureExtraction({
            model: AI_CONFIG.MODEL_NAME,
            inputs: [text1, text2]
        });
        
        // Calculate cosine similarity between the two embeddings
        if (!Array.isArray(response) || !Array.isArray(response[0]) || !Array.isArray(response[1])) {
            throw new Error('Unexpected response format from feature extraction');
        }
        
        const embedding1 = response[0] as number[];
        const embedding2 = response[1] as number[];
        
        const dotProduct = embedding1.reduce((acc: number, val: number, i: number) => acc + val * embedding2[i], 0);
        const norm1 = Math.sqrt(embedding1.reduce((acc: number, val: number) => acc + val * val, 0));
        const norm2 = Math.sqrt(embedding2.reduce((acc: number, val: number) => acc + val * val, 0));
        
        const similarity = dotProduct / (norm1 * norm2);
        
        // Cache the result
        addToCache(cacheKey, similarity);
        
        return similarity;
    } catch (error) {
        console.error('Error calculating similarity:', error);
        return 0;
    }
}

// Batch similarity calculation for better performance
export async function calculateBatchSimilarity(pairs: Array<{text1: string, text2: string}>): Promise<number[]> {
    const results: number[] = [];
    const uncachedPairs: Array<{text1: string, text2: string, index: number}> = [];
    
    // Check cache for each pair
    pairs.forEach((pair, index) => {
        const cacheKey = getCacheKey(pair.text1.toLowerCase(), pair.text2.toLowerCase());
        if (similarityCache.has(cacheKey)) {
            results[index] = similarityCache.get(cacheKey)!;
        } else {
            uncachedPairs.push({...pair, index});
        }
    });
    
    // Process uncached pairs in batches
    for (let i = 0; i < uncachedPairs.length; i += AI_CONFIG.BATCH_SIZE) {
        const batch = uncachedPairs.slice(i, i + AI_CONFIG.BATCH_SIZE);
        
        const batchPromises = batch.map(async (pair) => {
            const similarity = await calculateSimilarity(pair.text1, pair.text2);
            return { similarity, index: pair.index };
        });
        
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({similarity, index}) => {
            results[index] = similarity;
        });
    }
    
    return results;
}

// Clear cache if needed
export function clearSimilarityCache() {
    similarityCache.clear();
    cacheOrderQueue.length = 0;
}

// Get cache statistics
export function getCacheStats() {
    return {
        size: similarityCache.size,
        maxSize: AI_CONFIG.CACHE_SIZE,
        hitRate: cacheOrderQueue.length > 0 ? similarityCache.size / cacheOrderQueue.length : 0
    };
} 