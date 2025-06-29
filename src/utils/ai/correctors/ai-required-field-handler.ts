/**
 * AI Required Field Handler - Suggests values for missing required fields
 */

import { ValidationError } from '../../validation';
import { generateChatCompletion, ChatMessage, parseAIJsonResponse } from '../ai-chat-completion';

export interface RequiredFieldSuggestion {
    suggestion: string;
    correctedValue: any;
    confidence: number;
    action: 'auto-fix' | 'manual-review';
    explanation: string;
}

export class AIRequiredFieldHandler {
    
    /**
     * Handle missing required fields using AI
     */
    async handleRequiredFields(
        errors: ValidationError[], 
        data: any[], 
        entityType: 'client' | 'worker' | 'task'
    ): Promise<Array<{ error: ValidationError; suggestion: RequiredFieldSuggestion }>> {
        const suggestions: Array<{ error: ValidationError; suggestion: RequiredFieldSuggestion }> = [];
        
        // Take sample of errors for AI processing
        const sampleErrors = errors.slice(0, 5);
        
        for (const error of sampleErrors) {
            if (error.row >= data.length) continue;
            
            const rowData = data[error.row];
            const contextData = this.getContextData(data, error.row);
            
            const messages: ChatMessage[] = [
                {
                    role: 'system',
                    content: `You are a data completion expert. Analyze missing required fields and suggest appropriate values based on context and patterns in similar records.

Return JSON with:
{
  "suggestion": "description of the correction",
  "correctedValue": "the suggested value",
  "confidence": 0.8,
  "action": "auto-fix|manual-review",
  "explanation": "reasoning for the suggestion"
}`
                },
                {
                    role: 'user',
                    content: `Fill missing required field for ${entityType} record:

Missing Field: ${error.column}
Current Record: ${JSON.stringify(rowData, null, 2)}

Similar Records for Context:
${JSON.stringify(contextData, null, 2)}

Suggest an appropriate value for the missing field based on patterns in similar records.`
                }
            ];

                    try {
            const response = await generateChatCompletion(messages);
            const content = response.choices[0].message.content;
            
            // Check if it's a fallback response
            if (content.includes('"fallback": true') || content.includes('AI system unavailable')) {
                console.warn('AI required field completion unavailable, using simple rules');
                return [];
            }
                
                const aiSuggestion = parseAIJsonResponse<RequiredFieldSuggestion>(
                    content,
                    {
                        suggestion: 'Generate default value',
                        correctedValue: '',
                        confidence: 0.5,
                        action: 'manual-review',
                        explanation: 'Could not parse AI suggestion'
                    }
                );
                
                suggestions.push({ error, suggestion: aiSuggestion });
            } catch (error) {
                console.error('Error processing required field error:', error);
            }
        }
        
        return suggestions;
    }

    private getContextData(data: any[], excludeIndex: number): any[] {
        return data
            .filter((_, index) => index !== excludeIndex)
            .slice(0, 3); // Get up to 3 similar records for context
    }
} 