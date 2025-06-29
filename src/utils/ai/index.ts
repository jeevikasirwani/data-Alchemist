/**
 * AI Module Exports - Clean and Organized
 * 
 * This index provides clean access to all AI functionality
 * using the new modular architecture.
 */

// Core AI Infrastructure
export { 
    initEmbeddingPipeline, 
    initGenerativePipeline, 
    getModelConfig, 
    isAIAvailable, 
    getPipelineStatus 
} from './ai-pipeline-manager';
export { generateChatCompletion, generateTextCompletion } from './ai-chat-completion';
export type { ChatMessage, ChatCompletionResponse } from './ai-chat-completion';

// AI Validators
export { AIDataQualityChecker } from './validators/ai-data-quality-checker';
export { AIPatternAnalyzer } from './validators/ai-pattern-analyzer';
export type { DataQualityIssue } from './validators/ai-data-quality-checker';
export type { PatternIssue } from './validators/ai-pattern-analyzer';

// AI Correctors  
export { AIRequiredFieldHandler } from './correctors/ai-required-field-handler';
export type { RequiredFieldSuggestion } from './correctors/ai-required-field-handler';

// Main AI Services (Simplified)
export { AIBroadValidatorSimple } from './ai-broad-validator-simple';
export { AIQueryProcessorSimple } from './ai-query-processor-simple';
export { AIDataCorrectorEnhanced } from './ai-data-corrector-enhanced';

// Import classes for factory functions
import { AIBroadValidatorSimple } from './ai-broad-validator-simple';
import { AIQueryProcessorSimple } from './ai-query-processor-simple';
import { AIDataCorrectorEnhanced } from './ai-data-corrector-enhanced';
import { getPipelineStatus, isAIAvailable } from './ai-pipeline-manager';

// Enhanced Types
export type { 
    AIValidationResult
} from './ai-broad-validator-simple';

export type { 
    QueryResult, 
    QueryIntent, 
    FilterCondition 
} from './ai-query-processor-simple';

export type { 
    EnhancedCorrectionSuggestion 
} from './ai-data-corrector-enhanced';

/**
 * Convenience factory functions for easy initialization
 */

// Create AI Broad Validator with all dependencies
export function createAIBroadValidator() {
    return new AIBroadValidatorSimple();
}

// Create AI Query Processor 
export function createAIQueryProcessor() {
    return new AIQueryProcessorSimple();
}

// Create Enhanced Data Corrector
export function createAIDataCorrector() {
    return new AIDataCorrectorEnhanced();
}

/**
 * AI System Status Check
 */
export async function checkAISystemStatus() {
    try {
        const status = getPipelineStatus();
        return {
            available: isAIAvailable(),
            generative: status.generative,
            embedding: status.embedding,
            message: 'AI system ready'
        };
    } catch (error) {
        return {
            available: false,
            generative: false,
            embedding: false,
            message: `AI system unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}

// Re-export commonly used interfaces from other modules
export type { ValidationError } from '../validation'; 