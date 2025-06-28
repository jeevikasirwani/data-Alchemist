import { calculateSimilarity } from './ai-config';

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

export interface HeaderMapping {
    [fileHeader: string]: {
        expectedHeader: string;
        confidence: number;
        entityType: 'client' | 'worker' | 'task';
    };
}

export interface MappingResult {
    mappings: HeaderMapping;
    unmappedHeaders: string[];
    confidence: number;
}

export class AIHeaderMapper {
    private similarityCache = new Map<string, number>();
    
    private expectedHeaders = {
        client: [
            'ClientID', 'ClientId', 'client_id', 'clientid',
            'ClientName', 'client_name', 'clientname', 'name',
            'PriorityLevel', 'priority_level', 'priority', 'level',
            'RequestedTaskIDs', 'requested_tasks', 'tasks', 'task_ids',
            'GroupTag', 'group_tag', 'group', 'tag',
            'AttributesJSON', 'attributes', 'attrs', 'json'
        ],
        worker: [
            'WorkerID', 'WorkerId', 'worker_id', 'workerid',
            'WorkerName', 'worker_name', 'workername', 'name',
            'Skills', 'skills', 'skill', 'capabilities',
            'AvailableSlots', 'available_slots', 'slots', 'availability',
            'MaxLoadPerPhase', 'max_load', 'load', 'capacity',
            'WorkerGroup', 'worker_group', 'group', 'team',
            'QualificationLevel', 'qualification', 'level', 'experience'
        ],
        task: [
            'TaskID', 'TaskId', 'task_id', 'taskid',
            'TaskName', 'task_name', 'taskname', 'name',
            'Category', 'category', 'type', 'classification',
            'Duration', 'duration', 'time', 'length',
            'RequiredSkills', 'required_skills', 'skills', 'requirements',
            'PreferredPhases', 'preferred_phases', 'phases', 'timing',
            'MaxConcurrent', 'max_concurrent', 'concurrent', 'parallel'
        ]
    };

    async mapHeaders(fileHeaders: string[], entityType: 'client' | 'worker' | 'task'): Promise<MappingResult> {
        const mappings: HeaderMapping = {};
        const unmappedHeaders: string[] = [];
        let totalConfidence = 0;
        let mappedCount = 0;

        const expectedHeaders = this.expectedHeaders[entityType];

        // Process headers in parallel for better performance
        const mappingPromises = fileHeaders.map(async (fileHeader) => {
            const bestMatch = await this.findBestMatch(fileHeader, expectedHeaders, entityType);
            return { fileHeader, bestMatch };
        });

        const results = await Promise.all(mappingPromises);

        for (const { fileHeader, bestMatch } of results) {
            if (bestMatch.confidence > 0.7) { // High confidence threshold
                mappings[fileHeader] = bestMatch;
                totalConfidence += bestMatch.confidence;
                mappedCount++;
            } else {
                unmappedHeaders.push(fileHeader);
            }
        }

        const averageConfidence = mappedCount > 0 ? totalConfidence / mappedCount : 0;

        return {
            mappings,
            unmappedHeaders,
            confidence: averageConfidence
        };
    }

    private async findBestMatch(
        fileHeader: string, 
        expectedHeaders: string[], 
        entityType: 'client' | 'worker' | 'task'
    ): Promise<{ expectedHeader: string; confidence: number; entityType: 'client' | 'worker' | 'task' }> {
        let bestMatch = {
            expectedHeader: '',
            confidence: 0,
            entityType: entityType
        };

        // First pass: use fast local string similarity
        const localMatches = expectedHeaders.map(expectedHeader => ({
            expectedHeader,
            localSimilarity: localStringSimilarity(fileHeader, expectedHeader)
        })).sort((a, b) => b.localSimilarity - a.localSimilarity);

        // If we have a very high local match, skip AI altogether
        if (localMatches[0].localSimilarity >= 0.9) {
            return {
                expectedHeader: localMatches[0].expectedHeader,
                confidence: localMatches[0].localSimilarity,
                entityType
            };
        }

        // Only use AI for top 3 candidates to reduce API calls
        const topCandidates = localMatches.slice(0, 3).filter(m => m.localSimilarity > 0.3);

        for (const candidate of topCandidates) {
            const cacheKey = `${fileHeader.toLowerCase()}_${candidate.expectedHeader.toLowerCase()}`;
            
            let similarity: number;
            if (this.similarityCache.has(cacheKey)) {
                similarity = this.similarityCache.get(cacheKey)!;
            } else {
                similarity = await calculateSimilarity(fileHeader.toLowerCase(), candidate.expectedHeader.toLowerCase());
                this.similarityCache.set(cacheKey, similarity);
            }
            
            if (similarity > bestMatch.confidence) {
                bestMatch = {
                    expectedHeader: candidate.expectedHeader,
                    confidence: similarity,
                    entityType
                };
            }
        }

        return bestMatch;
    }

    async detectEntityType(headers: string[]): Promise<{ entityType: 'client' | 'worker' | 'task'; confidence: number }> {
        // Use simple keyword matching first for performance
        const entityKeywords = {
            client: ['client', 'customer', 'priority', 'group', 'attributes'],
            worker: ['worker', 'employee', 'skill', 'slot', 'load', 'qualification'],
            task: ['task', 'job', 'duration', 'category', 'phase', 'concurrent']
        };

        const entityScores = { client: 0, worker: 0, task: 0 };
        
        // Fast keyword-based detection
        headers.forEach(header => {
            const lowerHeader = header.toLowerCase();
            Object.entries(entityKeywords).forEach(([entityType, keywords]) => {
                keywords.forEach(keyword => {
                    if (lowerHeader.includes(keyword)) {
                        entityScores[entityType as keyof typeof entityScores] += 1;
                    }
                });
            });
        });

        // If keyword matching is decisive, return early
        const maxScore = Math.max(...Object.values(entityScores));
        if (maxScore >= 2) { // At least 2 keyword matches
            const bestEntity = Object.entries(entityScores).find(([_, score]) => score === maxScore);
            if (bestEntity) {
                return {
                    entityType: bestEntity[0] as 'client' | 'worker' | 'task',
                    confidence: Math.min(0.95, maxScore / headers.length)
                };
            }
        }

        // Fallback to AI-based detection only if needed
        const aiEntityScores = { client: 0, worker: 0, task: 0 };
        
        // Process headers in parallel and limit AI calls
        const headerPromises = headers.slice(0, 5).map(async (header) => { // Limit to first 5 headers
            const scores = await Promise.all(
                Object.entries(this.expectedHeaders).map(async ([entityType, expectedHeaders]) => {
                    const topExpected = expectedHeaders.slice(0, 3); // Only check top 3 expected headers
                    const bestMatch = await this.findBestMatch(header, topExpected, entityType as any);
                    return { entityType, score: bestMatch.confidence };
                })
            );
            return scores;
        });

        const allScores = await Promise.all(headerPromises);
        
        allScores.flat().forEach(({ entityType, score }) => {
            aiEntityScores[entityType as keyof typeof aiEntityScores] += score;
        });

        const bestEntity = Object.entries(aiEntityScores).reduce((a, b) => 
            aiEntityScores[a[0] as keyof typeof aiEntityScores] > aiEntityScores[b[0] as keyof typeof aiEntityScores] ? a : b
        );

        return {
            entityType: bestEntity[0] as 'client' | 'worker' | 'task',
            confidence: bestEntity[1] / headers.length
        };
    }

    getMappingSuggestions(unmappedHeaders: string[], entityType: 'client' | 'worker' | 'task'): string[] {
        const suggestions: string[] = [];
        const expectedHeaders = this.expectedHeaders[entityType];

        for (const header of unmappedHeaders) {
            // Simple string matching for suggestions
            const similarHeaders = expectedHeaders.filter(expected => 
                expected.toLowerCase().includes(header.toLowerCase()) ||
                header.toLowerCase().includes(expected.toLowerCase())
            );
            
            if (similarHeaders.length > 0) {
                suggestions.push(`"${header}" might be "${similarHeaders[0]}"`);
            }
        }

        return suggestions;
    }
} 