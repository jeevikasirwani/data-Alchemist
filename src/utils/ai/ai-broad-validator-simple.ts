/**
 * AI Broad Validator - Simplified version using composable components
 */

import { ValidationError } from '../validation';
import { AIDataQualityChecker } from './validators/ai-data-quality-checker';
import { AIPatternAnalyzer } from './validators/ai-pattern-analyzer';

export interface AIValidationResult {
    errors: ValidationError[];
    suggestions: string[];
    confidence: number;
}

export class AIBroadValidatorSimple {
    private dataQualityChecker = new AIDataQualityChecker();
    private patternAnalyzer = new AIPatternAnalyzer();

    /**
     * Main entry point for AI-driven validation
     */
    async validateData(
        data: any[], 
        entityType: 'client' | 'worker' | 'task',
        allData?: { clients: any[], workers: any[], tasks: any[] }
    ): Promise<AIValidationResult> {
        const errors: ValidationError[] = [];
        const suggestions: string[] = [];
        let aiAvailable = true;
        
        // 1. Data quality validation (with fallback)
        try {
            console.log(`🤖 Running AI data quality check for ${entityType}...`);
            const qualityErrors = await this.dataQualityChecker.checkDataQuality(data, entityType);
            errors.push(...qualityErrors);
            console.log(`✅ AI data quality check completed: ${qualityErrors.length} issues found`);
        } catch (error) {
            console.warn('AI data quality check failed:', error instanceof Error ? error.message : 'Unknown error');
            aiAvailable = false;
            suggestions.push('AI data quality analysis unavailable - using traditional validation only');
        }
        
        // 2. Pattern analysis (with fallback)
        try {
            console.log(`🤖 Running AI pattern analysis for ${entityType}...`);
            const patternErrors = await this.patternAnalyzer.analyzePatterns(data, entityType);
            errors.push(...patternErrors);
            console.log(`✅ AI pattern analysis completed: ${patternErrors.length} issues found`);
        } catch (error) {
            console.warn('AI pattern analysis failed:', error instanceof Error ? error.message : 'Unknown error');
            aiAvailable = false;
            suggestions.push('AI pattern analysis unavailable - basic validation still working');
        }
        
        // 3. Add suggestions based on findings
        if (errors.length > 0) {
            suggestions.push(`Found ${errors.length} ${aiAvailable ? 'AI-detected' : 'basic'} issues in ${entityType} data`);
            suggestions.push('Review highlighted cells for potential improvements');
        } else {
            suggestions.push(`${entityType} data looks good from ${aiAvailable ? 'AI' : 'basic'} validation perspective`);
        }
        
        if (!aiAvailable) {
            suggestions.push('💡 AI features currently unavailable - app continues to work with traditional validation');
        }

        return {
            errors,
            suggestions,
            confidence: this.calculateOverallConfidence(errors)
        };
    }

    private calculateOverallConfidence(errors: ValidationError[]): number {
        if (errors.length === 0) return 1.0;
        
        const aiErrors = errors.filter(e => e.aiGenerated);
        if (aiErrors.length === 0) return 0.5;
        
        const totalConfidence = aiErrors.reduce((sum, error) => sum + (error.confidence || 0.5), 0);
        return totalConfidence / aiErrors.length;
    }
} 