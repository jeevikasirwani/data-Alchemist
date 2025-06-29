// Types for semantic matching
export interface FieldSchema {
  fieldName: string;
  aliases: string[];
  dataType: string;
  description?: string;
  examples?: string[];
}

export interface DataSchema {
  entityType: 'client' | 'worker' | 'task';
  fields: FieldSchema[];
}

export interface MatchResult {
  fieldName: string;
  confidence: number;
  method: 'exact' | 'fuzzy' | 'semantic' | 'alias' | 'semantic_simple';
  originalHeader: string;
  suggestedTransformation?: string;
}

export interface SemanticMatchConfig {
  modelName: string;
  threshold: number;
  cacheResults: boolean;
}

/**
 * Browser-Safe Semantic Header Matcher 
 * Uses Hugging Face if available, falls back to smart keyword matching
 */
export class SemanticMatcher {
  private pipeline: any = null;
  private fieldEmbeddings: Map<string, number[]> = new Map();
  private embeddingCache: Map<string, number[]> = new Map();
  private config: SemanticMatchConfig;
  private isInitialized = false;
  private isClient = false;
  private useHuggingFace = false;

  constructor(config: Partial<SemanticMatchConfig> = {}) {
    this.config = {
      modelName: 'Xenova/all-MiniLM-L6-v2',
      threshold: 0.75,
      cacheResults: true,
      ...config
    };
    
    // Check if we're running in the browser
    this.isClient = typeof window !== 'undefined';
  }

  /**
   * Initialize the semantic matcher (safe browser version)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!this.isClient) {
      console.log('⚠️ Semantic matcher skipped on server-side');
      this.isInitialized = true;
      return;
    }

    console.log('🤖 Initializing semantic matcher...');
    
    // Try to load Hugging Face, but don't fail if it doesn't work
    try {
      console.log('🔄 Attempting to load Hugging Face transformers...');
      
      // Set a very short timeout to avoid hanging
      const loadPromise = this.loadHuggingFace();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('HuggingFace load timeout')), 3000)
      );
      
      await Promise.race([loadPromise, timeoutPromise]);
      
      this.useHuggingFace = true;
      console.log('✅ Hugging Face loaded successfully');
      
    } catch (error) {
      console.log('⚠️ Hugging Face unavailable, using smart keyword matching instead');
      console.log('   This is completely normal and the app will work great!');
      this.useHuggingFace = false;
    }
    
    this.isInitialized = true;
    console.log(`✅ Semantic matcher ready (${this.useHuggingFace ? 'AI' : 'Smart Keyword'} mode)`);
  }

  /**
   * Try to load Hugging Face (may fail in some browser environments)
   */
  private async loadHuggingFace(): Promise<void> {
    try {
      // Dynamic import with error handling
      const { pipeline } = await import('@xenova/transformers');
      
      this.pipeline = await pipeline('feature-extraction', this.config.modelName, {
        quantized: false,
      });
      
    } catch (error) {
      // This is fine - we'll use smart keyword matching instead
      throw new Error('HuggingFace not available');
    }
  }

  /**
   * Check if semantic matching is available
   */
  isSemanticMatchingAvailable(): boolean {
    return this.isClient && this.useHuggingFace && !!this.pipeline;
  }

  /**
   * Precompute embeddings for all schema fields (if AI available)
   */
  async precomputeFieldEmbeddings(schema: DataSchema): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isSemanticMatchingAvailable()) {
      console.log('✅ Using smart keyword matching (no precomputation needed)');
      return;
    }

    console.log(`🔄 Precomputing AI embeddings for ${schema.fields.length} fields...`);
    
    for (const field of schema.fields) {
      try {
        const fieldText = this.createFieldText(field);
        const embedding = await this.getEmbedding(fieldText);
        this.fieldEmbeddings.set(field.fieldName, embedding);
        console.log(`✅ AI embedding computed for: ${field.fieldName}`);
      } catch (error) {
        console.warn(`⚠️ Failed to compute embedding for ${field.fieldName}, will use keyword matching`);
      }
    }
    
    console.log('🎉 AI embeddings ready');
  }

  /**
   * Find the best semantic match for a header
   */
  async findBestMatch(header: string, schema: DataSchema): Promise<MatchResult | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // First try exact and fuzzy matches (always available)
    const quickMatch = this.tryQuickMatches(header, schema);
    if (quickMatch && quickMatch.confidence > 0.9) {
      return quickMatch;
    }

    // Try semantic matching (AI or smart keywords)
    const semanticMatch = await this.checkSemanticMatch(header, schema);
    
    // Return the best match
    if (quickMatch && semanticMatch) {
      return quickMatch.confidence > semanticMatch.confidence ? quickMatch : semanticMatch;
    }
    
    return semanticMatch || quickMatch;
  }

  /**
   * Check semantic similarity (AI or smart keyword matching)
   */
  async checkSemanticMatch(header: string, schema: DataSchema): Promise<MatchResult | null> {
    try {
      // If AI is available, use it
      if (this.isSemanticMatchingAvailable()) {
        return await this.checkAISemanticMatch(header, schema);
      } else {
        // Use smart keyword matching
        return this.checkKeywordSemanticMatch(header, schema);
      }
    } catch (error) {
      console.warn('Semantic matching failed, will use basic matching:', error);
      return null;
    }
  }

  /**
   * AI-based semantic matching (when Hugging Face is available)
   */
  private async checkAISemanticMatch(header: string, schema: DataSchema): Promise<MatchResult | null> {
    try {
      const headerEmbedding = await this.getEmbedding(header);
      let bestMatch: MatchResult | null = null;
      let bestSimilarity = 0;

      for (const field of schema.fields) {
        const fieldEmbedding = this.fieldEmbeddings.get(field.fieldName);
        if (!fieldEmbedding) continue;

        const similarity = this.cosineSimilarity(headerEmbedding, fieldEmbedding);
        
        if (similarity >= this.config.threshold && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            fieldName: field.fieldName,
            confidence: similarity,
            method: 'semantic',
            originalHeader: header,
            suggestedTransformation: this.suggestTransformation(header, field.fieldName)
          };
        }
      }

      return bestMatch;
    } catch (error) {
      console.warn('AI semantic matching failed:', error);
      return null;
    }
  }

  /**
   * Smart keyword-based semantic matching (fallback when AI not available)
   */
  private checkKeywordSemanticMatch(header: string, schema: DataSchema): MatchResult | null {
    const headerLower = header.toLowerCase();
    const headerTerms = headerLower.split(/[_\s\-\.]+/).filter(term => term.length > 1);
    
    let bestMatch: MatchResult | null = null;
    let bestScore = 0;

    for (const field of schema.fields) {
      // Create searchable terms for this field
      const fieldTerms = [
        field.fieldName.toLowerCase(),
        ...field.aliases.map(a => a.toLowerCase()),
        ...(field.description?.toLowerCase().split(/\s+/) || []),
        ...(field.examples?.map(e => e.toLowerCase()) || [])
      ];

      // Split field terms into individual words
      const allFieldWords = fieldTerms.flatMap(term => 
        term.split(/[_\s\-\.]+/).filter(word => word.length > 1)
      );

      // Calculate semantic similarity based on overlapping terms
      let matchScore = 0;
      let totalTermWeight = 0;

      for (const headerTerm of headerTerms) {
        let bestTermMatch = 0;
        
        for (const fieldWord of allFieldWords) {
          // Exact match
          if (headerTerm === fieldWord) {
            bestTermMatch = Math.max(bestTermMatch, 1.0);
          }
          // Contains match
          else if (headerTerm.includes(fieldWord) || fieldWord.includes(headerTerm)) {
            bestTermMatch = Math.max(bestTermMatch, 0.8);
          }
          // Similarity based on common prefixes/suffixes
          else if (this.wordSimilarity(headerTerm, fieldWord) > 0.7) {
            bestTermMatch = Math.max(bestTermMatch, 0.6);
          }
        }
        
        matchScore += bestTermMatch;
        totalTermWeight += 1;
      }

      // Normalize score
      const confidence = totalTermWeight > 0 ? matchScore / totalTermWeight : 0;

      // Apply bonus for field name matches vs alias matches
      const isFieldNameMatch = allFieldWords.some(word => 
        field.fieldName.toLowerCase().includes(word)
      );
      const finalConfidence = isFieldNameMatch ? confidence * 1.1 : confidence;

      if (finalConfidence >= 0.4 && finalConfidence > bestScore) {
        bestScore = finalConfidence;
        bestMatch = {
          fieldName: field.fieldName,
          confidence: Math.min(finalConfidence, 0.85), // Cap at 0.85 for keyword matching
          method: 'semantic_simple',
          originalHeader: header,
          suggestedTransformation: this.suggestTransformation(header, field.fieldName)
        };
      }
    }

    return bestMatch;
  }

  /**
   * Calculate similarity between two words
   */
  private wordSimilarity(word1: string, word2: string): number {
    if (word1 === word2) return 1.0;
    if (word1.length < 2 || word2.length < 2) return 0;
    
    // Check for common prefixes and suffixes
    const minLength = Math.min(word1.length, word2.length);
    let commonPrefix = 0;
    let commonSuffix = 0;
    
    // Count common prefix
    for (let i = 0; i < minLength; i++) {
      if (word1[i] === word2[i]) {
        commonPrefix++;
      } else {
        break;
      }
    }
    
    // Count common suffix
    for (let i = 1; i <= minLength - commonPrefix; i++) {
      if (word1[word1.length - i] === word2[word2.length - i]) {
        commonSuffix++;
      } else {
        break;
      }
    }
    
    const commonChars = commonPrefix + commonSuffix;
    const maxLength = Math.max(word1.length, word2.length);
    
    return commonChars / maxLength;
  }

  /**
   * Batch process multiple headers for efficiency
   */
  async batchMatchHeaders(headers: string[], schema: DataSchema): Promise<Map<string, MatchResult | null>> {
    const results = new Map<string, MatchResult | null>();
    
    // Process in batches
    const batchSize = 10;
    for (let i = 0; i < headers.length; i += batchSize) {
      const batch = headers.slice(i, i + batchSize);
      const batchPromises = batch.map(header => this.findBestMatch(header, schema));
      const batchResults = await Promise.all(batchPromises);
      
      batch.forEach((header, index) => {
        results.set(header, batchResults[index]);
      });
    }
    
    return results;
  }

  /**
   * Get embedding for text using Hugging Face (only when available)
   */
  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.isSemanticMatchingAvailable()) {
      throw new Error('AI semantic matching not available');
    }

    // Check cache first
    if (this.config.cacheResults && this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    try {
      const normalizedText = this.normalizeText(text);
      const output = await this.pipeline(normalizedText, { pooling: 'mean', normalize: true });
      const embedding = Array.isArray(output) ? output : Array.from(output.data);
      
      if (this.config.cacheResults) {
        this.embeddingCache.set(text, embedding);
      }
      
      return embedding;
    } catch (error) {
      console.error(`Failed to get embedding for "${text}":`, error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Try quick exact and fuzzy matching before semantic matching
   */
  private tryQuickMatches(header: string, schema: DataSchema): MatchResult | null {
    const normalizedHeader = this.normalizeText(header);
    
    for (const field of schema.fields) {
      // Exact match
      if (normalizedHeader === this.normalizeText(field.fieldName)) {
        return {
          fieldName: field.fieldName,
          confidence: 1.0,
          method: 'exact',
          originalHeader: header
        };
      }

      // Alias match
      for (const alias of field.aliases) {
        if (normalizedHeader === this.normalizeText(alias)) {
          return {
            fieldName: field.fieldName,
            confidence: 0.95,
            method: 'alias',
            originalHeader: header
          };
        }
      }

      // Fuzzy match
      const fuzzyScore = this.fuzzyMatch(normalizedHeader, this.normalizeText(field.fieldName));
      if (fuzzyScore > 0.8) {
        return {
          fieldName: field.fieldName,
          confidence: fuzzyScore,
          method: 'fuzzy',
          originalHeader: header
        };
      }
    }

    return null;
  }

  /**
   * Simple fuzzy matching using Levenshtein distance
   */
  private fuzzyMatch(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Create comprehensive text representation of a field
   */
  private createFieldText(field: FieldSchema): string {
    const parts = [
      field.fieldName,
      ...field.aliases,
      field.dataType,
      field.description || '',
      ...(field.examples || [])
    ];
    
    return parts.filter(part => part.trim()).join(' ');
  }

  /**
   * Normalize text for better matching
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Suggest how to transform the original header to the expected format
   */
  private suggestTransformation(originalHeader: string, expectedField: string): string {
    const original = originalHeader.toLowerCase();
    const expected = expectedField.toLowerCase();
    
    if (original.includes('_') && !expected.includes('_')) {
      return 'Remove underscores and use camelCase';
    }
    if (original.includes(' ') && !expected.includes(' ')) {
      return 'Remove spaces and use camelCase';
    }
    if (original !== expected) {
      return `Rename to "${expectedField}"`;
    }
    
    return 'Direct mapping';
  }

  /**
   * Get mapping statistics
   */
  getStats(): { cacheSize: number; fieldEmbeddings: number; isInitialized: boolean; modelLoaded: boolean; semanticAvailable: boolean; usingAI: boolean } {
    return {
      cacheSize: this.embeddingCache.size,
      fieldEmbeddings: this.fieldEmbeddings.size,
      isInitialized: this.isInitialized,
      modelLoaded: !!this.pipeline,
      semanticAvailable: this.isSemanticMatchingAvailable(),
      usingAI: this.useHuggingFace
    };
  }

  /**
   * Clear cache to free memory
   */
  clearCache(): void {
    this.embeddingCache.clear();
    console.log('🧹 Embedding cache cleared');
  }
}

/**
 * Schema definitions for different entity types
 */
export const DATA_SCHEMAS: Record<string, DataSchema> = {
  client: {
    entityType: 'client',
    fields: [
      {
        fieldName: 'ClientID',
        aliases: ['client_id', 'id', 'clientid', 'client_identifier', 'customer_id'],
        dataType: 'string',
        description: 'Unique identifier for the client',
        examples: ['C001', 'CLIENT_001', 'client-1']
      },
      {
        fieldName: 'ClientName',
        aliases: ['client_name', 'name', 'clientname', 'customer_name', 'client_title'],
        dataType: 'string',
        description: 'Name of the client or customer',
        examples: ['John Doe', 'Acme Corp', 'Client Name']
      },
      {
        fieldName: 'PriorityLevel',
        aliases: ['priority_level', 'priority', 'prioritylevel', 'importance', 'urgency'],
        dataType: 'number',
        description: 'Priority level from 1 to 5',
        examples: ['1', '3', '5']
      },
      {
        fieldName: 'RequestedTaskIDs',
        aliases: ['requested_task_ids', 'task_ids', 'tasks', 'requested_tasks', 'task_list'],
        dataType: 'array',
        description: 'Comma-separated list of requested task IDs',
        examples: ['T001,T002', 'TASK_1,TASK_2']
      },
      {
        fieldName: 'GroupTag',
        aliases: ['group_tag', 'group', 'grouptag', 'client_group', 'category'],
        dataType: 'string',
        description: 'Group or category tag for the client',
        examples: ['VIP', 'Standard', 'Premium']
      },
      {
        fieldName: 'AttributesJSON',
        aliases: ['attributes_json', 'attributes', 'metadata', 'extra_data', 'properties'],
        dataType: 'json',
        description: 'Additional attributes in JSON format',
        examples: ['{"vip": true}', '{"region": "US"}']
      }
    ]
  },
  worker: {
    entityType: 'worker',
    fields: [
      {
        fieldName: 'WorkerID',
        aliases: ['worker_id', 'id', 'workerid', 'employee_id', 'staff_id'],
        dataType: 'string',
        description: 'Unique identifier for the worker',
        examples: ['W001', 'WORKER_001', 'emp-123']
      },
      {
        fieldName: 'WorkerName',
        aliases: ['worker_name', 'name', 'workername', 'employee_name', 'staff_name'],
        dataType: 'string',
        description: 'Name of the worker',
        examples: ['Alice Johnson', 'Bob Smith']
      },
      {
        fieldName: 'Skills',
        aliases: ['skills', 'skill_set', 'capabilities', 'competencies', 'expertise'],
        dataType: 'array',
        description: 'Comma-separated list of skills',
        examples: ['Python,JavaScript', 'Design,Marketing']
      },
      {
        fieldName: 'AvailableSlots',
        aliases: ['available_slots', 'slots', 'availability', 'free_slots', 'open_slots'],
        dataType: 'array',
        description: 'Available time slots or phases',
        examples: ['[1,3,5]', '1,2,3']
      },
      {
        fieldName: 'MaxLoadPerPhase',
        aliases: ['max_load_per_phase', 'max_load', 'capacity', 'workload_limit', 'max_tasks'],
        dataType: 'number',
        description: 'Maximum workload per phase',
        examples: ['3', '5', '10']
      },
      {
        fieldName: 'WorkerGroup',
        aliases: ['worker_group', 'group', 'team', 'department', 'division'],
        dataType: 'string',
        description: 'Group or team the worker belongs to',
        examples: ['Development', 'Design', 'Marketing']
      },
      {
        fieldName: 'QualificationLevel',
        aliases: ['qualification_level', 'level', 'experience', 'seniority', 'grade'],
        dataType: 'number',
        description: 'Qualification or experience level',
        examples: ['1', '3', '5']
      }
    ]
  },
  task: {
    entityType: 'task',
    fields: [
      {
        fieldName: 'TaskID',
        aliases: ['task_id', 'id', 'taskid', 'task_identifier', 'job_id'],
        dataType: 'string',
        description: 'Unique identifier for the task',
        examples: ['T001', 'TASK_001', 'job-123']
      },
      {
        fieldName: 'TaskName',
        aliases: ['task_name', 'name', 'taskname', 'job_name', 'title'],
        dataType: 'string',
        description: 'Name or title of the task',
        examples: ['Website Development', 'Data Analysis']
      },
      {
        fieldName: 'Category',
        aliases: ['category', 'type', 'task_type', 'classification', 'genre'],
        dataType: 'string',
        description: 'Category or type of the task',
        examples: ['Development', 'Design', 'Analysis']
      },
      {
        fieldName: 'Duration',
        aliases: ['duration', 'time', 'length', 'phases', 'timeline'],
        dataType: 'number',
        description: 'Duration in phases or time units',
        examples: ['2', '5', '10']
      },
      {
        fieldName: 'RequiredSkills',
        aliases: ['required_skills', 'skills', 'prerequisites', 'requirements', 'needed_skills'],
        dataType: 'array',
        description: 'Required skills for the task',
        examples: ['Python,SQL', 'Design,Photoshop']
      },
      {
        fieldName: 'PreferredPhases',
        aliases: ['preferred_phases', 'phases', 'timeline', 'schedule', 'preferred_time'],
        dataType: 'array',
        description: 'Preferred phases for execution',
        examples: ['[1,2,3]', '1-3', '2,4,6']
      },
      {
        fieldName: 'MaxConcurrent',
        aliases: ['max_concurrent', 'concurrent', 'parallel', 'simultaneous', 'max_parallel'],
        dataType: 'number',
        description: 'Maximum concurrent assignments',
        examples: ['1', '3', '5']
      }
    ]
  }
};

/**
 * Factory function to create and initialize semantic matcher
 */
export async function createSemanticMatcher(config?: Partial<SemanticMatchConfig>): Promise<SemanticMatcher> {
  const matcher = new SemanticMatcher(config);
  await matcher.initialize();
  return matcher;
}

/**
 * Utility function to get schema for entity type
 */
export function getSchemaForEntityType(entityType: string): DataSchema {
  const schema = DATA_SCHEMAS[entityType];
  if (!schema) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return schema;
} 