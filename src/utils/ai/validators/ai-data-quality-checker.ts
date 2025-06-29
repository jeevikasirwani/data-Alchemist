/**
 * AI Data Quality Checker - Detects general data quality issues
 */

import { ValidationError } from '../../validation';
import { generateChatCompletion, ChatMessage, parseAIJsonResponse } from '../ai-chat-completion';

export interface DataQualityIssue {
    row: number;
    column: string;
    issue: string;
    severity: 'error' | 'warning';
}

export class AIDataQualityChecker {
    
    /**
     * Analyze data quality using AI
     */
    async checkDataQuality(
        data: any[], 
        entityType: 'client' | 'worker' | 'task'
    ): Promise<ValidationError[]> {
        const errors: ValidationError[] = [];
        
        if (data.length === 0) return errors;
        
        // Take a sample of data for AI analysis (to avoid token limits)
        const sampleSize = Math.min(5, data.length);
        const sample = data.slice(0, sampleSize);
        
        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `You are a data quality expert analyzing ${entityType} records. Look for anomalies, inconsistencies, typos, and potential errors. Return your findings as a JSON array of objects with: {"row": number, "column": string, "issue": string, "severity": "error"|"warning"}. If no issues found, return empty array [].`
            },
            {
                role: 'user',
                content: `Analyze these ${entityType} records for data quality issues:\n\n${JSON.stringify(sample, null, 2)}\n\nFocus on: duplicate values, missing required fields, formatting inconsistencies, suspicious outliers, and typos.`
            }
        ];

        try {
            const response = await generateChatCompletion(messages);
            const content = response.choices[0].message.content;
            
            // Check if it's a fallback response
            if (content.includes('"fallback": true') || content.includes('AI system unavailable')) {
                console.warn('AI data quality check unavailable, using traditional validation only');
                return [];
            }
            
            // Parse AI response
            const aiFindings = parseAIJsonResponse<DataQualityIssue[]>(content, []);
            
            for (const finding of aiFindings) {
                if (finding.row < data.length) {
                    errors.push({
                        row: finding.row,
                        column: finding.column,
                        message: `AI detected: ${finding.issue}`,
                        type: finding.severity as 'error' | 'warning',
                        entityType: entityType,
                        severity: finding.severity === 'error' ? 4 : 2,
                        aiGenerated: true,
                        confidence: 0.7
                    });
                }
            }
        } catch (error) {
            console.error('Error in AI data quality validation:', error);
        }

        return errors;
    }
} 