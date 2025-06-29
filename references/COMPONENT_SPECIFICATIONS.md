# Component Specifications & Implementation Guide

## Table of Contents
1. [Component Implementation Specifications](#component-implementation-specifications)
2. [State Management Strategy](#state-management-strategy)
3. [API Layer Design](#api-layer-design)
4. [Validation System Deep Dive](#validation-system-deep-dive)
5. [AI Integration Patterns](#ai-integration-patterns)

---

## Component Implementation Specifications

### FileUpload Component

#### Interface Definition
```typescript
interface FileUploadProps {
  onFileUploaded: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxFileSize?: number;
  acceptedTypes?: string[];
  onError?: (error: FileUploadError) => void;
}

interface FileUploadState {
  isDragActive: boolean;
  isUploading: boolean;
  progress: number;
  files: UploadFile[];
  errors: FileUploadError[];
}

interface UploadFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  preview?: any[];
}
```

#### Implementation Strategy
```typescript
const FileUpload: React.FC<FileUploadProps> = ({
  onFileUploaded,
  maxFiles = 5,
  maxFileSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['.csv', '.xlsx', '.xls'],
  onError
}) => {
  // State management with useReducer for complex state
  const [state, dispatch] = useReducer(fileUploadReducer, initialState);

  // Drag and drop handlers
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    dispatch({ type: 'START_UPLOAD', files: acceptedFiles });
    
    try {
      // Validate files before processing
      const validatedFiles = await validateFiles(acceptedFiles);
      
      // Process files in parallel with progress tracking
      const processPromises = validatedFiles.map(async (file, index) => {
        return processFileWithProgress(file, (progress) => {
          dispatch({ type: 'UPDATE_PROGRESS', fileId: file.id, progress });
        });
      });
      
      const results = await Promise.all(processPromises);
      
      // Call parent handler with processed files
      await onFileUploaded(results);
      
      dispatch({ type: 'UPLOAD_SUCCESS' });
    } catch (error) {
      dispatch({ type: 'UPLOAD_ERROR', error });
      onError?.(error);
    }
  }, [onFileUploaded, onError]);

  // File validation logic
  const validateFiles = async (files: File[]): Promise<File[]> => {
    const errors: FileUploadError[] = [];
    
    files.forEach(file => {
      // Size validation
      if (file.size > maxFileSize) {
        errors.push({
          type: 'FILE_TOO_LARGE',
          message: `File ${file.name} is too large. Maximum size is ${formatBytes(maxFileSize)}`,
          file
        });
      }
      
      // Type validation
      const extension = file.name.toLowerCase().split('.').pop();
      if (!acceptedTypes.some(type => type.includes(extension || ''))) {
        errors.push({
          type: 'INVALID_TYPE',
          message: `File ${file.name} has invalid type. Accepted types: ${acceptedTypes.join(', ')}`,
          file
        });
      }
    });
    
    if (errors.length > 0) {
      throw new Error('File validation failed');
    }
    
    return files.filter(file => !errors.some(error => error.file === file));
  };

  return (
    <div className="file-upload-container">
      <Dropzone
        onDrop={onDrop}
        accept={acceptedTypes}
        maxFiles={maxFiles}
        disabled={state.isUploading}
      >
        {({ getRootProps, getInputProps, isDragActive }) => (
          <div
            {...getRootProps()}
            className={`dropzone ${isDragActive ? 'active' : ''} ${state.isUploading ? 'uploading' : ''}`}
          >
            <input {...getInputProps()} />
            <UploadUI state={state} isDragActive={isDragActive} />
          </div>
        )}
      </Dropzone>
      
      {state.files.length > 0 && (
        <FileProgress files={state.files} onRemove={removeFile} />
      )}
    </div>
  );
};
```

### DataGrid Component

#### Advanced Implementation
```typescript
interface DataGridProps {
  data: any[];
  entityType: EntityType;
  onDataChange: (data: any[], immediate?: boolean) => void;
  validationErrors: ValidationError[];
  allData: AppData;
  virtualScrolling?: boolean;
  bulkEditEnabled?: boolean;
}

const DataGrid: React.FC<DataGridProps> = ({
  data,
  entityType,
  onDataChange,
  validationErrors,
  allData,
  virtualScrolling = true,
  bulkEditEnabled = true
}) => {
  // Column configuration based on entity type
  const columns = useMemo(() => {
    return getEntityColumns(entityType, {
      onCellEdit: handleCellEdit,
      validationErrors,
      formatters: getColumnFormatters(entityType)
    });
  }, [entityType, validationErrors]);

  // Virtual scrolling implementation
  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50,
    overscan: 10,
  });

  // Inline editing with validation
  const handleCellEdit = useCallback(async (rowIndex: number, field: string, value: any) => {
    const updatedData = [...data];
    const oldValue = updatedData[rowIndex][field];
    
    // Optimistic update
    updatedData[rowIndex][field] = value;
    onDataChange(updatedData);
    
    // Validate the change
    try {
      const validation = await validateFieldChange(
        updatedData[rowIndex],
        field,
        value,
        oldValue,
        allData
      );
      
      if (!validation.isValid) {
        // Revert on validation failure
        updatedData[rowIndex][field] = oldValue;
        onDataChange(updatedData);
        showValidationError(validation.errors);
      }
    } catch (error) {
      // Handle validation error
      console.error('Validation failed:', error);
    }
  }, [data, onDataChange, allData]);

  // Bulk operations
  const handleBulkEdit = useCallback((selectedRows: number[], updates: Partial<any>) => {
    const updatedData = [...data];
    selectedRows.forEach(rowIndex => {
      Object.assign(updatedData[rowIndex], updates);
    });
    onDataChange(updatedData, true); // Immediate validation for bulk changes
  }, [data, onDataChange]);

  return (
    <div className="data-grid-container">
      {/* Grid toolbar */}
      <DataGridToolbar
        data={data}
        selectedRows={selectedRows}
        onBulkEdit={bulkEditEnabled ? handleBulkEdit : undefined}
        onExport={handleExport}
        entityType={entityType}
      />
      
      {/* Virtual scrolled grid */}
      <div ref={parentRef} className="grid-viewport">
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => (
            <DataGridRow
              key={virtualRow.index}
              row={data[virtualRow.index]}
              columns={columns}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              validationErrors={getRowErrors(virtualRow.index)}
              onCellEdit={handleCellEdit}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
```

### RuleBuilder Component

#### Natural Language Integration
```typescript
const RuleBuilder: React.FC<RuleBuilderProps> = ({
  rules,
  onRulesChange,
  appData,
  onGenerateConfig
}) => {
  const [naturalLanguageInput, setNaturalLanguageInput] = useState('');
  const [isProcessingNL, setIsProcessingNL] = useState(false);
  const [selectedRuleType, setSelectedRuleType] = useState<RuleType>('coRun');

  // AI-powered natural language to rule conversion
  const handleNaturalLanguageSubmit = async () => {
    if (!naturalLanguageInput.trim()) return;
    
    setIsProcessingNL(true);
    try {
      const aiRuleGenerator = new AIRuleGenerator();
      const generatedRule = await aiRuleGenerator.convertNaturalLanguageToRule(
        naturalLanguageInput,
        appData,
        rules // Context of existing rules
      );
      
      if (generatedRule.confidence > 0.7) {
        // High confidence - add rule directly
        const newRule: BusinessRule = {
          id: generateId(),
          ...generatedRule.rule,
          created: new Date(),
          lastModified: new Date(),
          enabled: true
        };
        
        onRulesChange([...rules, newRule]);
        setNaturalLanguageInput('');
        
        showNotification({
          type: 'success',
          message: `Rule created: ${newRule.name}`,
          description: `Confidence: ${(generatedRule.confidence * 100).toFixed(0)}%`
        });
      } else {
        // Lower confidence - show for review
        showRulePreview(generatedRule);
      }
    } catch (error) {
      showNotification({
        type: 'error',
        message: 'Failed to parse natural language rule',
        description: 'Please try rephrasing or use the visual rule builder'
      });
    } finally {
      setIsProcessingNL(false);
    }
  };

  // Visual rule builder for specific rule types
  const renderRuleBuilder = (ruleType: RuleType) => {
    switch (ruleType) {
      case 'coRun':
        return (
          <CoRunRuleBuilder
            appData={appData}
            onRuleCreate={(rule) => addRule(rule)}
          />
        );
      case 'slotRestriction':
        return (
          <SlotRestrictionBuilder
            appData={appData}
            onRuleCreate={(rule) => addRule(rule)}
          />
        );
      case 'loadLimit':
        return (
          <LoadLimitBuilder
            appData={appData}
            onRuleCreate={(rule) => addRule(rule)}
          />
        );
      default:
        return <GenericRuleBuilder ruleType={ruleType} onRuleCreate={addRule} />;
    }
  };

  return (
    <div className="rule-builder">
      {/* Natural Language Interface */}
      <Card title="🤖 Natural Language Rule Creator">
        <div className="nl-rule-input">
          <TextArea
            value={naturalLanguageInput}
            onChange={(e) => setNaturalLanguageInput(e.target.value)}
            placeholder="Example: Tasks T12 and T14 should always run together in the same phase"
            rows={3}
            disabled={isProcessingNL}
          />
          <Button
            type="primary"
            onClick={handleNaturalLanguageSubmit}
            loading={isProcessingNL}
            disabled={!naturalLanguageInput.trim()}
          >
            Generate Rule
          </Button>
        </div>
        
        <div className="nl-examples">
          <h4>Example phrases:</h4>
          <ul>
            <li>"Sales workers should not be assigned more than 3 tasks per phase"</li>
            <li>"Tasks requiring Python skills must be assigned to Senior workers"</li>
            <li>"Client C001 tasks should be prioritized in phases 1-3"</li>
          </ul>
        </div>
      </Card>

      {/* Visual Rule Builder */}
      <Card title="⚙️ Visual Rule Builder">
        <Tabs activeKey={selectedRuleType} onChange={setSelectedRuleType}>
          <TabPane tab="Co-run Rules" key="coRun">
            {renderRuleBuilder('coRun')}
          </TabPane>
          <TabPane tab="Slot Restrictions" key="slotRestriction">
            {renderRuleBuilder('slotRestriction')}
          </TabPane>
          <TabPane tab="Load Limits" key="loadLimit">
            {renderRuleBuilder('loadLimit')}
          </TabPane>
          <TabPane tab="Phase Windows" key="phaseWindow">
            {renderRuleBuilder('phaseWindow')}
          </TabPane>
        </Tabs>
      </Card>

      {/* Rules List */}
      <Card title={`Current Rules (${rules.filter(r => r.enabled).length} active)`}>
        <RulesList
          rules={rules}
          onToggle={toggleRule}
          onEdit={editRule}
          onDelete={deleteRule}
          appData={appData}
        />
      </Card>
    </div>
  );
};
```

---

## State Management Strategy

### Zustand Store Implementation
```typescript
interface AppStore {
  // Data state
  appData: AppData;
  setAppData: (data: AppData) => void;
  updateEntityData: (entityType: EntityType, data: any[]) => void;
  
  // Validation state
  validationErrors: ValidationError[];
  validationSummary: ValidationSummary | null;
  setValidationErrors: (errors: ValidationError[]) => void;
  setValidationSummary: (summary: ValidationSummary | null) => void;
  
  // AI state
  headerMappings: MappingResult[];
  correctionSuggestions: CorrectionSuggestion[];
  queryResults: QueryResult | null;
  setHeaderMappings: (mappings: MappingResult[]) => void;
  setCorrectionSuggestions: (suggestions: CorrectionSuggestion[]) => void;
  
  // Rules and priorities
  businessRules: BusinessRule[];
  priorityWeights: PriorityWeight[];
  setBusinessRules: (rules: BusinessRule[]) => void;
  setPriorityWeights: (weights: PriorityWeight[]) => void;
  
  // UI state
  activeTab: string;
  isValidating: boolean;
  isProcessing: boolean;
  setActiveTab: (tab: string) => void;
  setIsValidating: (validating: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  
  // Actions
  runValidation: () => Promise<void>;
  applyCorrection: (suggestion: CorrectionSuggestion) => Promise<void>;
  exportConfiguration: () => Promise<void>;
}

const useAppStore = create<AppStore>((set, get) => ({
  // Initial state
  appData: { clients: [], workers: [], tasks: [] },
  validationErrors: [],
  validationSummary: null,
  headerMappings: [],
  correctionSuggestions: [],
  queryResults: null,
  businessRules: [],
  priorityWeights: [],
  activeTab: 'client',
  isValidating: false,
  isProcessing: false,

  // Setters
  setAppData: (data) => set({ appData: data }),
  updateEntityData: (entityType, data) =>
    set((state) => ({
      appData: {
        ...state.appData,
        [`${entityType}s`]: data
      }
    })),
  
  // Complex actions
  runValidation: async () => {
    const { appData, setValidationErrors, setValidationSummary, setIsValidating } = get();
    
    setIsValidating(true);
    try {
      const validationEngine = new ValidationEngine();
      validationEngine.setData(appData.clients, appData.workers, appData.tasks);
      const { errors, summary } = validationEngine.validateAll();
      
      setValidationErrors(errors);
      setValidationSummary(summary);
      
      // Generate AI corrections for critical errors
      if (errors.some(e => e.severity === 'critical')) {
        const aiCorrector = new AIDataCorrector();
        const suggestions = await aiCorrector.suggestCorrections(
          appData,
          errors.filter(e => e.severity === 'critical')
        );
        set({ correctionSuggestions: suggestions });
      }
    } finally {
      setIsValidating(false);
    }
  },

  applyCorrection: async (suggestion) => {
    const { appData, updateEntityData, runValidation } = get();
    
    try {
      const aiCorrector = new AIDataCorrector();
      const correctedData = await aiCorrector.applyCorrection(
        appData[`${suggestion.error.entityType}s`],
        suggestion
      );
      
      updateEntityData(suggestion.error.entityType, correctedData);
      
      // Remove applied suggestion
      set((state) => ({
        correctionSuggestions: state.correctionSuggestions.filter(s => s.id !== suggestion.id)
      }));
      
      // Re-run validation
      await runValidation();
    } catch (error) {
      console.error('Failed to apply correction:', error);
    }
  }
}));
```

---

## API Layer Design

### AI Service Integration
```typescript
class AIServiceManager {
  private services: Map<string, AIService> = new Map();
  private rateLimiter: RateLimiter;
  private cache: Cache;

  constructor() {
    this.rateLimiter = new RateLimiter({ requestsPerMinute: 60 });
    this.cache = new Cache({ ttl: 300000 }); // 5 minute cache
    
    // Initialize services
    this.services.set('openai', new OpenAIService());
    this.services.set('custom', new CustomModelService());
  }

  async processRequest<T>(
    serviceName: string,
    operation: string,
    payload: any,
    options: RequestOptions = {}
  ): Promise<T> {
    const cacheKey = this.generateCacheKey(serviceName, operation, payload);
    
    // Try cache first
    if (options.useCache !== false) {
      const cached = await this.cache.get<T>(cacheKey);
      if (cached) return cached;
    }
    
    // Rate limiting
    await this.rateLimiter.waitForAvailability();
    
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    try {
      const result = await service.processRequest({ operation, payload, ...options });
      
      // Cache successful results
      if (options.useCache !== false) {
        await this.cache.set(cacheKey, result);
      }
      
      return result;
    } catch (error) {
      // Implement fallback strategies
      if (options.fallback) {
        return await this.processFallback(operation, payload, options.fallback);
      }
      throw error;
    }
  }

  // Specific AI operations
  async mapHeaders(headers: string[], entityType: EntityType): Promise<MappingResult> {
    return this.processRequest('openai', 'mapHeaders', { headers, entityType }, {
      timeout: 10000,
      fallback: () => this.basicHeaderMapping(headers, entityType)
    });
  }

  async suggestCorrections(
    data: any[],
    errors: ValidationError[],
    entityType: EntityType
  ): Promise<CorrectionSuggestion[]> {
    return this.processRequest('openai', 'suggestCorrections', {
      data: data.slice(0, 10), // Limit data size for performance
      errors,
      entityType
    }, {
      timeout: 15000,
      fallback: () => this.basicCorrections(errors)
    });
  }

  async processNaturalQuery(query: string, data: AppData): Promise<QueryResult> {
    return this.processRequest('openai', 'processQuery', { query, data }, {
      timeout: 8000,
      useCache: true
    });
  }

  private generateCacheKey(serviceName: string, operation: string, payload: any): string {
    return `${serviceName}:${operation}:${hashObject(payload)}`;
  }
}
```

### Validation Service Architecture
```typescript
class ValidationService {
  private rules: ValidationRule[] = [];
  private engine: ValidationEngine;
  
  constructor() {
    this.engine = new ValidationEngine();
    this.initializeRules();
  }

  private initializeRules() {
    // Core validation rules
    this.rules = [
      new RequiredFieldRule(),
      new DuplicateIDRule(),
      new DataTypeRule(),
      new RangeValidationRule(),
      new CrossReferenceRule(),
      new BusinessLogicRule(),
      new JSONValidationRule(),
      new CircularDependencyRule(),
      new ResourceConstraintRule(),
      new SkillCoverageRule(),
      new PhaseSlotRule(),
      new ConcurrencyRule()
    ];
  }

  async validateData(appData: AppData): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      // Run validation rules in parallel where possible
      const validationPromises = this.rules.map(async (rule) => {
        try {
          return await rule.validate(appData);
        } catch (error) {
          console.error(`Validation rule ${rule.name} failed:`, error);
          return { errors: [], warnings: [] };
        }
      });
      
      const results = await Promise.all(validationPromises);
      
      // Aggregate results
      const errors: ValidationError[] = [];
      const warnings: ValidationError[] = [];
      
      results.forEach(result => {
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      });
      
      // Generate summary
      const summary = this.generateSummary(errors, warnings, appData);
      
      const endTime = performance.now();
      
      return {
        errors,
        warnings,
        summary,
        performance: {
          duration: endTime - startTime,
          rulesExecuted: this.rules.length,
          timestamp: new Date()
        }
      };
    } catch (error) {
      throw new ValidationServiceError('Validation failed', error);
    }
  }

  private generateSummary(
    errors: ValidationError[],
    warnings: ValidationError[],
    appData: AppData
  ): ValidationSummary {
    const errorsByType = errors.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const totalRecords = appData.clients.length + appData.workers.length + appData.tasks.length;
    const recordsWithErrors = new Set([
      ...errors.map(e => `${e.entityType}:${e.entityId}`),
      ...warnings.map(w => `${w.entityType}:${w.entityId}`)
    ]).size;

    return {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      errorsByType,
      completionRate: totalRecords > 0 ? (totalRecords - recordsWithErrors) / totalRecords : 1,
      lastValidated: new Date(),
      criticalIssues: errors.filter(e => e.severity === 'critical').length,
      readyForExport: errors.filter(e => e.severity === 'critical').length === 0
    };
  }
}
```

This component specification provides detailed implementation patterns, state management strategies, and API layer designs that form the foundation of the Data Alchemist application. 