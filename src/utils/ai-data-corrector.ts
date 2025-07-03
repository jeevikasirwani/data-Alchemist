import { ValidationError } from './validation';

export interface CorrectionSuggestion {
    error: ValidationError;
    suggestion: string;
    confidence: number;
    action: 'auto-fix' | 'manual-review' | 'data-enrichment';
    correctedValue?: any;
    parameters?: {
        field: string;
        oldValue: string;
        newValue: string;
        operation: 'replace' | 'remove';
    };
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
        entityType: 'client' | 'worker' | 'task',
        allData?: { clients: any[], workers: any[], tasks: any[] }
    ): Promise<CorrectionSuggestion[]> {
        // Analyze data patterns first
        this.analyzeDataPatterns(data, entityType);
        
        const suggestions: CorrectionSuggestion[] = [];
        
        // Group errors by type for more efficient processing
        const errorsByType = this.groupErrorsByType(errors);
        
        // Handle missing task reference errors
        if (errorsByType.missingTaskRef && allData?.tasks) {
            const taskRefSuggestions = await this.handleMissingTaskReferences(
                errorsByType.missingTaskRef, 
                data, 
                allData.tasks
            );
            suggestions.push(...taskRefSuggestions);
        }
        
        // Handle other error types
        for (const error of errorsByType.duplicates) {
            const suggestion = await this.generateCorrection(data, error, entityType);
            if (suggestion) {
                suggestions.push(suggestion);
            }
        }
        
        for (const error of errorsByType.required) {
            const suggestion = await this.generateCorrection(data, error, entityType);
            if (suggestion) {
                suggestions.push(suggestion);
            }
        }
        
        for (const error of errorsByType.other) {
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
        
        // Handle generic required-column errors such as
        // "Required column \"ClientId\" is missing or empty"
        if (error.message.startsWith('Required column')) {
            // If the column looks like an ID field, propose ID generation
            const lowerCol = error.column.toLowerCase();
            if (lowerCol.endsWith('id')) {
                return this.suggestIDGeneration(error, data, entityType);
            }

            // Otherwise fall back to generic suggestion, possibly using common value
            return this.suggestGenericCorrection(error, pattern, data);
        }
        
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
                return this.suggestGenericCorrection(error, pattern, data);
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
        
        // Start with row index + 1, then find next available ID
        let nextId = error.row + 1;
        const paddedId = () => `${prefix}${String(nextId).padStart(3, '0')}`;
        while (existingIds.includes(paddedId())) {
            nextId++;
        }
        
        const generatedId = paddedId();
        return {
            error,
            suggestion: `Generate missing ${error.column} as "${generatedId}"`,
            confidence: 0.9,
            action: 'auto-fix',
            correctedValue: generatedId
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
        
        // Start with row index + 1, then find next available ID
        let nextId = error.row + 1;
        const paddedId = () => `${prefix}${String(nextId).padStart(3, '0')}`;
        while (existingIds.includes(paddedId())) {
            nextId++;
        }
        
        const generatedId = paddedId();
        return {
            error,
            suggestion: `Replace duplicate ${error.column} "${duplicateValue}" with "${generatedId}"`,
            confidence: 0.8,
            action: 'auto-fix',
            correctedValue: generatedId
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

    private suggestGenericCorrection(error: ValidationError, pattern?: DataPattern, data?: any[]): CorrectionSuggestion {
        // Handle specific field types intelligently
        const columnName = error.column.toLowerCase();
        
        // Generate proper names for name fields
        if (columnName.includes('name') && data) {
            // Try multiple strategies to find existing names
            let existingNames: string[] = [];
            
            // Strategy 1: Look in the same column
            existingNames = data
                .map((row: any) => row[error.column])
                .filter((name: any) => name && typeof name === 'string' && name.trim() && name !== 'INVALID' && name !== '')
                .map((name: any) => String(name).trim());
            
            // Strategy 2: If no names found, look for any name-like fields in the data
            if (existingNames.length === 0) {
                const nameFields = ['ClientName', 'clientName', 'name', 'Name'];
                for (const field of nameFields) {
                    const names = data
                        .map((row: any) => row[field])
                        .filter((name: any) => name && typeof name === 'string' && name.trim() && name !== 'INVALID' && name !== '')
                        .map((name: any) => String(name).trim());
                    if (names.length > 0) {
                        existingNames = names;
                        break;
                    }
                }
            }
            
            // Strategy 3: Look in all string fields that might be names
            if (existingNames.length === 0 && data.length > 0) {
                const firstRow = data[0];
                for (const [key, value] of Object.entries(firstRow)) {
                    if (typeof value === 'string' && value.trim() && 
                        (value.includes('Corp') || value.includes('Industries') || value.includes('Ltd') || value.includes('Inc') || 
                         value.includes('Company') || value.includes('Solutions') || value.includes('Group'))) {
                        // Found a field with company-like names
                        existingNames = data
                            .map((row: any) => row[key])
                            .filter((name: any) => name && typeof name === 'string' && name.trim())
                            .map((name: any) => String(name).trim());
                        break;
                    }
                }
            }
            
            console.log('🔍 Debug: Found', existingNames.length, 'existing names:', existingNames.slice(0, 3));
            
            if (existingNames.length > 0) {
                // Extract pattern from existing names
                const namePattern = this.extractNamePattern(existingNames);
                const suggestedName = this.generateSimilarName(namePattern, error.row, existingNames);
                
                return {
                    error,
                    suggestion: `Generate ${error.column} based on existing pattern: "${suggestedName}"`,
                    confidence: 0.9,
                    action: 'auto-fix',
                    correctedValue: suggestedName
                };
            } else {
                // Use realistic business names instead of generic "Client A"
                const businessNames = [
                    'Advanced Solutions', 'Global Enterprises', 'Premium Industries', 'Elite Corp',
                    'Central Systems', 'United Technologies', 'Innovative Group', 'Strategic Partners',
                    'Professional Services', 'Dynamic Solutions', 'Excellence Corp', 'Superior Industries'
                ];
                const selectedName = businessNames[error.row % businessNames.length];
                
                return {
                    error,
                    suggestion: `Generate realistic ${error.column}: "${selectedName}"`,
                    confidence: 0.7,
                    action: 'auto-fix',
                    correctedValue: selectedName
                };
            }
        }
        
        // Handle group/tag fields
        if (columnName.includes('group') || columnName.includes('tag')) {
            const defaultValue = columnName.includes('group') ? 'Enterprise' : 'General';
            return {
                error,
                suggestion: `Set ${error.column} to "${defaultValue}"`,
                confidence: 0.7,
                action: 'auto-fix',
                correctedValue: defaultValue
            };
        }
        
        // Use pattern-based suggestions for other fields
        if (pattern?.commonValues && pattern.commonValues.length > 0) {
            const bestValue = pattern.commonValues[0];
            return {
                error,
                suggestion: `Use common value: "${bestValue}"`,
                confidence: 0.4,
                action: 'manual-review',
                correctedValue: bestValue
            };
        }
        
        return {
            error,
            suggestion: `Review and correct ${error.column} manually`,
            confidence: 0.3,
            action: 'manual-review'
        };
    }

    private groupErrorsByType(errors: ValidationError[]) {
        return {
            missingTaskRef: errors.filter(e => e.message.includes('not found')), // More flexible matching
            duplicates: errors.filter(e => e.message.includes('Duplicate')),
            required: errors.filter(e => e.message.includes('required')),
            other: errors.filter(e => 
                !e.message.includes('not found') && 
                !e.message.includes('Duplicate') && 
                !e.message.includes('required')
            )
        };
    }

    private async handleMissingTaskReferences(
        errors: ValidationError[], 
        clientData: any[], 
        tasks: any[]
    ): Promise<CorrectionSuggestion[]> {
        const suggestions: CorrectionSuggestion[] = [];
        const availableTaskIds = tasks.map(t => t.TaskID).filter(Boolean);
        
        for (const error of errors) {
            const clientIndex = error.row;
            const client = clientData[clientIndex];
            if (!client) continue;
            
            // Extract the missing task ID from error message (flexible matching)
            const missingTaskMatch = error.message.match(/Task[ID]?\s*[\"']([^\"']+)[\"']\s*not found/) || 
                                    error.message.match(/TaskID\s*[\"']([^\"']+)[\"']\s*not found/) ||
                                    error.message.match(/[\"']([^\"']+)[\"']\s*not found/);
            if (!missingTaskMatch) continue;
            
            const missingTaskId = missingTaskMatch[1];
            
            // Find similar task IDs using string similarity
            const similarTasks = this.findSimilarTaskIds(missingTaskId, availableTaskIds);
            
            if (similarTasks.length > 0) {
                // Suggest replacing with most similar task
                const suggestedTaskId = similarTasks[0].taskId;
                const confidence = similarTasks[0].similarity;
                
                suggestions.push({
                    error: error,
                    suggestion: `Replace missing TaskID '${missingTaskId}' with '${suggestedTaskId}'`,
                    action: 'auto-fix',
                    confidence: confidence,
                    parameters: {
                        field: 'RequestedTaskIDs',
                        oldValue: missingTaskId,
                        newValue: suggestedTaskId,
                        operation: 'replace'
                    }
                });
            } else {
                // Suggest removing the invalid task ID
                suggestions.push({
                    error: error,
                    suggestion: `Remove invalid TaskID '${missingTaskId}' from client's requested tasks`,
                    action: 'manual-review',
                    confidence: 0.7,
                    parameters: {
                        field: 'RequestedTaskIDs',
                        oldValue: missingTaskId,
                        newValue: '',
                        operation: 'remove'
                    }
                });
            }
        }
        
        return suggestions;
    }

    private findSimilarTaskIds(targetTaskId: string, availableTaskIds: string[]): Array<{taskId: string, similarity: number}> {
        const similarities = availableTaskIds.map(taskId => ({
            taskId,
            similarity: this.calculateStringSimilarity(targetTaskId, taskId)
        }));
        
        return similarities
            .filter(item => item.similarity > 0.6) // Only suggest if reasonably similar
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3); // Top 3 suggestions
    }

    private calculateStringSimilarity(str1: string, str2: string): number {
        // Simple Levenshtein distance-based similarity
        const matrix: number[][] = [];
        const len1 = str1.length;
        const len2 = str2.length;
        
        for (let i = 0; i <= len1; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= len2; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= len1; i++) {
            for (let j = 1; j <= len2; j++) {
                const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + cost
                );
            }
        }
        
        const maxLen = Math.max(len1, len2);
        return (maxLen - matrix[len1][len2]) / maxLen;
    }

    async applyCorrection(data: any[], suggestion: CorrectionSuggestion): Promise<any[]> {
        const correctedData = [...data];
        const rowIndex = suggestion.error.row;
        
        console.log('Applying correction:', suggestion);
        
        if (rowIndex >= 0 && rowIndex < correctedData.length) {
            const row = { ...correctedData[rowIndex] };
            
            // Handle different types of corrections
            if (suggestion.parameters) {
                const { field, oldValue, newValue, operation } = suggestion.parameters;
                
                if (operation === 'replace') {
                    // Replace task ID in the RequestedTaskIDs array
                    if (Array.isArray(row[field])) {
                        row[field] = row[field].map((taskId: string) => 
                            taskId === oldValue ? newValue : taskId
                        );
                    } else if (typeof row[field] === 'string') {
                        row[field] = row[field].replace(oldValue, newValue);
                    }
                } else if (operation === 'remove') {
                    // Remove task ID from the RequestedTaskIDs array
                    if (Array.isArray(row[field])) {
                        row[field] = row[field].filter((taskId: string) => taskId !== oldValue);
                    }
                }
            } else if (suggestion.correctedValue !== undefined) {
                // Handle legacy corrections
                row[suggestion.error.column] = suggestion.correctedValue;
            }
            
            correctedData[rowIndex] = row;
        }
        
        return correctedData;
    }

    private extractNamePattern(existingNames: string[]): { prefixes: string[], suffixes: string[], patterns: string[] } {
        const prefixes = new Set<string>();
        const suffixes = new Set<string>();
        const patterns = new Set<string>();
        
        existingNames.forEach(name => {
            // Extract common patterns
            const words = name.split(/\s+/);
            if (words.length > 1) {
                patterns.add('multi-word');
                prefixes.add(words[0]);
                suffixes.add(words[words.length - 1]);
            } else {
                patterns.add('single-word');
            }
        });
        
        return {
            prefixes: Array.from(prefixes),
            suffixes: Array.from(suffixes),
            patterns: Array.from(patterns)
        };
    }

    private generateSimilarName(namePattern: any, rowIndex: number, existingNames: string[]): string {
        // Try to generate a name that follows the existing pattern
        const { prefixes, suffixes, patterns } = namePattern;
        
        if (patterns.includes('multi-word') && prefixes.length > 0) {
            // Generate based on multi-word pattern
            const commonPrefixes = ['Global', 'National', 'International', 'Central', 'United', 'Advanced', 'Premium', 'Elite'];
            const commonSuffixes = ['Corp', 'Industries', 'Solutions', 'Systems', 'Group', 'Ltd', 'Inc', 'Company'];
            
            // Use existing prefixes/suffixes if available, otherwise use common ones
            const availablePrefixes = prefixes.length > 0 ? prefixes : commonPrefixes;
            const availableSuffixes = suffixes.length > 0 ? suffixes : commonSuffixes;
            
            const prefix = availablePrefixes[rowIndex % availablePrefixes.length];
            const suffix = availableSuffixes[rowIndex % availableSuffixes.length];
            
            const generatedName = `${prefix} ${suffix}`;
            
            // Ensure uniqueness
            if (!existingNames.includes(generatedName)) {
                return generatedName;
            }
        }
        
        // Fallback to simple numbered naming
        const baseNames = ['Alpha Corp', 'Beta Industries', 'Gamma Solutions', 'Delta Systems', 'Epsilon Group'];
        return baseNames[rowIndex % baseNames.length];
    }
}