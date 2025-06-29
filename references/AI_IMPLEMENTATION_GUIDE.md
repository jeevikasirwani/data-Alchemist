# 🤖 AI Implementation Guide for Data Alchemist

## Overview
This guide provides detailed implementation strategies for AI features in the Data Alchemist project, focusing on practical, production-ready solutions.

## AI Service Architecture

### Core AI Services Structure
```typescript
// Base AI service interface
interface AIService {
  name: string;
  version: string;
  capabilities: string[];
  
  initialize(config: AIConfig): Promise<void>;
  processRequest(request: AIRequest): Promise<AIResponse>;
  validateInput(input: any): boolean;
  handleError(error: Error): AIError;
}

// AI Configuration
interface AIConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
  retries: number;
}
```

### 1. Header Mapping AI Service

#### Implementation Strategy
```typescript
class AIHeaderMapper implements AIService {
  private openai: OpenAI;
  private cache: Map<string, MappingResult> = new Map();

  constructor(config: AIConfig) {
    this.openai = new OpenAI({ apiKey: config.apiKey });
  }

  async detectEntityType(headers: string[]): Promise<EntityDetection> {
    const prompt = this.buildEntityDetectionPrompt(headers);
    
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 200
      });

      const result = this.parseEntityDetectionResponse(response.choices[0].message.content);
      return result;
    } catch (error) {
      // Fallback to rule-based detection
      return this.fallbackEntityDetection(headers);
    }
  }

  async mapHeaders(headers: string[], entityType: EntityType): Promise<MappingResult> {
    const cacheKey = `${entityType}-${headers.join(',')}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const expectedSchema = this.getExpectedSchema(entityType);
    const prompt = this.buildHeaderMappingPrompt(headers, expectedSchema);

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 1000
      });

      const mappingResult = this.parseHeaderMappingResponse(response.choices[0].message.content);
      this.cache.set(cacheKey, mappingResult);
      
      return mappingResult;
    } catch (error) {
      // Fallback to fuzzy string matching
      return this.fallbackHeaderMapping(headers, expectedSchema);
    }
  }

  private buildEntityDetectionPrompt(headers: string[]): string {
    return `
Analyze these CSV headers and determine the entity type:

Headers: ${headers.join(', ')}

Entity types:
- client: Contains client information (ClientID, ClientName, PriorityLevel, etc.)
- worker: Contains worker information (WorkerID, WorkerName, Skills, etc.)
- task: Contains task information (TaskID, TaskName, Duration, etc.)

Respond with JSON:
{
  "entityType": "client|worker|task",
  "confidence": 0.0-1.0,
  "reasoning": "explanation"
}
    `;
  }

  private buildHeaderMappingPrompt(headers: string[], expectedSchema: any): string {
    return `
Map these CSV headers to the expected schema:

CSV Headers: ${headers.join(', ')}

Expected Schema:
${JSON.stringify(expectedSchema, null, 2)}

Rules:
1. Map headers to closest matching schema fields
2. Handle variations like underscores, spaces, abbreviations
3. Mark unmappable headers
4. Provide confidence scores

Respond with JSON:
{
  "mappings": {
    "originalHeader": {
      "expectedHeader": "schemaField",
      "confidence": 0.0-1.0,
      "transformation": "direct|normalize|split|merge"
    }
  },
  "unmappedHeaders": ["header1", "header2"],
  "overallConfidence": 0.0-1.0
}
    `;
  }

  private fallbackHeaderMapping(headers: string[], schema: any): MappingResult {
    // Implement fuzzy string matching as fallback
    const mappings: Record<string, HeaderMapping> = {};
    const unmappedHeaders: string[] = [];
    
    headers.forEach(header => {
      const normalizedHeader = this.normalizeHeader(header);
      const bestMatch = this.findBestMatch(normalizedHeader, Object.keys(schema));
      
      if (bestMatch.confidence > 0.6) {
        mappings[header] = {
          expectedHeader: bestMatch.field,
          confidence: bestMatch.confidence,
          transformation: 'normalize'
        };
      } else {
        unmappedHeaders.push(header);
      }
    });

    return {
      mappings,
      unmappedHeaders,
      confidence: Object.values(mappings).reduce((acc, m) => acc + m.confidence, 0) / headers.length
    };
  }
}
```

### 2. Data Correction AI Service

#### Implementation Strategy
```typescript
class AIDataCorrector implements AIService {
  private openai: OpenAI;
  private correctionCache: Map<string, CorrectionSuggestion[]> = new Map();

  async suggestCorrections(
    data: any[],
    errors: ValidationError[],
    entityType: EntityType,
    context: AppData
  ): Promise<CorrectionSuggestion[]> {
    const suggestions: CorrectionSuggestion[] = [];
    
    // Group errors by type for batch processing
    const errorGroups = this.groupErrorsByType(errors);
    
    for (const [errorType, errorList] of Object.entries(errorGroups)) {
      try {
        const batchSuggestions = await this.processBatchCorrections(
          errorType,
          errorList,
          data,
          entityType,
          context
        );
        suggestions.push(...batchSuggestions);
      } catch (error) {
        console.error(`Failed to process corrections for ${errorType}:`, error);
        // Add basic corrections as fallback
        suggestions.push(...this.generateBasicCorrections(errorList));
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence);
  }

  private async processBatchCorrections(
    errorType: string,
    errors: ValidationError[],
    data: any[],
    entityType: EntityType,
    context: AppData
  ): Promise<CorrectionSuggestion[]> {
    const prompt = this.buildCorrectionPrompt(errorType, errors, data.slice(0, 5), context);
    
    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 2000
    });

    return this.parseCorrectionResponse(response.choices[0].message.content, errors);
  }

  private buildCorrectionPrompt(
    errorType: string,
    errors: ValidationError[],
    sampleData: any[],
    context: AppData
  ): string {
    return `
Fix these ${errorType} validation errors:

Errors:
${errors.map(e => `- ${e.message} (Field: ${e.field}, Entity: ${e.entityId})`).join('\n')}

Sample Data:
${JSON.stringify(sampleData, null, 2)}

Context Information:
- Available Clients: ${context.clients.map(c => c.ClientID).slice(0, 10).join(', ')}
- Available Workers: ${context.workers.map(w => w.WorkerID).slice(0, 10).join(', ')}
- Available Tasks: ${context.tasks.map(t => t.TaskID).slice(0, 10).join(', ')}

Provide specific corrections with high confidence:

Respond with JSON array:
[
  {
    "errorId": "error-id",
    "suggestion": "specific correction description",
    "action": "auto-fix|manual-review|ignore",
    "confidence": 0.0-1.0,
    "correctedValue": "actual value to use",
    "reasoning": "why this correction is appropriate"
  }
]
    `;
  }

  async applyCorrection(data: any[], suggestion: CorrectionSuggestion): Promise<any[]> {
    const correctedData = [...data];
    const error = suggestion.error;
    
    // Find the record to correct
    const recordIndex = correctedData.findIndex(record => 
      record[this.getIdField(error.entityType)] === error.entityId
    );
    
    if (recordIndex === -1) {
      throw new Error(`Record ${error.entityId} not found`);
    }

    // Apply the correction based on suggestion type
    switch (suggestion.action) {
      case 'auto-fix':
        correctedData[recordIndex][error.field] = suggestion.correctedValue;
        break;
      case 'manual-review':
        // Mark for manual review but don't auto-apply
        correctedData[recordIndex][`_${error.field}_needs_review`] = true;
        correctedData[recordIndex][`_${error.field}_suggestion`] = suggestion.correctedValue;
        break;
      default:
        // No action needed
        break;
    }

    return correctedData;
  }
}
```

### 3. Natural Language Query Processor

#### Implementation Strategy
```typescript
class AIQueryProcessor implements AIService {
  private openai: OpenAI;
  private queryCache: Map<string, QueryResult> = new Map();

  async processQuery(query: string, data: AppData): Promise<QueryResult> {
    const cacheKey = this.generateQueryCacheKey(query, data);
    if (this.queryCache.has(cacheKey)) {
      return this.queryCache.get(cacheKey)!;
    }

    try {
      // Parse the natural language query
      const parsedQuery = await this.parseNaturalLanguageQuery(query, data);
      
      // Execute the query
      const results = this.executeQuery(parsedQuery, data);
      
      const queryResult: QueryResult = {
        query,
        parsedQuery,
        results,
        totalCount: results.length,
        executionTime: Date.now(),
        confidence: parsedQuery.confidence
      };

      this.queryCache.set(cacheKey, queryResult);
      return queryResult;
    } catch (error) {
      // Fallback to simple text search
      return this.fallbackTextSearch(query, data);
    }
  }

  private async parseNaturalLanguageQuery(query: string, data: AppData): Promise<ParsedQuery> {
    const dataSchema = this.generateDataSchema(data);
    const prompt = this.buildQueryParsingPrompt(query, dataSchema);

    const response = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      max_tokens: 1000
    });

    return this.parseQueryResponse(response.choices[0].message.content);
  }

  private buildQueryParsingPrompt(query: string, schema: any): string {
    return `
Parse this natural language query into a structured format:

Query: "${query}"

Available Data Schema:
${JSON.stringify(schema, null, 2)}

Convert to structured query format:
{
  "entityType": "client|worker|task|multiple",
  "filters": [
    {
      "field": "fieldName",
      "operator": "equals|contains|greater_than|less_than|in|not_in",
      "value": "value",
      "dataType": "string|number|array|boolean"
    }
  ],
  "sort": {
    "field": "fieldName",
    "direction": "asc|desc"
  },
  "limit": number,
  "confidence": 0.0-1.0
}

Examples:
- "Tasks with duration greater than 2" → {entityType: "task", filters: [{field: "Duration", operator: "greater_than", value: 2}]}
- "Workers with Python skills" → {entityType: "worker", filters: [{field: "Skills", operator: "contains", value: "Python"}]}
    `;
  }

  private executeQuery(parsedQuery: ParsedQuery, data: AppData): any[] {
    let targetData: any[] = [];
    
    switch (parsedQuery.entityType) {
      case 'client':
        targetData = data.clients;
        break;
      case 'worker':
        targetData = data.workers;
        break;
      case 'task':
        targetData = data.tasks;
        break;
      case 'multiple':
        targetData = [...data.clients, ...data.workers, ...data.tasks];
        break;
    }

    // Apply filters
    let filteredData = targetData;
    parsedQuery.filters.forEach(filter => {
      filteredData = this.applyFilter(filteredData, filter);
    });

    // Apply sorting
    if (parsedQuery.sort) {
      filteredData = this.applySorting(filteredData, parsedQuery.sort);
    }

    // Apply limit
    if (parsedQuery.limit) {
      filteredData = filteredData.slice(0, parsedQuery.limit);
    }

    return filteredData;
  }

  private applyFilter(data: any[], filter: QueryFilter): any[] {
    return data.filter(item => {
      const fieldValue = this.getFieldValue(item, filter.field);
      
      switch (filter.operator) {
        case 'equals':
          return fieldValue === filter.value;
        case 'contains':
          return Array.isArray(fieldValue) 
            ? fieldValue.includes(filter.value)
            : String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
        case 'greater_than':
          return Number(fieldValue) > Number(filter.value);
        case 'less_than':
          return Number(fieldValue) < Number(filter.value);
        case 'in':
          return Array.isArray(filter.value) && filter.value.includes(fieldValue);
        case 'not_in':
          return Array.isArray(filter.value) && !filter.value.includes(fieldValue);
        default:
          return true;
      }
    });
  }
}
```

## AI Integration Best Practices

### 1. Error Handling & Fallbacks
```typescript
class AIErrorHandler {
  static async withFallback<T>(
    aiOperation: () => Promise<T>,
    fallbackOperation: () => T,
    options: { maxRetries?: number; timeout?: number } = {}
  ): Promise<T> {
    const { maxRetries = 3, timeout = 10000 } = options;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await Promise.race([
          aiOperation(),
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('AI operation timeout')), timeout)
          )
        ]);
        return result;
      } catch (error) {
        console.warn(`AI operation attempt ${attempt + 1} failed:`, error);
        
        if (attempt === maxRetries - 1) {
          console.log('Falling back to non-AI implementation');
          return fallbackOperation();
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    return fallbackOperation();
  }
}
```

### 2. Performance Optimization
```typescript
class AIPerformanceOptimizer {
  private requestQueue: AIRequest[] = [];
  private processing = false;
  private rateLimiter = new RateLimiter(60); // 60 requests per minute

  async optimizedRequest<T>(request: AIRequest): Promise<T> {
    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = await this.getFromCache<T>(cacheKey);
    if (cached) return cached;

    // Add to queue
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        ...request,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.requestQueue.length === 0) return;
    
    this.processing = true;
    
    try {
      // Process requests in batches
      const batch = this.requestQueue.splice(0, 5);
      const batchPromises = batch.map(async (request) => {
        try {
          await this.rateLimiter.waitForSlot();
          const result = await this.executeAIRequest(request);
          
          // Cache result
          const cacheKey = this.generateCacheKey(request);
          await this.setCache(cacheKey, result);
          
          request.resolve(result);
        } catch (error) {
          request.reject(error);
        }
      });
      
      await Promise.all(batchPromises);
    } finally {
      this.processing = false;
      
      // Continue processing if more requests
      if (this.requestQueue.length > 0) {
        setTimeout(() => this.processQueue(), 100);
      }
    }
  }
}
```

### 3. Testing AI Components
```typescript
describe('AI Services', () => {
  describe('AIHeaderMapper', () => {
    it('should map common header variations', async () => {
      const mapper = new AIHeaderMapper(testConfig);
      const headers = ['client_id', 'Client Name', 'priority_lvl'];
      
      const result = await mapper.mapHeaders(headers, 'client');
      
      expect(result.mappings['client_id'].expectedHeader).toBe('ClientID');
      expect(result.mappings['Client Name'].expectedHeader).toBe('ClientName');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should fallback gracefully on AI failure', async () => {
      const mapper = new AIHeaderMapper(invalidConfig);
      const headers = ['ClientID', 'ClientName'];
      
      const result = await mapper.mapHeaders(headers, 'client');
      
      expect(result).toBeDefined();
      expect(result.mappings).toBeDefined();
    });
  });

  describe('AIDataCorrector', () => {
    it('should suggest corrections for validation errors', async () => {
      const corrector = new AIDataCorrector(testConfig);
      const errors = [
        {
          id: 'error1',
          entityType: 'client',
          entityId: 'C001',
          field: 'PriorityLevel',
          message: 'Priority must be between 1-5',
          type: 'error',
          severity: 'high'
        }
      ];
      
      const suggestions = await corrector.suggestCorrections(
        mockData,
        errors,
        'client',
        mockContext
      );
      
      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].confidence).toBeGreaterThan(0.5);
    });
  });
});
```

## Production Deployment Considerations

### 1. Environment Configuration
```typescript
const aiConfig = {
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.3'),
  },
  fallback: {
    enabled: process.env.AI_FALLBACK_ENABLED === 'true',
    timeout: parseInt(process.env.AI_TIMEOUT || '10000'),
  },
  caching: {
    enabled: process.env.AI_CACHING_ENABLED === 'true',
    ttl: parseInt(process.env.AI_CACHE_TTL || '300000'),
  },
  rateLimit: {
    requestsPerMinute: parseInt(process.env.AI_RATE_LIMIT || '60'),
  }
};
```

### 2. Monitoring & Analytics
```typescript
class AIMonitor {
  private metrics: AIMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    cacheHitRate: 0
  };

  trackRequest(operation: string, success: boolean, responseTime: number) {
    this.metrics.totalRequests++;
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.updateAverageResponseTime(responseTime);
    
    // Send to analytics service
    this.sendToAnalytics({
      operation,
      success,
      responseTime,
      timestamp: new Date()
    });
  }

  getHealthStatus(): AIHealthStatus {
    const successRate = this.metrics.successfulRequests / this.metrics.totalRequests;
    
    return {
      status: successRate > 0.95 ? 'healthy' : successRate > 0.8 ? 'degraded' : 'unhealthy',
      metrics: this.metrics,
      lastCheck: new Date()
    };
  }
}
```

This comprehensive AI implementation guide provides the foundation for building robust, production-ready AI features in the Data Alchemist application. 