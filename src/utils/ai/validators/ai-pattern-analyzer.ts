/**
 * AI Pattern Analyzer - Detects pattern anomalies and inconsistencies
 */

import { ValidationError } from '../../validation';
import { generateChatCompletion, ChatMessage, parseAIJsonResponse } from '../ai-chat-completion';

export interface PatternIssue {
    field: string;
    issue: string;
    examples: string[];
}

export class AIPatternAnalyzer {
    
    /**
     * Analyze data patterns using AI
     */
    async analyzePatterns(
        data: any[], 
        entityType: 'client' | 'worker' | 'task'
    ): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];
        
        if (data.length < 2) return errors;

        // Extract field samples
        const fieldSamples = this.extractFieldSamples(data);
        
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are analyzing data patterns for ${entityType} records. Look for inconsistent naming conventions, ID patterns, formatting issues, and values that don't match the expected pattern. Return findings as JSON array: [{"field": string, "issue": string, "examples": string[]}]. Return empty array [] if no issues.`
            },
            {
                role: 'user',
                content: `Analyze these field patterns for inconsistencies:\n\n${JSON.stringify(fieldSamples, null, 2)}\n\nLook for: inconsistent ID formats, naming convention violations, format mismatches within the same field.`
            }
        ];

        try {
            const response = await generateChatCompletion(messages);
            const content = response.choices[0].message.content;
            
            // Check if it's a fallback response
            if (content.includes('"fallback": true') || content.includes('AI system unavailable')) {
                console.warn('AI pattern analysis unavailable, using simple pattern matching');
                return this.fallbackPatternAnalysis(data, entityType);
            }
            
            const patternIssues = parseAIJsonResponse<PatternIssue[]>(content, []);
            
            for (const issue of patternIssues) {
                // Find specific rows with this pattern issue
                const affectedRows = this.findRowsWithPattern(data, issue);
                
                for (const rowIndex of affectedRows) {
                    errors.push({
                        row: rowIndex,
                        column: issue.field,
                        message: `Pattern issue: ${issue.issue}`,
                        type: 'warning',
                        entityType: entityType,
                        severity: 2,
                        aiGenerated: true,
                        confidence: 0.6
                    });
                }
            }
        } catch (error) {
            console.error('Error in AI pattern validation:', error);
        }

        return errors;
    }

    private extractFieldSamples(data: any[]): Record<string, any[]> {
        const samples: Record<string, any[]> = {};
        const fields = Object.keys(data[0] || {});
        
        for (const field of fields) {
            samples[field] = data.slice(0, 5).map(item => item[field]).filter(val => val != null);
        }
        
        return samples;
    }

    private findRowsWithPattern(data: any[], issue: PatternIssue): number[] {
        const rows: number[] = [];
        
        for (let i = 0; i < data.length; i++) {
            const value = String(data[i][issue.field] || '');
            if (issue.examples.some(example => value.includes(example))) {
                rows.push(i);
            }
        }
        
        return rows;
    }

    /**
     * Fallback pattern analysis when AI is unavailable
     */
    private fallbackPatternAnalysis(data: any[], entityType: string): ValidationError[] {
        const errors: ValidationError[] = [];
        
        if (data.length === 0) return errors;
        
        try {
            const headers = Object.keys(data[0]);
            
            // Simple pattern checks
            headers.forEach(header => {
                const values = data.map(row => row[header]).filter(v => v != null);
                
                if (values.length === 0) return;
                
                // Check for high number of missing values
                const missingCount = data.length - values.length;
                if (missingCount > data.length * 0.5) {
                    errors.push({
                        row: 0, // General issue
                        column: header,
                        message: `${header} has high missing rate: ${((missingCount/data.length)*100).toFixed(1)}%`,
                        type: 'warning',
                        entityType: entityType as any,
                        severity: 2,
                        aiGenerated: false,
                        confidence: 0.9
                    });
                }
                
                // Check for duplicate values in ID fields
                if (header.toLowerCase().includes('id')) {
                    const uniqueValues = new Set(values);
                    if (uniqueValues.size !== values.length) {
                        errors.push({
                            row: 0, // General issue
                            column: header,
                            message: `${header} contains duplicate values`,
                            type: 'error',
                            entityType: entityType as any,
                            severity: 3,
                            aiGenerated: false,
                            confidence: 0.8
                        });
                    }
                }
            });
        } catch (error) {
            console.warn('Fallback pattern analysis failed:', error);
        }
        
        return errors;
    }
} 