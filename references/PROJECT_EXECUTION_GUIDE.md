# 🚀 Project Execution Guide: Data Alchemist

## Executive Summary
This guide provides a practical, step-by-step approach to building the Data Alchemist application within the 3-day timeline, with focus on delivering a functional MVP that demonstrates AI-powered data processing capabilities.

## Day-by-Day Execution Plan

### Day 1: Foundation & Core Features (8-10 hours)

#### Morning (4 hours): Project Setup & Infrastructure
```bash
# Hour 1: Project initialization
npx create-next-app@latest dataa --typescript --tailwind --eslint --app
cd dataa
npm install @types/node @types/react @types/react-dom

# Hour 2: Core dependencies
npm install papaparse xlsx react-dropzone zustand @tanstack/react-table
npm install @types/papaparse lucide-react clsx tailwind-merge

# Hour 3: AI dependencies
npm install openai @ai-sdk/openai ai

# Hour 4: Development tools
npm install -D @types/jest jest @testing-library/react @testing-library/jest-dom
```

#### Implementation Priority Stack
```typescript
// Hour 1-2: Core Structure
1. ✅ Basic Next.js setup with TypeScript
2. ✅ Tailwind CSS configuration
3. ✅ File structure organization
4. ✅ Environment configuration

// Hour 3-4: Data Layer
5. 📋 CSV/XLSX parsing utilities
6. 📋 Basic data transformation
7. 📋 Entity type definitions
8. 📋 State management setup
```

#### Afternoon (4-6 hours): Core Data Processing
```typescript
// File: src/utils/parsers.ts - Priority 1
export async function parseCSV(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error)
    });
  });
}

// File: src/components/FileUpload.tsx - Priority 2
const FileUpload = ({ onFileUploaded }) => {
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const parsedFiles = await Promise.all(
      acceptedFiles.map(async (file) => {
        const data = file.name.endsWith('.csv') 
          ? await parseCSV(file)
          : await parseExcel(file);
        return { file, data };
      })
    );
    onFileUploaded(parsedFiles);
  }, [onFileUploaded]);

  return (
    <Dropzone onDrop={onDrop} accept={{'.csv': [], '.xlsx': []}}>
      {/* Implementation */}
    </Dropzone>
  );
};

// File: src/components/DataGrid.tsx - Priority 3
const DataGrid = ({ data, entityType, onDataChange, validationErrors }) => {
  const columns = useMemo(() => getEntityColumns(entityType), [entityType]);
  
  return (
    <div className="data-grid">
      <table className="w-full border-collapse">
        <thead>
          {columns.map(col => (
            <th key={col.id} className="border p-2 bg-gray-100">
              {col.header}
            </th>
          ))}
        </thead>
        <tbody>
          {data.map((row, index) => (
            <DataRow 
              key={index} 
              row={row} 
              columns={columns}
              errors={validationErrors.filter(e => e.entityId === row.id)}
              onEdit={(field, value) => {
                const updated = [...data];
                updated[index][field] = value;
                onDataChange(updated);
              }}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

### Day 2: AI Integration & Validation (8-10 hours)

#### Morning (4 hours): AI Header Mapping
```typescript
// File: src/utils/ai-header-mapper.ts
class AIHeaderMapper {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      dangerouslyAllowBrowser: true // For client-side demo
    });
  }

  async detectEntityType(headers: string[]): Promise<EntityDetection> {
    const prompt = `
Analyze these headers and identify the entity type:
Headers: ${headers.join(', ')}

Return JSON: {"entityType": "client|worker|task", "confidence": 0.9}
    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Use 3.5 for speed and cost
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 100
      });

      return JSON.parse(response.choices[0].message.content || '{}');
    } catch (error) {
      // Fallback to simple keyword detection
      return this.fallbackEntityDetection(headers);
    }
  }

  private fallbackEntityDetection(headers: string[]): EntityDetection {
    const headerStr = headers.join(' ').toLowerCase();
    if (headerStr.includes('client')) return { entityType: 'client', confidence: 0.8 };
    if (headerStr.includes('worker')) return { entityType: 'worker', confidence: 0.8 };
    if (headerStr.includes('task')) return { entityType: 'task', confidence: 0.8 };
    return { entityType: 'client', confidence: 0.5 };
  }
}
```

#### Afternoon (4-6 hours): Validation System
```typescript
// File: src/utils/validation.ts
export class ValidationEngine {
  private data: AppData = { clients: [], workers: [], tasks: [] };

  setData(clients: any[], workers: any[], tasks: any[]) {
    this.data = { clients, workers, tasks };
  }

  validateAll(): { errors: ValidationError[], summary: ValidationSummary } {
    const errors: ValidationError[] = [];
    
    // Run all validation rules
    errors.push(...this.validateRequiredFields());
    errors.push(...this.validateDuplicateIDs());
    errors.push(...this.validateDataTypes());
    errors.push(...this.validateReferences());
    errors.push(...this.validateRanges());
    errors.push(...this.validateJSON());
    errors.push(...this.validateSkillCoverage());
    errors.push(...this.validatePhaseConstraints());

    const summary = this.generateSummary(errors);
    return { errors, summary };
  }

  private validateRequiredFields(): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Client validation
    this.data.clients.forEach((client, index) => {
      if (!client.ClientID) {
        errors.push({
          id: `client-${index}-clientid`,
          entityType: 'client',
          entityId: client.ClientID || `row-${index}`,
          field: 'ClientID',
          type: 'error',
          severity: 'critical',
          message: 'ClientID is required'
        });
      }
      
      if (!client.PriorityLevel || client.PriorityLevel < 1 || client.PriorityLevel > 5) {
        errors.push({
          id: `client-${index}-priority`,
          entityType: 'client',
          entityId: client.ClientID || `row-${index}`,
          field: 'PriorityLevel',
          type: 'error',
          severity: 'high',
          message: 'PriorityLevel must be between 1-5'
        });
      }
    });

    // Similar validation for workers and tasks...
    return errors;
  }

  private validateDuplicateIDs(): ValidationError[] {
    const errors: ValidationError[] = [];
    
    // Check client duplicates
    const clientIds = new Set();
    this.data.clients.forEach((client, index) => {
      if (clientIds.has(client.ClientID)) {
        errors.push({
          id: `client-${index}-duplicate`,
          entityType: 'client',
          entityId: client.ClientID,
          field: 'ClientID',
          type: 'error',
          severity: 'critical',
          message: `Duplicate ClientID: ${client.ClientID}`
        });
      }
      clientIds.add(client.ClientID);
    });

    return errors;
  }
}
```

### Day 3: Business Rules & Polish (8-10 hours)

#### Morning (4 hours): Rule Builder Implementation
```typescript
// File: src/components/RuleBuilder.tsx
const RuleBuilder = ({ rules, onRulesChange, appData }) => {
  const [ruleType, setRuleType] = useState<RuleType>('coRun');
  const [naturalInput, setNaturalInput] = useState('');

  const handleCreateRule = (rule: BusinessRule) => {
    onRulesChange([...rules, { ...rule, id: generateId(), enabled: true }]);
  };

  const handleNaturalLanguageRule = async () => {
    try {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{
          role: "user",
          content: `Convert this rule to JSON format: "${naturalInput}"
          
Context: We have clients, workers, and tasks data.
Rule types: coRun, slotRestriction, loadLimit, phaseWindow

Return: {"type": "coRun", "name": "Rule name", "parameters": {...}}`
        }],
        temperature: 0.2,
        max_tokens: 500
      });

      const generatedRule = JSON.parse(response.choices[0].message.content);
      handleCreateRule(generatedRule);
      setNaturalInput('');
    } catch (error) {
      console.error('Failed to generate rule:', error);
    }
  };

  return (
    <div className="rule-builder p-6">
      {/* Natural Language Input */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">🤖 Natural Language Rules</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={naturalInput}
            onChange={(e) => setNaturalInput(e.target.value)}
            placeholder="e.g., Tasks T1 and T2 should run together"
            className="flex-1 p-2 border rounded"
          />
          <button
            onClick={handleNaturalLanguageRule}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Generate Rule
          </button>
        </div>
      </div>

      {/* Visual Rule Builder */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">⚙️ Visual Rule Builder</h3>
        <select 
          value={ruleType} 
          onChange={(e) => setRuleType(e.target.value as RuleType)}
          className="mb-4 p-2 border rounded"
        >
          <option value="coRun">Co-run Rules</option>
          <option value="slotRestriction">Slot Restrictions</option>
          <option value="loadLimit">Load Limits</option>
          <option value="phaseWindow">Phase Windows</option>
        </select>
        
        {ruleType === 'coRun' && (
          <CoRunBuilder appData={appData} onRuleCreate={handleCreateRule} />
        )}
      </div>

      {/* Rules List */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Current Rules</h3>
        <div className="space-y-2">
          {rules.map(rule => (
            <div key={rule.id} className="p-3 border rounded flex justify-between items-center">
              <div>
                <span className="font-medium">{rule.name}</span>
                <span className="text-sm text-gray-600 ml-2">({rule.type})</span>
              </div>
              <button
                onClick={() => onRulesChange(rules.filter(r => r.id !== rule.id))}
                className="text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### Afternoon (4-6 hours): Export System & Final Polish
```typescript
// File: src/components/ExportSystem.tsx
const ExportSystem = ({ appData, rules, priorities, validationSummary }) => {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      // Generate clean CSV files
      const clientsCSV = Papa.unparse(appData.clients);
      const workersCSV = Papa.unparse(appData.workers);
      const tasksCSV = Papa.unparse(appData.tasks);
      
      // Generate rules configuration
      const rulesConfig = {
        rules: rules.filter(r => r.enabled),
        priorities,
        metadata: {
          generatedAt: new Date().toISOString(),
          dataQuality: validationSummary,
          version: '1.0.0'
        }
      };
      
      // Create downloads
      downloadFile(clientsCSV, 'clients_cleaned.csv', 'text/csv');
      downloadFile(workersCSV, 'workers_cleaned.csv', 'text/csv');
      downloadFile(tasksCSV, 'tasks_cleaned.csv', 'text/csv');
      downloadFile(
        JSON.stringify(rulesConfig, null, 2), 
        'rules_config.json', 
        'application/json'
      );
      
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const canExport = validationSummary?.totalErrors === 0;

  return (
    <div className="export-system p-6">
      <h2 className="text-2xl font-bold mb-4">📤 Export & Deploy</h2>
      
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Export Status</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>Total Records: {appData.clients.length + appData.workers.length + appData.tasks.length}</div>
          <div>Active Rules: {rules.filter(r => r.enabled).length}</div>
          <div>Data Quality: {((validationSummary?.completionRate || 0) * 100).toFixed(1)}%</div>
          <div>Status: {canExport ? '✅ Ready' : '⚠️ Has Errors'}</div>
        </div>
      </div>

      {!canExport && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">
            Please fix all validation errors before exporting. 
            Current errors: {validationSummary?.totalErrors || 0}
          </p>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={!canExport || isExporting}
        className={`px-6 py-3 rounded-lg font-medium ${
          canExport 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : 'bg-gray-300 text-gray-600 cursor-not-allowed'
        }`}
      >
        {isExporting ? 'Exporting...' : 'Export Configuration'}
      </button>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Export includes:</p>
        <ul className="list-disc list-inside ml-4">
          <li>Clean CSV files for each entity type</li>
          <li>Business rules configuration (JSON)</li>
          <li>Priority weights and settings</li>
          <li>Data quality metadata</li>
        </ul>
      </div>
    </div>
  );
};
```

## Implementation Strategy & Tips

### 1. Development Approach

#### MVP-First Strategy
```typescript
// Priority 1: Core functionality (Must-have)
const coreFunctionality = [
  'File upload and parsing',
  'Basic data display',
  'Simple validation',
  'Export functionality'
];

// Priority 2: AI features (Should-have)
const aiFeatures = [
  'Header mapping',
  'Data correction suggestions',
  'Natural language search'
];

// Priority 3: Advanced features (Nice-to-have)
const advancedFeatures = [
  'Real-time collaboration',
  'Advanced analytics',
  'Custom rule types'
];
```

#### Risk Mitigation
```typescript
// Always have fallbacks for AI features
const withFallback = async (aiFunction, fallbackFunction) => {
  try {
    return await aiFunction();
  } catch (error) {
    console.warn('AI function failed, using fallback:', error);
    return fallbackFunction();
  }
};

// Progressive enhancement approach
const progressiveEnhancement = {
  basic: 'Works without AI',
  enhanced: 'Better with AI',
  optimal: 'AI-powered experience'
};
```

### 2. Performance Optimization

#### Data Handling Best Practices
```typescript
// Lazy loading for large datasets
const useLazyData = (data: any[], pageSize = 100) => {
  const [page, setPage] = useState(0);
  const visibleData = useMemo(() => 
    data.slice(0, (page + 1) * pageSize), 
    [data, page, pageSize]
  );
  
  return { visibleData, loadMore: () => setPage(p => p + 1) };
};

// Debounced validation
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

// Memoized expensive computations
const useExpensiveComputation = (data: any[]) => {
  return useMemo(() => {
    return computeExpensiveResult(data);
  }, [data]);
};
```

### 3. Testing Strategy

#### Component Testing
```typescript
// File: src/__tests__/FileUpload.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FileUpload from '../components/FileUpload';

describe('FileUpload', () => {
  test('handles CSV file upload', async () => {
    const mockOnFileUploaded = jest.fn();
    render(<FileUpload onFileUploaded={mockOnFileUploaded} />);
    
    const file = new File(['ClientID,ClientName\nC001,Test Client'], 'test.csv', {
      type: 'text/csv'
    });
    
    const input = screen.getByLabelText(/upload/i);
    fireEvent.change(input, { target: { files: [file] } });
    
    await waitFor(() => {
      expect(mockOnFileUploaded).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            file: expect.any(File),
            data: expect.arrayContaining([
              expect.objectContaining({
                ClientID: 'C001',
                ClientName: 'Test Client'
              })
            ])
          })
        ])
      );
    });
  });
});
```

#### Integration Testing
```typescript
// File: src/__tests__/integration/DataProcessing.test.tsx
describe('Data Processing Integration', () => {
  test('complete data processing workflow', async () => {
    const { getByText, getByRole } = render(<App />);
    
    // Upload file
    const fileInput = getByRole('button', { name: /upload/i });
    fireEvent.click(fileInput);
    
    // Wait for processing
    await waitFor(() => {
      expect(getByText(/processing/i)).toBeInTheDocument();
    });
    
    // Check validation results
    await waitFor(() => {
      expect(getByText(/validation summary/i)).toBeInTheDocument();
    });
    
    // Verify export availability
    const exportButton = getByRole('button', { name: /export/i });
    expect(exportButton).toBeEnabled();
  });
});
```

### 4. Deployment Checklist

#### Environment Setup
```bash
# Environment variables
OPENAI_API_KEY=your_api_key_here
NEXT_PUBLIC_APP_URL=https://your-app-url.com
NODE_ENV=production

# Build and deploy
npm run build
npm run start

# Or deploy to Vercel
npx vercel --prod
```

#### Production Optimizations
```typescript
// File: next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: [],
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Performance optimizations
  swcMinify: true,
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
};

module.exports = nextConfig;
```

## Success Metrics & Evaluation

### Technical Metrics
- [ ] File upload success rate > 95%
- [ ] AI header mapping accuracy > 80%
- [ ] Validation performance < 2 seconds for 1000 records
- [ ] Export generation < 5 seconds
- [ ] Zero critical bugs in core functionality

### User Experience Metrics
- [ ] Intuitive interface requiring minimal learning
- [ ] Clear error messages and guidance
- [ ] Responsive design across devices
- [ ] Loading states and progress indicators
- [ ] Graceful error handling

### AI Feature Metrics
- [ ] Header mapping confidence > 0.7
- [ ] Correction suggestion accuracy > 70%
- [ ] Natural language query success rate > 80%
- [ ] Fallback mechanisms working correctly

This execution guide provides a realistic roadmap for delivering a functional Data Alchemist application within the 3-day timeline while maintaining high code quality and user experience standards. 