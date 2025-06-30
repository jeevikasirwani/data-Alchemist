import { generateChatCompletion, ChatMessage } from './ai-chat-completion';
import { ValidationError } from '../validation';
import { AIRequiredFieldHandler } from './correctors/ai-required-field-handler';

export interface EnhancedCorrectionSuggestion {
    error: ValidationError;
    suggestion: string;
    confidence: number;
    action: 'auto-fix' | 'manual-review' | 'data-enrichment';
    correctedValue?: any;
    explanation?: string;
    parameters?: {
        field: string;
        oldValue: string;
        newValue: string;
        operation: 'replace' | 'remove' | 'add';
    };
}

/**
 * Enhanced AI Data Corrector using modular architecture
 * Provides intelligent data correction suggestions with AI reasoning
 */
export class AIDataCorrectorEnhanced {
    private requiredFieldHandler: AIRequiredFieldHandler;

    constructor() {
        this.requiredFieldHandler = new AIRequiredFieldHandler();
    }

    async suggestCorrections(
        data: any[],
        errors: ValidationError[],
        entityType: 'client' | 'worker' | 'task',
        allData?: { clients: any[], workers: any[], tasks: any[] }
    ): Promise<EnhancedCorrectionSuggestion[]> {
        const suggestions: EnhancedCorrectionSuggestion[] = [];

        // Group errors by type for efficient processing
        const errorGroups = this.groupErrorsByType(errors);

        // Handle required field errors using specialized handler
        if (errorGroups.required.length > 0) {
            try {
                const requiredSuggestions = await this.requiredFieldHandler.handleRequiredFields(
                    errorGroups.required, data, entityType
                );
                suggestions.push(...this.convertToEnhancedSuggestions(requiredSuggestions));
            } catch (error) {
                console.warn('Required field handler failed:', error);
            }
        }

        // Handle duplicate errors with AI reasoning
        for (const error of errorGroups.duplicates.slice(0, 5)) {
            try {
                const suggestion = await this.handleDuplicateWithAI(error, data, entityType);
                if (suggestion) suggestions.push(suggestion);
            } catch (error) {
                console.warn('AI duplicate handling failed:', error);
            }
        }

        // Handle format errors with AI suggestions
        for (const error of errorGroups.format.slice(0, 3)) {
            try {
                const suggestion = await this.handleFormatErrorWithAI(error, data, entityType);
                if (suggestion) suggestions.push(suggestion);
            } catch (error) {
                console.warn('AI format handling failed:', error);
            }
        }

        return suggestions;
    }

    private groupErrorsByType(errors: ValidationError[]) {
        return {
            required: errors.filter(e => e.message.includes('required')),
            duplicates: errors.filter(e => e.message.includes('Duplicate')),
            format: errors.filter(e =>
                e.message.includes('Invalid') ||
                e.message.includes('must be') ||
                e.message.includes('format')
            ),
            references: errors.filter(e => e.message.includes('not found')),
            other: errors.filter(e =>
                !e.message.includes('required') &&
                !e.message.includes('Duplicate') &&
                !e.message.includes('Invalid') &&
                !e.message.includes('not found')
            )
        };
    }

    private async handleDuplicateWithAI(
        error: ValidationError,
        data: any[],
        entityType: 'client' | 'worker' | 'task'
    ): Promise<EnhancedCorrectionSuggestion | null> {
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are a data correction specialist. For duplicate ID errors, suggest a unique replacement ID that follows the existing pattern.

For ${entityType} entities, IDs typically start with ${entityType.charAt(0).toUpperCase()} followed by numbers.

Return JSON: {"suggestion": "string", "newValue": "string", "confidence": 0.8, "explanation": "string"}`
            },
            {
                role: 'user',
                content: `Fix duplicate ${entityType} ID error: "${error.message}"

Current data sample: ${JSON.stringify(data.slice(0, 3), null, 2)}

Generate a unique ID that follows the pattern.`
            }
        ];

        try {
            const response = await generateChatCompletion(messages);
            const content = response.choices[0].message.content;

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;

            const result = JSON.parse(jsonMatch[0]);

            return {
                error,
                suggestion: result.suggestion || `Generate unique ${entityType} ID`,
                confidence: Math.min(result.confidence || 0.7, 0.9),
                action: 'auto-fix',
                correctedValue: result.newValue,
                explanation: result.explanation || 'AI-generated unique ID'
            };
        } catch (error) {
            console.warn('AI duplicate correction failed:', error);
            return null;
        }
    }

    private async handleFormatErrorWithAI(
        error: ValidationError,
        data: any[],
        entityType: 'client' | 'worker' | 'task'
    ): Promise<EnhancedCorrectionSuggestion | null> {
        const currentValue = data[error.row]?.[error.column];

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `Fix data format errors by analyzing the error message and current value. Suggest a corrected value that matches the expected format.

Return JSON: {"suggestion": "string", "correctedValue": "any", "confidence": 0.8, "action": "auto-fix|manual-review", "explanation": "string"}`
            },
            {
                role: 'user',
                content: `Fix format error: "${error.message}"
Current value: "${currentValue}"
Field: ${error.column}
Entity type: ${entityType}

Provide a corrected value that fixes the format issue.`
            }
        ];

        try {
            const response = await generateChatCompletion(messages);
            const content = response.choices[0].message.content;

            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return null;

            const result = JSON.parse(jsonMatch[0]);

            return {
                error,
                suggestion: result.suggestion || `Fix ${error.column} format`,
                confidence: Math.min(result.confidence || 0.6, 0.8),
                action: result.action || 'manual-review',
                correctedValue: result.correctedValue,
                explanation: result.explanation || 'AI format correction'
            };
        } catch (error) {
            console.warn('AI format correction failed:', error);
            return null;
        }
    }

    private convertToEnhancedSuggestions(basicSuggestions: Array<{ error: ValidationError; suggestion: any }>): EnhancedCorrectionSuggestion[] {
        return basicSuggestions.map(item => ({
            error: item.error,
            suggestion: item.suggestion.suggestion || 'AI suggestion',
            confidence: item.suggestion.confidence || 0.6,
            action: item.suggestion.action || 'manual-review',
            correctedValue: item.suggestion.correctedValue,
            explanation: item.suggestion.explanation || 'Enhanced with context analysis'
        }));
    }

    async applyCorrection(data: any[], suggestion: EnhancedCorrectionSuggestion): Promise<any[]> {
        const correctedData = [...data];
        const rowIndex = suggestion.error.row;

        if (rowIndex >= 0 && rowIndex < correctedData.length) {
            const row = { ...correctedData[rowIndex] };

            if (suggestion.parameters) {
                const { field, oldValue, newValue, operation } = suggestion.parameters;

                switch (operation) {
                    case 'replace':
                        if (Array.isArray(row[field])) {
                            row[field] = row[field].map((item: any) =>
                                item === oldValue ? newValue : item
                            );
                        } else {
                            row[field] = row[field]?.toString().replace(oldValue, newValue);
                        }
                        break;
                    case 'remove':
                        if (Array.isArray(row[field])) {
                            row[field] = row[field].filter((item: any) => item !== oldValue);
                        }
                        break;
                    case 'add':
                        if (Array.isArray(row[field])) {
                            row[field] = [...row[field], newValue];
                        } else {
                            row[field] = newValue;
                        }
                        break;
                }
            } else if (suggestion.correctedValue !== undefined) {
                row[suggestion.error.column] = suggestion.correctedValue;
            }

            correctedData[rowIndex] = row;
        }

        return correctedData;
    }
} 