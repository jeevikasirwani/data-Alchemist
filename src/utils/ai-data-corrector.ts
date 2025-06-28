import { ValidationError } from './validation';

export interface CorrectionSuggestion {
    error: ValidationError;
    suggestion: string;
    confidence: number;
    action: 'auto-fix' | 'manual-review' | 'data-enrichment';
    correctedValue?: any;
}

export interface DataPattern {
    field: string;
    commonValues: string[];
    patterns: RegExp[];
    ranges: { min: number; max: number };
}

export class AIDataCorrector {
    private dataPatterns: Map<string, DataPattern> = new Map();

    async suggestCorrections(
        data: any[], 
        errors: ValidationError[], 
        entityType: 'client' | 'worker' | 'task'
    ): Promise<CorrectionSuggestion[]> {
        // Analyze data patterns first
        this.analyzeDataPatterns(data, entityType);
        
        const suggestions: CorrectionSuggestion[] = [];
        
        for (const error of errors) {
            const suggestion = await this.generateCorrection(data, error, entityType);
            if (suggestion) {
                suggestions.push(suggestion);
            }
        }
        
        return suggestions;
    }

    private analyzeDataPatterns(data: any[], entityType: 'client' | 'worker' | 'task') {
        if (data.length === 0) return;

        const fields = Object.keys(data[0]);
        
        for (const field of fields) {
            const values = data.map(row => row[field]).filter(v => v !== null && v !== undefined);
            const pattern: DataPattern = {
                field,
                commonValues: this.findCommonValues(values),
                patterns: this.detectPatterns(values),
                ranges: this.calculateRanges(values)
            };
            
            this.dataPatterns.set(field, pattern);
        }
    }

    private findCommonValues(values: any[]): string[] {
        const frequency: Map<string, number> = new Map();
        
        values.forEach(value => {
            const strValue = String(value).toLowerCase();
            frequency.set(strValue, (frequency.get(strValue) || 0) + 1);
        });
        
        return Array.from(frequency.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([value]) => value);
    }

    private detectPatterns(values: any[]): RegExp[] {
        const patterns: RegExp[] = [];
        const stringValues = values.map(v => String(v));
        
        // Detect common patterns
        if (stringValues.some(v => /^\d+$/.test(v))) {
            patterns.push(/^\d+$/); // Numeric pattern
        }
        
        if (stringValues.some(v => /^[A-Za-z\s]+$/.test(v))) {
            patterns.push(/^[A-Za-z\s]+$/); // Text pattern
        }
        
        if (stringValues.some(v => /^[A-Za-z0-9\s,]+$/.test(v))) {
            patterns.push(/^[A-Za-z0-9\s,]+$/); // Alphanumeric with commas
        }
        
        return patterns;
    }

    private calculateRanges(values: any[]): { min: number; max: number } {
        const numericValues = values
            .map(v => Number(v))
            .filter(v => !isNaN(v));
        
        if (numericValues.length === 0) {
            return { min: 0, max: 0 };
        }
        
        return {
            min: Math.min(...numericValues),
            max: Math.max(...numericValues)
        };
    }

    private async generateCorrection(
        data: any[], 
        error: ValidationError, 
        entityType: 'client' | 'worker' | 'task'
    ): Promise<CorrectionSuggestion | null> {
        const pattern = this.dataPatterns.get(error.column);
        
        switch (error.message) {
            case 'ClientID is required':
            case 'WorkerID is required':
            case 'TaskID is required':
                return this.suggestIDGeneration(error, data, entityType);
                
            case 'Duplicate ClientID found':
            case 'Duplicate WorkerID found':
            case 'Duplicate TaskID found':
                return this.suggestUniqueID(error, data, entityType);
                
            case 'PriorityLevel must be between 1 and 5':
                return this.suggestPriorityCorrection(error, pattern);
                
            case 'Duration must be at least 1':
                return this.suggestDurationCorrection(error, pattern);
                
            case 'Invalid JSON format':
                return this.suggestJSONCorrection(error, data);
                
            case 'AvailableSlots must contain valid positive numbers':
                return this.suggestSlotsCorrection(error, pattern);
                
            default:
                return this.suggestGenericCorrection(error, pattern);
        }
    }

    private suggestIDGeneration(
        error: ValidationError, 
        data: any[], 
        entityType: 'client' | 'worker' | 'task'
    ): CorrectionSuggestion {
        const prefix = entityType.charAt(0).toUpperCase();
        const existingIds = data
            .map(row => row[error.column])
            .filter(id => id && id.toString().startsWith(prefix));
        
        let nextId = 1;
        while (existingIds.includes(`${prefix}${nextId}`)) {
            nextId++;
        }
        
        return {
            error,
            suggestion: `Generate missing ${error.column} as "${prefix}${nextId}"`,
            confidence: 0.9,
            action: 'auto-fix',
            correctedValue: `${prefix}${nextId}`
        };
    }

    private suggestUniqueID(
        error: ValidationError, 
        data: any[], 
        entityType: 'client' | 'worker' | 'task'
    ): CorrectionSuggestion {
        const duplicateValue = data[error.row][error.column];
        const prefix = entityType.charAt(0).toUpperCase();
        const existingIds = data
            .map(row => row[error.column])
            .filter(id => id && id.toString().startsWith(prefix));
        
        let nextId = 1;
        while (existingIds.includes(`${prefix}${nextId}`)) {
            nextId++;
        }
        
        return {
            error,
            suggestion: `Replace duplicate ${error.column} "${duplicateValue}" with "${prefix}${nextId}"`,
            confidence: 0.8,
            action: 'auto-fix',
            correctedValue: `${prefix}${nextId}`
        };
    }

    private suggestPriorityCorrection(error: ValidationError, pattern?: DataPattern): CorrectionSuggestion {
        const currentValue = Number(error.message.match(/\d+/)?.[0] || 0);
        const suggestedValue = currentValue < 1 ? 1 : currentValue > 5 ? 5 : 3;
        
        return {
            error,
            suggestion: `Correct ${error.column} to valid range (1-5). Suggested: ${suggestedValue}`,
            confidence: 0.7,
            action: 'auto-fix',
            correctedValue: suggestedValue
        };
    }

    private suggestDurationCorrection(error: ValidationError, pattern?: DataPattern): CorrectionSuggestion {
        const suggestedValue = pattern?.ranges?.min && pattern.ranges.min > 0 ? pattern.ranges.min : 1;
        
        return {
            error,
            suggestion: `Set ${error.column} to minimum valid duration: ${suggestedValue}`,
            confidence: 0.8,
            action: 'auto-fix',
            correctedValue: suggestedValue
        };
    }

    private suggestJSONCorrection(error: ValidationError, data: any[]): CorrectionSuggestion {
        const currentValue = data[error.row][error.column];
        
        // Try to fix common JSON issues
        let fixedValue = currentValue;
        if (typeof currentValue === 'string') {
            // Remove extra quotes
            fixedValue = currentValue.replace(/^"|"$/g, '');
            // Try to parse as JSON
            try {
                JSON.parse(fixedValue);
                return {
                    error,
                    suggestion: `Fix JSON format by removing extra quotes`,
                    confidence: 0.6,
                    action: 'auto-fix',
                    correctedValue: fixedValue
                };
            } catch {
                // If still invalid, suggest empty object
                return {
                    error,
                    suggestion: `Replace invalid JSON with empty object {}`,
                    confidence: 0.5,
                    action: 'auto-fix',
                    correctedValue: '{}'
                };
            }
        }
        
        return {
            error,
            suggestion: `Replace invalid JSON with empty object {}`,
            confidence: 0.5,
            action: 'auto-fix',
            correctedValue: '{}'
        };
    }

    private suggestSlotsCorrection(error: ValidationError, pattern?: DataPattern): CorrectionSuggestion {
        return {
            error,
            suggestion: `Convert ${error.column} to comma-separated positive numbers (e.g., "1,2,3,4,5")`,
            confidence: 0.6,
            action: 'manual-review'
        };
    }

    private suggestGenericCorrection(error: ValidationError, pattern?: DataPattern): CorrectionSuggestion {
        if (pattern?.commonValues && pattern.commonValues.length > 0) {
            return {
                error,
                suggestion: `Use common value: "${pattern.commonValues[0]}"`,
                confidence: 0.4,
                action: 'manual-review',
                correctedValue: pattern.commonValues[0]
            };
        }
        
        return {
            error,
            suggestion: `Review and correct ${error.column} manually`,
            confidence: 0.3,
            action: 'manual-review'
        };
    }

    async applyCorrection(
        data: any[], 
        suggestion: CorrectionSuggestion
    ): Promise<any[]> {
        if (suggestion.action === 'auto-fix' && suggestion.correctedValue !== undefined) {
            const updatedData = [...data];
            updatedData[suggestion.error.row] = {
                ...updatedData[suggestion.error.row],
                [suggestion.error.column]: suggestion.correctedValue
            };
            return updatedData;
        }
        
        return data; // Return unchanged if not auto-fixable
    }
} 