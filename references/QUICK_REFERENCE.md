`# 📋 Quick Reference Guide: Data Alchemist

## Overview
The Data Alchemist is an AI-powered Next.js application that transforms messy spreadsheet data into clean, validated, and rule-based resource allocation configurations.

## Key Concepts

### Core Entities
```typescript
// Data Entities
Client: { ClientID, ClientName, PriorityLevel, RequestedTaskIDs, GroupTag, AttributesJSON }
Worker: { WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, WorkerGroup, QualificationLevel }
Task: { TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent }

// Business Rules
BusinessRule: { id, type, name, parameters, enabled, priority }
Rule Types: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch'

// Validation
ValidationError: { id, entityType, entityId, field, type, message, severity }
ValidationSummary: { totalErrors, totalWarnings, completionRate, readyForExport }
```

## Component Quick Reference

### 1. FileUpload Component
```typescript
// Purpose: Handle CSV/XLSX file uploads with AI-powered parsing
// Key Features: Drag & drop, multi-file support, AI entity detection
// Props: onFileUploaded, maxFiles, maxFileSize, acceptedTypes

<FileUpload 
  onFileUploaded={handleFileUpload}
  maxFiles={5}
  maxFileSize={10 * 1024 * 1024}
  acceptedTypes={['.csv', '.xlsx']}
/>
```

### 2. DataGrid Component
```typescript
// Purpose: Interactive data table with inline editing and validation
// Key Features: Virtual scrolling, real-time validation, bulk operations
// Props: data, entityType, onDataChange, validationErrors, allData

<DataGrid
  data={appData.clients}
  entityType="client"
  onDataChange={handleDataChange}
  validationErrors={clientErrors}
  allData={appData}
/>
```

### 3. RuleBuilder Component
```typescript
// Purpose: Visual and natural language rule creation
// Key Features: NL to rule conversion, visual templates, rule validation
// Props: rules, onRulesChange, appData, onGenerateConfig

<RuleBuilder
  rules={businessRules}
  onRulesChange={setBusinessRules}
  appData={appData}
  onGenerateConfig={generateConfiguration}
/>
```

### 4. PriorityWeights Component
```typescript
// Purpose: Configure resource allocation priorities
// Key Features: Weight sliders, preset profiles, impact preview
// Props: weights, onWeightsChange, onProfileSelect

<PriorityWeights
  weights={priorityWeights}
  onWeightsChange={setPriorityWeights}
  onProfileSelect={applyProfile}
/>
```

### 5. ExportSystem Component
```typescript
// Purpose: Generate clean data and configuration files
// Key Features: CSV generation, rules.json creation, validation check
// Props: appData, rules, priorities, validationSummary

<ExportSystem
  appData={appData}
  rules={businessRules}
  priorities={priorityWeights}
  validationSummary={validationSummary}
/>
```

## AI Services Quick Reference

### 1. Header Mapping Service
```typescript
// Purpose: AI-powered header detection and mapping
class AIHeaderMapper {
  async detectEntityType(headers: string[]): Promise<EntityDetection>
  async mapHeaders(headers: string[], entityType: EntityType): Promise<MappingResult>
}

// Usage
const mapper = new AIHeaderMapper();
const entityType = await mapper.detectEntityType(['ClientID', 'Client Name']);
const mapping = await mapper.mapHeaders(headers, entityType.entityType);
```

### 2. Data Correction Service
```typescript
// Purpose: AI-driven data correction suggestions
class AIDataCorrector {
  async suggestCorrections(data: any[], errors: ValidationError[]): Promise<CorrectionSuggestion[]>
  async applyCorrection(data: any[], suggestion: CorrectionSuggestion): Promise<any[]>
}

// Usage
const corrector = new AIDataCorrector();
const suggestions = await corrector.suggestCorrections(clientData, validationErrors);
const correctedData = await corrector.applyCorrection(clientData, suggestions[0]);
```

### 3. Query Processor Service
```typescript
// Purpose: Natural language query processing
class AIQueryProcessor {
  async processQuery(query: string, data: AppData): Promise<QueryResult>
}

// Usage
const processor = new AIQueryProcessor();
const result = await processor.processQuery("Show tasks with duration > 2", appData);
```

## Validation Rules Quick Reference

### Core Validation Rules (Must Implement 8+)
```typescript
1. ✅ Missing required columns
2. ✅ Duplicate IDs (ClientID/WorkerID/TaskID)
3. ✅ Malformed lists (non-numeric in AvailableSlots)
4. ✅ Out-of-range values (PriorityLevel not 1–5)
5. ✅ Broken JSON in AttributesJSON
6. ✅ Unknown references (RequestedTaskIDs not in tasks)
7. ✅ Circular co-run groups (A→B→C→A)
8. ✅ Conflicting rules vs. phase-window constraints
9. 📋 Overloaded workers (AvailableSlots.length < MaxLoadPerPhase)
10. 📋 Phase-slot saturation
11. 📋 Skill-coverage matrix
12. 📋 Max-concurrency feasibility
```

### Validation Implementation Pattern
```typescript
class ValidationEngine {
  validateAll(): { errors: ValidationError[], summary: ValidationSummary } {
    const errors = [
      ...this.validateRequiredFields(),
      ...this.validateDuplicateIDs(),
      ...this.validateDataTypes(),
      ...this.validateReferences(),
      ...this.validateRanges(),
      ...this.validateJSON(),
      ...this.validateSkillCoverage(),
      ...this.validatePhaseConstraints()
    ];
    
    return { errors, summary: this.generateSummary(errors) };
  }
}
```

## State Management Pattern

### Zustand Store Structure
```typescript
interface AppStore {
  // Data State
  appData: AppData;
  setAppData: (data: AppData) => void;
  updateEntityData: (entityType: EntityType, data: any[]) => void;
  
  // Validation State
  validationErrors: ValidationError[];
  validationSummary: ValidationSummary | null;
  
  // AI State
  headerMappings: MappingResult[];
  correctionSuggestions: CorrectionSuggestion[];
  queryResults: QueryResult | null;
  
  // Business Logic State
  businessRules: BusinessRule[];
  priorityWeights: PriorityWeight[];
  
  // UI State
  activeTab: string;
  isValidating: boolean;
  isProcessing: boolean;
  
  // Actions
  runValidation: () => Promise<void>;
  applyCorrection: (suggestion: CorrectionSuggestion) => Promise<void>;
  exportConfiguration: () => Promise<void>;
}
```

## Common Patterns & Utilities

### Error Handling with Fallbacks
```typescript
const withFallback = async <T>(
  aiOperation: () => Promise<T>,
  fallbackOperation: () => T
): Promise<T> => {
  try {
    return await aiOperation();
  } catch (error) {
    console.warn('AI operation failed, using fallback:', error);
    return fallbackOperation();
  }
};
```

### Debounced Validation
```typescript
const useDebouncedValidation = (data: any[], delay = 1000) => {
  const [validationResult, setValidationResult] = useState(null);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      runValidation(data).then(setValidationResult);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [data, delay]);
  
  return validationResult;
};
```

### Progressive Enhancement
```typescript
const useProgressiveEnhancement = (data: any[]) => {
  const [basicResult, setBasicResult] = useState(null);
  const [enhancedResult, setEnhancedResult] = useState(null);
  
  useEffect(() => {
    // Immediate basic processing
    setBasicResult(processBasic(data));
    
    // AI enhancement in background
    processWithAI(data).then(setEnhancedResult);
  }, [data]);
  
  return enhancedResult || basicResult;
};
```

## Implementation Checklist

### Day 1: Foundation (Must-Have)
- [ ] Next.js project setup with TypeScript
- [ ] File upload component with drag & drop
- [ ] CSV/XLSX parsing utilities
- [ ] Basic data grid display
- [ ] Entity type definitions
- [ ] State management setup

### Day 2: AI & Validation (Should-Have)
- [ ] AI header mapping service
- [ ] Entity type auto-detection
- [ ] Core validation rules (8+ implemented)
- [ ] Real-time validation feedback
- [ ] Error highlighting in UI
- [ ] Natural language search interface

### Day 3: Rules & Export (Nice-to-Have)
- [ ] Visual rule builder interface
- [ ] Natural language to rules conversion
- [ ] Priority weights configuration
- [ ] Export system implementation
- [ ] Rules.json generation
- [ ] Data correction suggestions

## Performance Tips

### Data Handling
```typescript
// Use virtual scrolling for large datasets
import { useVirtualizer } from '@tanstack/react-virtual';

// Implement lazy loading
const useLazyData = (data: any[], pageSize = 100) => {
  const [page, setPage] = useState(0);
  return {
    visibleData: data.slice(0, (page + 1) * pageSize),
    loadMore: () => setPage(p => p + 1)
  };
};

// Memoize expensive computations
const expensiveResult = useMemo(() => computeHeavyTask(data), [data]);
```

### AI Optimization
```typescript
// Cache AI results
const cache = new Map<string, any>();

// Rate limiting
const rateLimiter = new RateLimiter({ requestsPerMinute: 60 });

// Batch processing
const batchProcess = async (items: any[], batchSize = 5) => {
  const batches = chunk(items, batchSize);
  return Promise.all(batches.map(batch => processBatch(batch)));
};
```

## Deployment Quick Setup

### Environment Variables
```bash
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=https://your-app-url.com
NODE_ENV=production
AI_CACHE_TTL=300000
AI_RATE_LIMIT=60
```

### Build & Deploy
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm run start

# Or deploy to Vercel
npx vercel --prod
```

## Testing Quick Setup

### Unit Test Example
```typescript
describe('ValidationEngine', () => {
  test('should detect duplicate IDs', () => {
    const engine = new ValidationEngine();
    engine.setData([{ ClientID: 'C1' }, { ClientID: 'C1' }], [], []);
    const { errors } = engine.validateAll();
    expect(errors.some(e => e.message.includes('Duplicate'))).toBe(true);
  });
});
```

### Integration Test Example
```typescript
test('complete workflow', async () => {
  render(<App />);
  
  // Upload file
  const file = new File(['ClientID,ClientName\nC001,Test'], 'test.csv');
  fireEvent.change(screen.getByRole('input'), { target: { files: [file] } });
  
  // Verify processing
  await waitFor(() => {
    expect(screen.getByText(/validation summary/i)).toBeInTheDocument();
  });
  
  // Check export readiness
  expect(screen.getByRole('button', { name: /export/i })).toBeEnabled();
});
```

## Success Criteria

### Technical Requirements
- File upload success rate > 95%
- AI header mapping accuracy > 80%
- Validation performance < 2 seconds for 1000 records
- Export generation < 5 seconds
- Zero critical bugs in core functionality

### User Experience Requirements
- Intuitive interface requiring minimal learning
- Clear error messages and guidance
- Responsive design across devices
- Loading states and progress indicators
- Graceful error handling with fallbacks

### AI Feature Requirements
- Header mapping confidence > 0.7
- Correction suggestion accuracy > 70%
- Natural language query success rate > 80%
- Fallback mechanisms working correctly

This quick reference guide provides all the essential information needed to understand, implement, and maintain the Data Alchemist application efficiently. 