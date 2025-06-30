import { SemanticMatcher, createSemanticMatcher, getSchemaForEntityType, MatchResult } from './ai-semantic-matcher';

// Add local string similarity for fast initial filtering
function localStringSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    // Exact match
    if (s1 === s2) return 1.0;

    // Contains match
    if (s1.includes(s2) || s2.includes(s1)) return 0.9;

    // Levenshtein distance similarity
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const distance = levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

function levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
        for (let i = 1; i <= str1.length; i++) {
            const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(
                matrix[j][i - 1] + 1,
                matrix[j - 1][i] + 1,
                matrix[j - 1][i - 1] + cost
            );
        }
    }

    return matrix[str2.length][str1.length];
}

export interface EntityDetection {
    entityType: 'client' | 'worker' | 'task';
    confidence: number;
    reasoning?: string;
}

export interface HeaderMapping {
    expectedHeader: string;
    confidence: number;
    transformation: 'direct' | 'normalize' | 'split' | 'merge';
    method: 'exact' | 'fuzzy' | 'semantic' | 'alias' | 'semantic_simple';
}

export interface MappingResult {
    mappings: Record<string, HeaderMapping>;
    unmappedHeaders: string[];
    confidence: number;
    suggestions: string[];
    entityType: 'client' | 'worker' | 'task';
}

/**
 * AI-powered header mapper using Hugging Face transformers
 * Detects entity types and maps headers to correct schema fields
 */
export class AIHeaderMapper {
    private semanticMatcher: SemanticMatcher | null = null;
    private isInitialized = false;
    private initializationFailed = false;
    private cache = new Map<string, any>();

    constructor() {
        // Initialization will be called lazily
    }

    /**
     * Initialize the semantic matcher with robust error handling
     */
    private async initialize(): Promise<void> {
        if (this.isInitialized || this.initializationFailed) return;

        try {
            console.log('🤖 Starting AI Header Mapper initialization...');

            // Set a very short timeout for initialization to prevent hanging
            const initPromise = this.attemptSemanticMatcherCreation();

            // Wait for initialization with a timeout
            await Promise.race([
                initPromise,
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Initialization timeout (10s)')), 10000)
                )
            ]);

            if (this.semanticMatcher) {
                console.log('✅ AI Header Mapper initialized successfully with semantic matching');
            } else {
                console.log('✅ AI Header Mapper initialized in fallback mode');
            }

            this.isInitialized = true;
        } catch (error) {
            console.warn('⚠️ AI Header Mapper initialization failed, using safe fallback mode');
            console.warn('   Error details:', error instanceof Error ? error.message : String(error));
            this.semanticMatcher = null;
            this.initializationFailed = true;
            this.isInitialized = true; // Still mark as initialized to prevent retry
        }
    }

    /**
     * Attempt to create semantic matcher with extra safety
     */
    private async attemptSemanticMatcherCreation(): Promise<void> {
        try {
            // Only attempt if we're in a browser environment
            if (!this.isClientEnvironment()) {
                console.log('⚠️ Not in browser environment, skipping semantic matcher');
                return;
            }

            // Try to create semantic matcher
            this.semanticMatcher = await createSemanticMatcher({
                modelName: 'Xenova/all-MiniLM-L6-v2',
                threshold: 0.75,
                cacheResults: true
            });

        } catch (error) {
            console.warn('Failed to create semantic matcher:', error);
            this.semanticMatcher = null;
            throw error;
        }
    }

    /**
     * Check if we're in a client environment safely
     */
    private isClientEnvironment(): boolean {
        try {
            return typeof window !== 'undefined' && typeof document !== 'undefined';
        } catch {
            return false;
        }
    }

    /**
     * Check if AI semantic matching is available
     */
    private isAIAvailable(): boolean {
        return !!this.semanticMatcher && !this.initializationFailed;
    }

    /**
     * Detect entity type from headers using AI and fallback methods
     */
    async detectEntityType(headers: string[]): Promise<EntityDetection> {
        // Always try to initialize first (but won't retry if already failed)
        await this.initialize();

        const cacheKey = `entity_${headers.join(',')}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            // First try AI-powered detection if available
            if (this.isAIAvailable()) {
                const aiDetection = await this.aiEntityDetection(headers);
                if (aiDetection.confidence > 0.7) {
                    this.cache.set(cacheKey, aiDetection);
                    return aiDetection;
                }
            }

            // Always fall back to rule-based detection
            const fallbackDetection = this.fallbackEntityDetection(headers);
            this.cache.set(cacheKey, fallbackDetection);
            return fallbackDetection;

        } catch (error) {
            console.warn('Error in entity type detection, using rule-based fallback:', error);
            return this.fallbackEntityDetection(headers);
        }
    }

    /**
     * AI-powered entity type detection (only if AI is available)
     */
    private async aiEntityDetection(headers: string[]): Promise<EntityDetection> {
        if (!this.isAIAvailable()) {
            throw new Error('AI semantic matching not available');
        }

        const confidenceScores = { client: 0, worker: 0, task: 0 };

        try {
            // Test headers against each entity type schema
            for (const entityType of ['client', 'worker', 'task'] as const) {
                const schema = getSchemaForEntityType(entityType);
                const matches = await this.semanticMatcher!.batchMatchHeaders(headers, schema);

                let totalConfidence = 0;
                let matchCount = 0;

                for (const [header, match] of matches) {
                    if (match) {
                        totalConfidence += match.confidence;
                        matchCount++;
                    }
                }

                // Calculate average confidence weighted by match percentage
                const avgConfidence = matchCount > 0 ? totalConfidence / matchCount : 0;
                const matchPercentage = matchCount / headers.length;
                confidenceScores[entityType] = avgConfidence * matchPercentage;
            }

            // Find the best match
            const bestType = Object.keys(confidenceScores).reduce((a, b) =>
                confidenceScores[a as keyof typeof confidenceScores] > confidenceScores[b as keyof typeof confidenceScores] ? a : b
            ) as 'client' | 'worker' | 'task';

            return {
                entityType: bestType,
                confidence: confidenceScores[bestType],
                reasoning: `AI matched ${Math.round(confidenceScores[bestType] * 100)}% of headers to ${bestType} schema`
            };
        } catch (error) {
            console.warn('AI entity detection failed:', error);
            throw error;
        }
    }

    /**
     * Rule-based entity type detection as fallback
     */
    private fallbackEntityDetection(headers: string[]): EntityDetection {
        const headerStr = headers.join(' ').toLowerCase();
        const scores = { client: 0, worker: 0, task: 0 };

        // Client indicators
        const clientKeywords = ['client', 'customer', 'priority', 'requested', 'group'];
        clientKeywords.forEach(keyword => {
            if (headerStr.includes(keyword)) scores.client += 0.2;
        });

        // Worker indicators
        const workerKeywords = ['worker', 'employee', 'skill', 'available', 'load', 'qualification'];
        workerKeywords.forEach(keyword => {
            if (headerStr.includes(keyword)) scores.worker += 0.2;
        });

        // Task indicators
        const taskKeywords = ['task', 'job', 'duration', 'category', 'required', 'phase', 'concurrent'];
        taskKeywords.forEach(keyword => {
            if (headerStr.includes(keyword)) scores.task += 0.2;
        });

        const bestType = Object.keys(scores).reduce((a, b) =>
            scores[a as keyof typeof scores] > scores[b as keyof typeof scores] ? a : b
        ) as 'client' | 'worker' | 'task';

        return {
            entityType: bestType,
            confidence: Math.min(scores[bestType] + 0.5, 0.9), // Add base confidence, cap at 0.9
            reasoning: `Rule-based detection found ${bestType} keywords`
        };
    }

    /**
     * Map headers to expected schema fields
     */
    async mapHeaders(headers: string[], entityType: 'client' | 'worker' | 'task'): Promise<MappingResult> {
        // Always try to initialize first (but won't retry if already failed)
        await this.initialize();

        const cacheKey = `mapping_${entityType}_${headers.join(',')}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            const schema = getSchemaForEntityType(entityType);
            const mappings: Record<string, HeaderMapping> = {};
            const unmappedHeaders: string[] = [];
            const suggestions: string[] = [];

            // Try to precompute field embeddings for better performance (if AI available)
            if (this.isAIAvailable()) {
                try {
                    await this.semanticMatcher!.precomputeFieldEmbeddings(schema);
                } catch (error) {
                    console.warn('Failed to precompute embeddings, continuing with basic matching:', error);
                }
            }

            // Process each header
            for (const header of headers) {
                let bestMatch: MatchResult | null = null;

                if (this.isAIAvailable()) {
                    try {
                        // Try semantic matching first
                        bestMatch = await this.semanticMatcher!.findBestMatch(header, schema);
                    } catch (error) {
                        console.warn(`AI matching failed for header "${header}", using fallback:`, error);
                    }
                }

                if (!bestMatch) {
                    // Fallback to simple matching
                    bestMatch = this.simpleFallbackMatch(header, schema);
                }

                if (bestMatch) {
                    mappings[header] = {
                        expectedHeader: bestMatch.fieldName,
                        confidence: bestMatch.confidence,
                        transformation: this.determineTransformation(header, bestMatch.fieldName),
                        method: bestMatch.method
                    };

                    if (bestMatch.suggestedTransformation) {
                        suggestions.push(`${header} → ${bestMatch.fieldName}: ${bestMatch.suggestedTransformation}`);
                    }
                } else {
                    unmappedHeaders.push(header);
                    suggestions.push(`Could not map "${header}" - please review manually`);
                }
            }

            // Calculate overall confidence
            const totalConfidence = Object.values(mappings).reduce(
                (sum, mapping) => sum + mapping.confidence, 0
            );
            const overallConfidence = headers.length > 0 ? totalConfidence / headers.length : 0;

            const result: MappingResult = {
                mappings,
                unmappedHeaders,
                confidence: overallConfidence,
                suggestions,
                entityType
            };

            this.cache.set(cacheKey, result);
            return result;

        } catch (error) {
            console.error('Error in header mapping:', error);
            return this.createFallbackMapping(headers, entityType);
        }
    }

    /**
     * Simple fallback matching for when semantic matching is not available
     */
    private simpleFallbackMatch(header: string, schema: any): MatchResult | null {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');

        for (const field of schema.fields) {
            // Exact match
            const normalizedField = field.fieldName.toLowerCase().replace(/[^a-z0-9]/g, '');
            if (normalizedHeader === normalizedField) {
                return {
                    fieldName: field.fieldName,
                    confidence: 1.0,
                    method: 'exact',
                    originalHeader: header
                };
            }

            // Alias match
            for (const alias of field.aliases) {
                const normalizedAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (normalizedHeader === normalizedAlias) {
                    return {
                        fieldName: field.fieldName,
                        confidence: 0.9,
                        method: 'alias',
                        originalHeader: header
                    };
                }
            }

            // Fuzzy match using local similarity
            const similarity = localStringSimilarity(header, field.fieldName);
            if (similarity > 0.7) {
                return {
                    fieldName: field.fieldName,
                    confidence: similarity,
                    method: 'fuzzy',
                    originalHeader: header
                };
            }

            // Check aliases with fuzzy matching
            for (const alias of field.aliases) {
                const aliasSimilarity = localStringSimilarity(header, alias);
                if (aliasSimilarity > 0.8) {
                    return {
                        fieldName: field.fieldName,
                        confidence: aliasSimilarity * 0.95, // Slight penalty for alias match
                        method: 'fuzzy',
                        originalHeader: header
                    };
                }
            }
        }

        return null;
    }

    /**
     * Determine the type of transformation needed
     */
    private determineTransformation(originalHeader: string, expectedHeader: string): 'direct' | 'normalize' | 'split' | 'merge' {
        const original = originalHeader.toLowerCase();
        const expected = expectedHeader.toLowerCase();

        if (original === expected) return 'direct';
        if (original.includes('_') || original.includes(' ')) return 'normalize';
        if (original.length > expected.length * 1.5) return 'split';
        if (original.length < expected.length * 0.5) return 'merge';

        return 'normalize';
    }

    /**
     * Create a fallback mapping when AI processing fails
     */
    private createFallbackMapping(headers: string[], entityType: 'client' | 'worker' | 'task'): MappingResult {
        console.log('🔄 Creating fallback mapping for', headers.length, 'headers');

        const mappings: Record<string, HeaderMapping> = {};
        const unmappedHeaders: string[] = [];

        // Try simple matching for each header
        try {
            const schema = getSchemaForEntityType(entityType);

            for (const header of headers) {
                const match = this.simpleFallbackMatch(header, schema);
                if (match) {
                    mappings[header] = {
                        expectedHeader: match.fieldName,
                        confidence: match.confidence * 0.8, // Reduce confidence for fallback
                        transformation: this.determineTransformation(header, match.fieldName),
                        method: match.method
                    };
                } else {
                    unmappedHeaders.push(header);
                }
            }
        } catch (error) {
            console.error('Even fallback mapping failed:', error);
            // If even this fails, mark all as unmapped
            headers.forEach(header => unmappedHeaders.push(header));
        }

        const totalConfidence = Object.values(mappings).reduce(
            (sum, mapping) => sum + mapping.confidence, 0
        );
        const overallConfidence = headers.length > 0 ? totalConfidence / headers.length : 0;

        return {
            mappings,
            unmappedHeaders,
            confidence: overallConfidence,
            suggestions: ['AI processing failed - using basic string matching'],
            entityType
        };
    }

    /**
     * Get mapping statistics
     */
    getStats() {
        return {
            isInitialized: this.isInitialized,
            initializationFailed: this.initializationFailed,
            cacheSize: this.cache.size,
            aiAvailable: this.isAIAvailable(),
            semanticMatcherStats: this.semanticMatcher?.getStats()
        };
    }

    /**
     * Clear caches to free memory
     */
    clearCache(): void {
        this.cache.clear();
        this.semanticMatcher?.clearCache();
        console.log('🧹 AI Header Mapper cache cleared');
    }
}

/**
 * Factory function to create and initialize AI header mapper
 */
export async function createAIHeaderMapper(): Promise<AIHeaderMapper> {
    const mapper = new AIHeaderMapper();
    // Initialization is lazy, so this returns immediately
    return mapper;
}

/**
 * Utility function to get expected schema for entity type
 */
export function getExpectedSchema(entityType: 'client' | 'worker' | 'task') {
    return getSchemaForEntityType(entityType);
} 