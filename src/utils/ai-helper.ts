
let generativePipeline: any = null;

async function initAI() {
    if (generativePipeline) return generativePipeline;
    
    try {
        const { pipeline } = await import('@xenova/transformers');
        generativePipeline = await pipeline('text2text-generation', 'Xenova/LaMini-Flan-T5-248M');
        return generativePipeline;
    } catch (error) {
        console.warn('AI model not available:', error);
        return null;
    }
}


export async function generateWithAI(prompt: string): Promise<string> {
    try {
        const pipeline = await initAI();
        if (!pipeline) {
            return generateFallback(prompt);
        }
        
        const result = await pipeline(prompt, {
            max_length: 200,
            temperature: 0.7
        });
        
        return result[0]?.generated_text || generateFallback(prompt);
    } catch (error) {
        console.warn('AI generation failed, using fallback:', error);
        return generateFallback(prompt);
    }
}


export function parseAIResponse(response: string): any {
    try {
        // Try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // Try to extract array from response
        const arrayMatch = response.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
            return JSON.parse(arrayMatch[0]);
        }
        
        return { text: response.trim() };
    } catch (error) {
        console.warn('Failed to parse AI response:', error);
        return { text: response.trim() };
    }
}

export async function generateRuleRecommendations(data: any[]): Promise<string[]> {
    if (!data || data.length === 0) return [];
    
    const sampleData = data.slice(0, 3);
    const prompt = `Analyze this data and suggest 3 business rules for validation:
Data: ${JSON.stringify(sampleData, null, 2)}

Suggest rules in this format:
1. Rule name: Description
2. Rule name: Description
3. Rule name: Description`;

    try {
        const response = await generateWithAI(prompt);
        return response.split('\n')
            .filter(line => line.match(/^\d+\./))
            .map(line => line.replace(/^\d+\.\s*/, ''))
            .slice(0, 3);
    } catch (error) {
        return [
            'Required field validation for all ID columns',
            'Unique constraint on primary key fields',
            'Range validation for numeric fields'
        ];
    }
}


export async function naturalLanguageToRule(naturalText: string): Promise<any> {
    const prompt = `Convert this natural language rule to a structured rule definition:
"${naturalText}"

Return JSON in this format:
{
  "name": "Rule Name",
  "description": "Rule description",
  "field": "field_name",
  "condition": "validation_condition",
  "message": "Error message"
}`;

    try {
        const response = await generateWithAI(prompt);
        const parsed = parseAIResponse(response);
        
        if (parsed.name && parsed.field) {
            return parsed;
        }
        
        // Fallback to simple parsing
        return {
            name: naturalText.split(' ').slice(0, 3).join(' '),
            description: naturalText,
            field: 'unknown',
            condition: 'custom',
            message: `Validation failed: ${naturalText}`
        };
    } catch (error) {
        return {
            name: 'Custom Rule',
            description: naturalText,
            field: 'unknown',
            condition: 'custom',
            message: `Validation failed: ${naturalText}`
        };
    }
}


function generateFallback(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    // Rule generation patterns
    if (lowerPrompt.includes('rule') && lowerPrompt.includes('suggest')) {
        return `1. Required field validation for all ID columns
2. Unique constraint on primary key fields  
3. Range validation for numeric fields`;
    }
    
    // Natural language to rule patterns
    if (lowerPrompt.includes('required') || lowerPrompt.includes('mandatory')) {
        return `{
  "name": "Required Field Validation",
  "description": "Ensure required fields are not empty",
  "field": "all",
  "condition": "not_empty",
  "message": "This field is required"
}`;
    }
    
    if (lowerPrompt.includes('unique') || lowerPrompt.includes('duplicate')) {
        return `{
  "name": "Unique Constraint",
  "description": "Ensure field values are unique",
  "field": "id",
  "condition": "unique",
  "message": "Duplicate value found"
}`;
    }
    
    // Default fallback
    return 'AI suggestion: Review and validate this data manually.';
}


export async function isAIAvailable(): Promise<boolean> {
    try {
        const pipeline = await initAI();
        return !!pipeline;
    } catch {
        return false;
    }
} 