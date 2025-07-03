import { ValidationError } from './validation';

export interface SmartCorrectionSuggestion {
    error: ValidationError;
    suggestion: string;
    confidence: number;
    action: 'auto-fix' | 'manual-review' | 'data-enrichment';
    correctedValue?: any;
    reasoning: string;
    alternatives?: string[];
    businessContext?: string;
}

export class SmartAIDataCorrector {
    private apiKey: string = process.env.NEXT_PUBLIC_OPENAI_API_KEY || '';

    async suggestCorrections(
        data: any[], 
        errors: ValidationError[], 
        entityType: 'client' | 'worker' | 'task',
        allData?: { clients: any[], workers: any[], tasks: any[] }
    ): Promise<SmartCorrectionSuggestion[]> {
        const suggestions: SmartCorrectionSuggestion[] = [];
        
        // Process errors in batches for efficiency
        const errorBatches = this.batchErrors(errors, 5);
        
        for (const batch of errorBatches) {
            try {
                const batchSuggestions = await this.processErrorBatch(
                    batch, data, entityType, allData
                );
                suggestions.push(...batchSuggestions);
            } catch (error) {
                console.error('Error processing batch:', error);
                // Fallback to simple corrections for this batch
                const fallbackSuggestions = this.generateFallbackCorrections(batch, data);
                suggestions.push(...fallbackSuggestions);
            }
        }
        
        return suggestions;
    }

    private async processErrorBatch(
        errors: ValidationError[],
        data: any[],
        entityType: string,
        allData?: any
    ): Promise<SmartCorrectionSuggestion[]> {
        // Build context about the data
        const dataContext = this.buildDataContext(data, entityType, allData);
        
        // Create AI prompt
        const prompt = this.buildAIPrompt(errors, dataContext, entityType);
        
        // Call OpenAI API
        const response = await this.callOpenAI(prompt);
        
        // Parse AI response into structured suggestions
        return this.parseAIResponse(response, errors);
    }

    private buildDataContext(data: any[], entityType: string, allData?: any): string {
        const sampleData = data.slice(0, 3); // Show first 3 rows as examples
        const fieldSummary = this.analyzeFields(data);
        
        let context = `Entity Type: ${entityType}\n`;
        context += `Total Records: ${data.length}\n`;
        context += `Sample Data:\n${JSON.stringify(sampleData, null, 2)}\n`;
        context += `Field Analysis:\n${fieldSummary}\n`;
        
        if (allData) {
            context += `\nCross-Reference Data Available:\n`;
            context += `- Clients: ${allData.clients?.length || 0} records\n`;
            context += `- Workers: ${allData.workers?.length || 0} records\n`;
            context += `- Tasks: ${allData.tasks?.length || 0} records\n`;
            
            if (allData.tasks?.length > 0) {
                const taskIds = allData.tasks.map((t: any) => t.TaskID).filter(Boolean);
                context += `Available Task IDs: ${taskIds.slice(0, 10).join(', ')}${taskIds.length > 10 ? '...' : ''}\n`;
            }
        }
        
        return context;
    }

    private analyzeFields(data: any[]): string {
        if (data.length === 0) return 'No data available';
        
        const fields = Object.keys(data[0]);
        const analysis = fields.map(field => {
            const values = data.map(row => row[field]).filter(v => v != null);
            const uniqueValues = [...new Set(values)];
            const hasNumbers = values.some(v => !isNaN(Number(v)));
            const hasArrays = values.some(v => Array.isArray(v));
            
            return `${field}: ${uniqueValues.length} unique values, ${hasNumbers ? 'numeric' : 'text'}, ${hasArrays ? 'arrays' : 'scalars'}`;
        });
        
        return analysis.join('\n');
    }

    private buildAIPrompt(
        errors: ValidationError[],
        dataContext: string,
        entityType: string
    ): string {
        return `You are an expert data analyst specializing in business data correction. 

DATA CONTEXT:
${dataContext}

VALIDATION ERRORS TO CORRECT:
${errors.map((error, i) => `${i + 1}. Row ${error.row}, Column "${error.column}": ${error.message}`).join('\n')}

INSTRUCTIONS:
For each error, provide intelligent correction suggestions considering:
1. Business context and field meaning
2. Data patterns in existing records
3. Cross-entity relationships (if applicable)
4. Industry best practices for ${entityType} data

For each error, respond with this exact JSON format:
{
  "errorIndex": 0,
  "suggestion": "Clear description of the correction",
  "correctedValue": "actual value to use",
  "confidence": 0.85,
  "action": "auto-fix",
  "reasoning": "Why this correction makes business sense",
  "alternatives": ["alternative option 1", "alternative option 2"],
  "businessContext": "What this field represents in business terms"
}

IMPORTANT: 
- Provide realistic business values, not generic placeholders
- Consider field names and their business meaning
- Use patterns from existing data when possible
- For IDs, maintain consistent formatting
- For names, use professional business naming
- For missing task references, suggest removing invalid IDs or replacing with similar ones
- Confidence should reflect how certain you are (0.1-1.0)
- Action should be "auto-fix" for high confidence, "manual-review" for lower confidence

Return a JSON array with one object per error.`;
    }

    private async callOpenAI(prompt: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cost-effective model
                messages: [
                    {
                        role: 'system',
                        content: 'You are a data correction expert. Always respond with valid JSON arrays.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.3, // Lower temperature for more consistent results
                max_tokens: 2000
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const result = await response.json();
        return result.choices[0].message.content;
    }

    private parseAIResponse(
        response: string, 
        errors: ValidationError[]
    ): SmartCorrectionSuggestion[] {
        try {
            // Extract JSON from response (in case there's extra text)
            const jsonMatch = response.match(/\[[\s\S]*\]/);
            const jsonText = jsonMatch ? jsonMatch[0] : response;
            
            const aiSuggestions = JSON.parse(jsonText);
            
            return aiSuggestions.map((aiSugg: any, index: number) => {
                const errorIndex = aiSugg.errorIndex || index;
                const error = errors[errorIndex];
                
                if (!error) {
                    console.warn(`No error found for index ${errorIndex}`);
                    return null;
                }
                
                return {
                    error,
                    suggestion: aiSugg.suggestion || 'AI suggested correction',
                    confidence: Math.max(0.1, Math.min(1.0, aiSugg.confidence || 0.6)),
                    action: aiSugg.action || 'manual-review',
                    correctedValue: aiSugg.correctedValue,
                    reasoning: aiSugg.reasoning || 'AI analysis',
                    alternatives: aiSugg.alternatives || [],
                    businessContext: aiSugg.businessContext || ''
                };
            }).filter(Boolean);
            
        } catch (error) {
            console.error('Failed to parse AI response:', error);
            console.log('Raw response:', response);
            
            // Return fallback suggestions
            return this.generateFallbackCorrections(errors, []);
        }
    }

    private generateFallbackCorrections(
        errors: ValidationError[], 
        data: any[]
    ): SmartCorrectionSuggestion[] {
        return errors.map(error => ({
            error,
            suggestion: `Review and correct ${error.column} manually`,
            confidence: 0.3,
            action: 'manual-review' as const,
            reasoning: 'Fallback suggestion when AI is unavailable',
            alternatives: [],
            businessContext: `${error.column} field requires attention`
        }));
    }

    private batchErrors(errors: ValidationError[], batchSize: number): ValidationError[][] {
        const batches: ValidationError[][] = [];
        for (let i = 0; i < errors.length; i += batchSize) {
            batches.push(errors.slice(i, i + batchSize));
        }
        return batches;
    }

    async applyCorrection(
        data: any[], 
        suggestion: SmartCorrectionSuggestion
    ): Promise<any[]> {
        const correctedData = [...data];
        const rowIndex = suggestion.error.row;
        
        if (rowIndex >= 0 && rowIndex < correctedData.length && suggestion.correctedValue !== undefined) {
            const row = { ...correctedData[rowIndex] };
            
            // Handle special cases like array modifications for task references
            if (suggestion.error.column === 'RequestedTaskIDs' && Array.isArray(row[suggestion.error.column])) {
                // Special handling for task ID arrays
                if (suggestion.action === 'auto-fix' && typeof suggestion.correctedValue === 'string') {
                    // Replace or add task ID
                    const currentArray = row[suggestion.error.column] || [];
                    row[suggestion.error.column] = [...currentArray, suggestion.correctedValue];
                } else {
                    row[suggestion.error.column] = suggestion.correctedValue;
                }
            } else {
                row[suggestion.error.column] = suggestion.correctedValue;
            }
            
            correctedData[rowIndex] = row;
        }
        
        return correctedData;
    }
}

// Factory function for easy integration
export function createSmartAIDataCorrector(): SmartAIDataCorrector {
    return new SmartAIDataCorrector();
} 