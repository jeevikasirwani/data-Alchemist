# 🤖 AI-Powered Semantic Header Mapper with Hugging Face

This implementation uses **Hugging Face Transformers** for intelligent CSV header mapping. It can map wrongly named headers or rearranged columns to the correct data structure automatically.

## 🎯 Key Features

- **🤖 Hugging Face Powered**: Uses proven all-MiniLM-L6-v2 model
- **💰 Completely FREE**: No API costs, runs locally in your browser
- **🎯 High Accuracy**: 75%+ mapping confidence with multi-method matching
- **🧠 Smart AI**: Uses state-of-the-art embeddings for semantic understanding
- **🔄 Caching**: Intelligent caching for optimal performance
- **🛡️ Fallback Strategies**: Multiple matching methods with graceful degradation
- **📊 Comprehensive**: Pre-built schemas for clients, workers, and tasks

## 🚀 Quick Start

### 1. Setup

No API keys needed! Hugging Face runs locally in your browser.

### 2. Basic Usage

```typescript
import { createSemanticMatcher, getSchemaForEntityType } from './utils/ai-semantic-matcher';

// Initialize the matcher (no API key needed!)
const matcher = await createSemanticMatcher({
  modelName: 'Xenova/all-MiniLM-L6-v2',
  threshold: 0.75
});

const schema = getSchemaForEntityType('client');

// Map a messy header
const result = await matcher.findBestMatch('customer_name', schema);
console.log(result);
// Output: {
//   fieldName: 'ClientName',
//   confidence: 0.92,
//   method: 'semantic',
//   originalHeader: 'customer_name'
// }
```

### 3. Complete Integration

```typescript
import { AIHeaderMapper } from './utils/ai-header-mapper';

const mapper = new AIHeaderMapper();

// Auto-detect entity type and map headers
const messyHeaders = ['cust_id', 'Customer Name', 'PRIORITY_LVL'];
const detection = await mapper.detectEntityType(messyHeaders);
const mapping = await mapper.mapHeaders(messyHeaders, detection.entityType);

console.log(`Detected: ${detection.entityType} (${(detection.confidence * 100).toFixed(1)}%)`);
// Output: Detected: client (85.2%)
```

## 🔧 How It Works

### 1. Multiple Matching Methods

The semantic matcher uses a **4-tier matching strategy**:

1. **Exact Match** (100% confidence)
   ```
   'ClientID' → 'ClientID'
   ```

2. **Alias Match** (95% confidence)
   ```
   'client_id' → 'ClientID'
   'customer_id' → 'ClientID'
   ```

3. **Fuzzy Match** (70-90% confidence)
   ```
   'clientid' → 'ClientID'
   'custid' → 'ClientID'
   ```

4. **Semantic Match** (75%+ confidence) - **Using Hugging Face**
   ```
   'customer_identifier' → 'ClientID'
   'client_reference' → 'ClientID'
   ```

### 2. AI Entity Detection

Automatically detects whether your CSV contains clients, workers, or tasks:

```typescript
// Client CSV headers
['ClientID', 'ClientName', 'PriorityLevel'] → 'client' (95%)

// Worker CSV headers  
['WorkerID', 'Skills', 'AvailableSlots'] → 'worker' (92%)

// Task CSV headers
['TaskID', 'Duration', 'RequiredSkills'] → 'task' (88%)
```

## 🎮 Real-World Examples

### Example 1: Messy Client CSV

**Input Headers:**
```
CUSTOMER_ID, Customer Name, priority-level, Requested Tasks, group_tag
```

**AI Processing:**
```typescript
const mapper = new AIHeaderMapper();
const detection = await mapper.detectEntityType(headers);
// → Detected: client (87.3%)

const mapping = await mapper.mapHeaders(headers, 'client');
// Results:
// CUSTOMER_ID → ClientID (100%, alias)
// Customer Name → ClientName (95%, fuzzy) 
// priority-level → PriorityLevel (88%, semantic via Hugging Face)
// Requested Tasks → RequestedTaskIDs (82%, semantic via Hugging Face)
// group_tag → GroupTag (100%, alias)
```

## 💡 Simple Usage Tips

### 1. Basic Header Mapping
```typescript
// No API key needed - just go!
const matcher = await createSemanticMatcher({
  modelName: 'Xenova/all-MiniLM-L6-v2',
  threshold: 0.75
});

// Map headers one by one
const result = await matcher.findBestMatch('messy_header_name', schema);
```

### 2. Batch Processing
```typescript
// Process many headers at once
const results = await matcher.batchMatchHeaders([
  'cust_id', 'customer_name', 'priority_lvl'
], schema);
```

### 3. Performance Optimization
```typescript
// Enable caching for better performance
const matcher = await createSemanticMatcher({
  modelName: 'Xenova/all-MiniLM-L6-v2',
  cacheResults: true  // Faster repeat processing!
});
```

## 💰 Cost Information

- **Hugging Face Cost**: **COMPLETELY FREE!** 🎉
- **No API limits**: Process unlimited headers
- **Runs locally**: Your data never leaves your browser
- **Caching**: Makes repeat processing lightning fast

## 🛡️ Error Handling

Simple error handling with fallbacks:

```typescript
try {
  const result = await matcher.findBestMatch(header, schema);
  if (result && result.confidence > 0.8) {
    // High confidence - use the mapping
    applyMapping(result);
  } else {
    // Lower confidence - maybe ask user
    askUserForConfirmation(header, result);
  }
} catch (error) {
  console.log('AI failed, using simple matching:', error);
  // Automatic fallback to non-AI methods
}
```

## 🧪 Testing

Test your setup quickly:

```typescript
import { testSemanticMatcher } from './utils/test-semantic-matcher';

// Run tests to make sure everything works
await testSemanticMatcher();
```

## 🎯 Benefits of Using Hugging Face

✅ **Completely FREE**: No API costs ever  
✅ **Proven Quality**: Industry-standard embeddings  
✅ **Runs Locally**: No internet required after setup  
✅ **Privacy-Friendly**: Your data never leaves your browser  
✅ **Beginner-Friendly**: No payment barriers  
✅ **Reliable**: Works offline, no API downtime  

## 🔗 Integration with Your App

The semantic matcher works seamlessly with your existing Data Alchemist components:

- ✅ `FileUpload` component
- ✅ `DataGrid` component  
- ✅ `ValidationEngine`
- ✅ Export system

Just replace the header mapping logic and enjoy intelligent AI-powered header detection!

---

**🎉 Ready to make your CSV imports smarter with Hugging Face - for FREE!** 