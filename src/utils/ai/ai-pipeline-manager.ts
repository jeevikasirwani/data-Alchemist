// /**
//  * AI Pipeline Manager - Handles model loading and caching
//  */

// let embeddingPipeline: any = null;
// let generativePipeline: any = null;

// export interface ModelConfig {
//     embeddingModel: string;
//     generativeModel: string;
//     isAvailable: boolean;
// }

// export function getModelConfig(): ModelConfig {
//     return {
//         embeddingModel: 'Xenova/all-MiniLM-L6-v2',
//         generativeModel: 'Xenova/LaMini-Flan-T5-248M',
//         isAvailable: typeof window !== 'undefined'
//     };
// }

// /**
//  * Initialize embedding pipeline for similarity calculations
//  */
// export async function initEmbeddingPipeline(): Promise<any> {
//     if (embeddingPipeline) return embeddingPipeline;
    
//     if (typeof window === 'undefined') {
//         throw new Error('Embedding pipeline not available on server side');
//     }

//     try {
//         console.log('Loading embedding model...');
//         const { pipeline, env } = await import('@xenova/transformers');
        
//         // Configure for web environment only
//         if (typeof window !== 'undefined') {
//             env.backends.onnx.wasm.simd = true;
//             env.backends.onnx.wasm.proxy = false;
//             // Disable Node.js backend explicitly
//             env.backends.onnx.node = false;
//         }
        
//         const config = getModelConfig();
        
//         embeddingPipeline = await pipeline('feature-extraction', config.embeddingModel);
//         console.log('Embedding pipeline ready');
//         return embeddingPipeline;
//     } catch (error) {
//         console.error('Failed to initialize embedding pipeline:', error);
//         throw error;
//     }
// }

// /**
//  * Initialize generative pipeline for text generation
//  */
// export async function initGenerativePipeline(): Promise<any> {
//     if (generativePipeline) return generativePipeline;
    
//     if (typeof window === 'undefined') {
//         console.warn('Generative pipeline not available on server side');
//         return null;
//     }

//     try {
//         console.log('Loading generative model...');
//         const { pipeline, env } = await import('@xenova/transformers');
        
//         // Configure for web environment only
//         if (typeof window !== 'undefined') {
//             env.backends.onnx.wasm.simd = true;
//             env.backends.onnx.wasm.proxy = false;
//             // Disable Node.js backend explicitly
//             env.backends.onnx.node = false;
//         }
        
//         const config = getModelConfig();
        
//         // Add timeout protection
//         const timeoutPromise = new Promise((_, reject) => {
//             setTimeout(() => reject(new Error('Model loading timeout')), 30000); // 30 second timeout
//         });
        
//         const pipelinePromise = pipeline('text2text-generation', config.generativeModel);
        
//         generativePipeline = await Promise.race([pipelinePromise, timeoutPromise]);
//         console.log('✅ Generative pipeline ready');
//         return generativePipeline;
//     } catch (error) {
//         console.warn('Failed to initialize generative pipeline, AI features will be limited:', error);
//         // Return null instead of throwing to allow app to continue
//         generativePipeline = null;
//         return null;
//     }
// }

// /**
//  * Check if AI is available in current environment
//  */
// export function isAIAvailable(): boolean {
//     return typeof window !== 'undefined';
// }

// /**
//  * Get pipeline status
//  */
// export function getPipelineStatus() {
//     return {
//         embedding: !!embeddingPipeline,
//         generative: !!generativePipeline,
//         isClient: typeof window !== 'undefined'
//     };
// } 


/**
 * AI Pipeline Manager - Handles model loading and caching
 */

let embeddingPipeline: any = null;
let generativePipeline: any = null;

export const getModelConfig = {
    embedding: 'Xenova/all-MiniLM-L6-v2',
    generative: 'Xenova/LaMini-Flan-T5-248M'
};

/**
 * Initialize embedding pipeline for similarity calculations
 */
export async function initEmbeddingPipeline(): Promise<any> {
    if (embeddingPipeline) return embeddingPipeline;
    
    const { pipeline } = await import('@xenova/transformers');
    embeddingPipeline = await pipeline('feature-extraction', getModelConfig.embedding);
    return embeddingPipeline;
}

/**
 * Initialize generative pipeline for text generation
 */
export async function initGenerativePipeline(): Promise<any> {
    if (generativePipeline) return generativePipeline;
    
    try {
        const { pipeline } = await import('@xenova/transformers');
        generativePipeline = await pipeline('text2text-generation', getModelConfig.generative);
        return generativePipeline;
    } catch (error) {
        console.warn('Failed to load generative model:', error);
        return null;
    }
}

/**
 * Get pipeline status
 */
export function getPipelineStatus() {
    return {
        embedding: !!embeddingPipeline,
        generative: !!generativePipeline
    };
}