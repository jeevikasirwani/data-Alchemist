/**
 * AI Chat Completion - Handles prompt-based text generation
 */

import { initGenerativePipeline } from './ai-pipeline-manager';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionResponse {
    choices: Array<{
        message: {
            role: string;
            content: string;
        }
    }>;
}

/**
 * Generate chat completion using Hugging Face model
 */
export async function generateChatCompletion(messages: ChatMessage[]): Promise<ChatCompletionResponse> {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined') {
        console.warn('AI chat completion not available on server side');
        return createFallbackResponse('Server-side execution - AI features disabled');
    }

    try {
        console.log('Initializing AI pipeline...');
        const pipeline = await initGenerativePipeline();
        
        if (!pipeline) {
            console.warn('Generative pipeline not available, using fallback');
            return createFallbackResponse('AI pipeline unavailable');
        }
        
        // Convert messages to a single prompt
        const prompt = messages.map(msg => {
            if (msg.role === 'system') {
                return `System: ${msg.content}`;
            } else if (msg.role === 'user') {
                return `User: ${msg.content}`;
            } else {
                return `Assistant: ${msg.content}`;
            }
        }).join('\n');
        
        console.log('Generating response...');
        
        // Generate response with timeout
        const result = await Promise.race([
            pipeline(prompt, {
                max_length: 512,
                temperature: 0.3,
                do_sample: true,
                num_return_sequences: 1,
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('AI generation timeout')), 15000)
            )
        ]);
        
        const generatedText = Array.isArray(result) ? result[0].generated_text : result.generated_text;
        
        return {
            choices: [{
                message: {
                    role: 'assistant',
                    content: generatedText || 'No response generated'
                }
            }]
        };
    } catch (error) {
        console.warn('AI chat completion failed, using fallback:', error instanceof Error ? error.message : 'Unknown error');
        return createFallbackResponse('AI generation failed - using pattern matching');
    }
}

/**
 * Create a fallback response when AI is unavailable
 */
function createFallbackResponse(reason: string): ChatCompletionResponse {
    return {
        choices: [{
            message: {
                role: 'assistant',
                content: `[]`  // Return empty array for JSON parsing
            }
        }]
    };
}

/**
 * Generate simple text completion (without chat format)
 */
export async function generateTextCompletion(prompt: string, maxLength: number = 256): Promise<string> {
    // Check if we're in a browser environment first
    if (typeof window === 'undefined') {
        console.warn('AI text completion not available on server side');
        return 'Text completion disabled - server-side execution';
    }

    try {
        const pipeline = await initGenerativePipeline();
        
        if (!pipeline) {
            console.warn('Generative pipeline not available for text completion');
            return 'Text generation unavailable - AI system not loaded';
        }
        
        const result = await Promise.race([
            pipeline(prompt, {
                max_length: maxLength,
                temperature: 0.3,
                do_sample: true,
                num_return_sequences: 1,
            }),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Text generation timeout')), 15000)
            )
        ]);
        
        return Array.isArray(result) ? result[0].generated_text : result.generated_text;
    } catch (error) {
        console.warn('AI text completion failed:', error instanceof Error ? error.message : 'Unknown error');
        return 'Text generation unavailable - using fallback mode';
    }
}

/**
 * Parse JSON response from AI with error handling
 */
export function parseAIJsonResponse<T>(content: string, fallback: T): T {
    try {
        const jsonMatch = content.match(/\[[\s\S]*\]|\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
    } catch (error) {
        console.warn('Failed to parse AI JSON response:', content);
    }
    return fallback;
} 


