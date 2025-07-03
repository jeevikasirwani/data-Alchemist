/**
 * Simplified AI Data Corrector using local transformers
 * Focuses on practical corrections that work with your UI
 */

import { ValidationError } from './validation';

export interface CorrectionSuggestion {
    error: ValidationError;
    suggestion: string;
    correctedValue: any;
    confidence: number;
    action: 'auto-fix' | 'manual-review';
    reasoning: string;
}

export class AIDataCorrectorSimplified {
    
    /**
     * Generate correction suggestions for validation errors
     */
    async suggestCorrections(
        data: any[],
        errors: ValidationError[],
        entityType: 'client' | 'worker' | 'task',
        allData?: { clients: any[], workers: any[], tasks: any[] }
    ): Promise<CorrectionSuggestion[]> {
        const suggestions: CorrectionSuggestion[] = [];

        // Group errors by type for efficient processing
        const errorGroups = this.groupErrorsByType(errors);

        // 1. Handle missing task references (like T001, T006 not found)
        if (errorGroups.missingReferences.length > 0 && allData?.tasks) {
            const refSuggestions = await this.handleMissingReferences(
                errorGroups.missingReferences, 
                data, 
                allData.tasks
            );
            suggestions.push(...refSuggestions);
        }

        // 2. Handle missing required fields (IDs, Names)
        for (const error of errorGroups.requiredFields.slice(0, 10)) {
            const suggestion = this.handleRequiredField(error, data, entityType);
            if (suggestion) suggestions.push(suggestion);
        }

        // 3. Handle duplicate IDs
        for (const error of errorGroups.duplicates.slice(0, 5)) {
            const suggestion = this.handleDuplicateID(error, data, entityType);
            if (suggestion) suggestions.push(suggestion);
        }

        // 4. Handle out-of-range values
        for (const error of errorGroups.outOfRange.slice(0, 5)) {
            const suggestion = this.handleOutOfRange(error, data);
            if (suggestion) suggestions.push(suggestion);
        }

        return suggestions;
    }

    private groupErrorsByType(errors: ValidationError[]) {
        return {
            missingReferences: errors.filter(e => 
                e.message.includes('not found') || 
                e.message.includes('Task') && e.message.includes('not found')
            ),
            requiredFields: errors.filter(e => 
                e.message.includes('required') || 
                e.message.includes('missing or empty')
            ),
            duplicates: errors.filter(e => e.message.includes('Duplicate')),
            outOfRange: errors.filter(e => 
                e.message.includes('must be between') || 
                e.message.includes('must be at least')
            ),
            other: errors.filter(e => 
                !e.message.includes('not found') &&
                !e.message.includes('required') &&
                !e.message.includes('Duplicate') &&
                !e.message.includes('must be')
            )
        };
    }

    /**
     * Handle missing task references (e.g., T001 not found)
     */
    private async handleMissingReferences(
        errors: ValidationError[],
        data: any[],
        tasks: any[]
    ): Promise<CorrectionSuggestion[]> {
        const suggestions: CorrectionSuggestion[] = [];
        const availableTaskIds = tasks.map(t => t.TaskID).filter(Boolean);

        for (const error of errors) {
            // Extract missing task ID from error message
            const taskIdMatch = error.message.match(/Task[ID]?\s*[\"']?([^\"'\s]+)[\"']?\s*not found/) ||
                              error.message.match(/[\"']([^\"']+)[\"']\s*not found/);
            
            if (!taskIdMatch) continue;

            const missingTaskId = taskIdMatch[1];
            
            // Find similar task IDs
            const similarTasks = this.findSimilarTaskIds(missingTaskId, availableTaskIds);
            
            if (similarTasks.length > 0) {
                const bestMatch = similarTasks[0];
                suggestions.push({
                    error,
                    suggestion: `Replace missing TaskID '${missingTaskId}' with '${bestMatch.taskId}'`,
                    correctedValue: this.replaceTaskIdInArray(
                        data[error.row]?.[error.column], 
                        missingTaskId, 
                        bestMatch.taskId
                    ),
                    confidence: bestMatch.similarity,
                    action: bestMatch.similarity > 0.8 ? 'auto-fix' : 'manual-review',
                    reasoning: `Found similar task ID '${bestMatch.taskId}' with ${Math.round(bestMatch.similarity * 100)}% similarity`
                });
            } else {
                // Suggest removing the invalid task ID
                suggestions.push({
                    error,
                    suggestion: `Remove invalid TaskID '${missingTaskId}'`,
                    correctedValue: this.removeTaskIdFromArray(
                        data[error.row]?.[error.column], 
                        missingTaskId
                    ),
                    confidence: 0.7,
                    action: 'manual-review',
                    reasoning: `No similar task found - recommend removing invalid reference`
                });
            }
        }

        return suggestions;
    }

    /**
     * Handle missing required fields (generate IDs, names, etc.)
     */
    private handleRequiredField(
        error: ValidationError,
        data: any[],
        entityType: 'client' | 'worker' | 'task'
    ): CorrectionSuggestion | null {
        const column = error.column;
        const row = error.row;

        // Handle ID fields
        if (column.toLowerCase().includes('id')) {
            const prefix = entityType.charAt(0).toUpperCase();
            const newId = this.generateUniqueId(data, column, prefix, row);
            
            return {
                error,
                suggestion: `Generate missing ${column} as "${newId}"`,
                correctedValue: newId,
                confidence: 0.9,
                action: 'auto-fix',
                reasoning: `Generated unique ID following ${entityType} naming pattern`
            };
        }

        // Handle name fields
        if (column.toLowerCase().includes('name')) {
            const newName = this.generateBusinessName(entityType, row);
            
            return {
                error,
                suggestion: `Generate ${column} as "${newName}"`,
                correctedValue: newName,
                confidence: 0.8,
                action: 'auto-fix',
                reasoning: `Generated professional business name for ${entityType}`
            };
        }

        return null;
    }

    /**
     * Handle duplicate IDs
     */
    private handleDuplicateID(
        error: ValidationError,
        data: any[],
        entityType: 'client' | 'worker' | 'task'
    ): CorrectionSuggestion | null {
        const column = error.column;
        const prefix = entityType.charAt(0).toUpperCase();
        const newId = this.generateUniqueId(data, column, prefix, error.row);

        return {
            error,
            suggestion: `Replace duplicate ${column} with "${newId}"`,
            correctedValue: newId,
            confidence: 0.85,
            action: 'auto-fix',
            reasoning: `Generated unique ID to resolve duplicate conflict`
        };
    }

    /**
     * Handle out-of-range values
     */
    private handleOutOfRange(
        error: ValidationError,
        data: any[]
    ): CorrectionSuggestion | null {
        const column = error.column;
        const currentValue = data[error.row]?.[column];

        // Priority level (1-5)
        if (column === 'PriorityLevel') {
            const correctedValue = Math.max(1, Math.min(5, Number(currentValue) || 3));
            return {
                error,
                suggestion: `Correct ${column} to valid range (1-5)`,
                correctedValue,
                confidence: 0.9,
                action: 'auto-fix',
                reasoning: `Adjusted value to fit valid priority range 1-5`
            };
        }

        // Duration (>=1)
        if (column === 'Duration') {
            const correctedValue = Math.max(1, Number(currentValue) || 1);
            return {
                error,
                suggestion: `Set ${column} to minimum valid duration`,
                correctedValue,
                confidence: 0.9,
                action: 'auto-fix',
                reasoning: `Duration must be at least 1 phase`
            };
        }

        return null;
    }

    /**
     * Utility functions
     */
    private findSimilarTaskIds(targetId: string, availableIds: string[]): Array<{taskId: string, similarity: number}> {
        return availableIds
            .map(id => ({
                taskId: id,
                similarity: this.calculateSimilarity(targetId, id)
            }))
            .filter(item => item.similarity > 0.6)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
    }

    private calculateSimilarity(str1: string, str2: string): number {
        // Simple similarity based on common characters and length
        const len1 = str1.length;
        const len2 = str2.length;
        const maxLen = Math.max(len1, len2);
        
        if (maxLen === 0) return 1;
        
        let matches = 0;
        for (let i = 0; i < Math.min(len1, len2); i++) {
            if (str1[i].toLowerCase() === str2[i].toLowerCase()) {
                matches++;
            }
        }
        
        return matches / maxLen;
    }

    private generateUniqueId(data: any[], column: string, prefix: string, row: number): string {
        const existingIds = new Set(data.map(item => item[column]).filter(Boolean));
        
        let counter = row + 1;
        let newId: string;
        
        do {
            newId = `${prefix}${String(counter).padStart(3, '0')}`;
            counter++;
        } while (existingIds.has(newId));
        
        return newId;
    }

    private generateBusinessName(entityType: string, row: number): string {
        const businessPrefixes = ['Global', 'Advanced', 'Premier', 'Elite', 'Central', 'United'];
        const businessSuffixes = ['Corp', 'Industries', 'Solutions', 'Systems', 'Group', 'Ltd'];
        
        const prefix = businessPrefixes[row % businessPrefixes.length];
        const suffix = businessSuffixes[row % businessSuffixes.length];
        
        return `${prefix} ${suffix}`;
    }

    private replaceTaskIdInArray(currentValue: any, oldId: string, newId: string): any {
        if (Array.isArray(currentValue)) {
            return currentValue.map(id => id === oldId ? newId : id);
        }
        if (typeof currentValue === 'string') {
            return currentValue.split(',').map(id => id.trim() === oldId ? newId : id.trim()).join(',');
        }
        return currentValue;
    }

    private removeTaskIdFromArray(currentValue: any, removeId: string): any {
        if (Array.isArray(currentValue)) {
            return currentValue.filter(id => id !== removeId);
        }
        if (typeof currentValue === 'string') {
            return currentValue.split(',')
                .map(id => id.trim())
                .filter(id => id !== removeId)
                .join(',');
        }
        return currentValue;
    }

    /**
     * Apply correction to data
     */
    async applyCorrection(data: any[], suggestion: CorrectionSuggestion): Promise<any[]> {
        const correctedData = [...data];
        const rowIndex = suggestion.error.row;
        
        if (rowIndex >= 0 && rowIndex < correctedData.length) {
            const row = { ...correctedData[rowIndex] };
            row[suggestion.error.column] = suggestion.correctedValue;
            correctedData[rowIndex] = row;
        }
        
        return correctedData;
    }
} 