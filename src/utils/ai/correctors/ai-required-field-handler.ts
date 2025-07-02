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

For ID fields ending in "ID": Generate format like C001, W001, T001 (based on entity type)
For Name fields: Generate realistic business names like "Client Alpha", "Worker Beta", "Task Gamma" 
For numeric fields: Use reasonable defaults based on field purpose
For arrays: Use empty arrays [] as defaults

NEVER suggest empty strings "" as values for name fields.

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
                
                // If AI suggests empty string for name fields, provide better fallback
                if (aiSuggestion.correctedValue === '' && error.column.toLowerCase().includes('name')) {
                    const fallbackSuggestion = this.generateFallbackForNameField(error.column, entityType, error.row);
                    suggestions.push({ error, suggestion: fallbackSuggestion });
                } else {
                    suggestions.push({ error, suggestion: aiSuggestion });
                }
            } catch (err) {
                console.error('Error processing required field error:', err);
                // Provide fallback for common fields
                const fallbackSuggestion = this.generateFallbackSuggestion(error.column, entityType, error.row);
                if (fallbackSuggestion) {
                    suggestions.push({ error, suggestion: fallbackSuggestion });
                }
            }
        }
        
        return suggestions;
    }

    private generateFallbackForNameField(column: string, entityType: string, rowIndex: number): RequiredFieldSuggestion {
        const entityPrefix = entityType.charAt(0).toUpperCase() + entityType.slice(1);
        const nameValue = `${entityPrefix} ${String.fromCharCode(65 + (rowIndex % 26))}`; // A, B, C...
        
        return {
            suggestion: `Generate ${column} using pattern`,
            correctedValue: nameValue,
            confidence: 0.7,
            action: 'manual-review' as const,
            explanation: `Generated placeholder name: ${nameValue}`
        };
    }

    private generateFallbackSuggestion(column: string, entityType: string, rowIndex: number): RequiredFieldSuggestion | null {
        const entityPrefix = entityType.charAt(0).toUpperCase();
        const paddedIndex = String(rowIndex + 1).padStart(3, '0');
        
        if (column.toLowerCase().includes('id')) {
            return {
                suggestion: `Generate ${column} using pattern`,
                correctedValue: `${entityPrefix}${paddedIndex}`,
                confidence: 0.8,
                action: 'auto-fix' as const,
                explanation: `Generated ID: ${entityPrefix}${paddedIndex}`
            };
        }
        
        if (column.toLowerCase().includes('name')) {
            return this.generateFallbackForNameField(column, entityType, rowIndex);
        }
        
        return null;
    }

    private getContextData(data: any[], excludeIndex: number): any[] {
        return data
            .filter((_, index) => index !== excludeIndex)
            .slice(0, 3); // Get up to 3 similar records for context
    }
} 