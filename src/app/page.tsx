'use client';

import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import DataGrid from '../components/DataGrid';
import { parseCSV, parseExcel, transformClientData, transformWorkerData, transformTaskData } from '../utils/parsers';
import { ValidationEngine, ValidationError, ValidationSummary } from '../utils/validation';
import { AIHeaderMapper, MappingResult } from '../utils/ai-header-mapper';
import { AIDataCorrector, CorrectionSuggestion } from '../utils/ai-data-corrector';
import { AIQueryProcessor, QueryResult } from '../utils/ai-query-processor';

type EntityType = 'client' | 'worker' | 'task';

interface AppData {
    clients: any[];
    workers: any[];
    tasks: any[];
}

export default function Home() {
    const [appData, setAppData] = useState<AppData>({ clients: [], workers: [], tasks: [] });
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
    const [activeTab, setActiveTab] = useState<EntityType>('client');
    const [isValidating, setIsValidating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    
    // AI Components
    const [headerMappings, setHeaderMappings] = useState<MappingResult[]>([]);
    const [correctionSuggestions, setCorrectionSuggestions] = useState<CorrectionSuggestion[]>([]);
    const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
    const [naturalQuery, setNaturalQuery] = useState('');
    const [showQueryInterface, setShowQueryInterface] = useState(false);

    const validationEngine = new ValidationEngine();
    const aiHeaderMapper = new AIHeaderMapper();
    const aiDataCorrector = new AIDataCorrector();
    const aiQueryProcessor = new AIQueryProcessor();

    const detectEntityType = (headers: string[]): EntityType => {
        const headerStr = headers.join(' ').toLowerCase();
        
        if (headerStr.includes('clientid') || headerStr.includes('client_name')) return 'client';
        if (headerStr.includes('workerid') || headerStr.includes('worker_name')) return 'worker';
        if (headerStr.includes('taskid') || headerStr.includes('task_name')) return 'task';
        
        return 'client'; // default
    };

    const handleFileUpload = async (files: File[]) => {
        setIsProcessing(true);
        const newData = { ...appData };
        const newMappings: MappingResult[] = [];
        
        try {
            // Process all files in parallel for better performance
            const fileProcessingPromises = files.map(async (file) => {
                try {
                    let rawData: any[];
                    
                    if (file.name.endsWith('.csv')) {
                        rawData = await parseCSV(file);
                    } else {
                        rawData = await parseExcel(file);
                    }

                    if (rawData.length > 0) {
                        const headers = Object.keys(rawData[0]);
                        
                        // AI Header Mapping (optimized)
                        const entityDetection = await aiHeaderMapper.detectEntityType(headers);
                        const mappingResult = await aiHeaderMapper.mapHeaders(headers, entityDetection.entityType);
                        
                        console.log(`AI detected entity type: ${entityDetection.entityType} (confidence: ${entityDetection.confidence.toFixed(2)})`);
                        console.log(`AI mapped ${Object.keys(mappingResult.mappings).length} headers with confidence: ${mappingResult.confidence.toFixed(2)}`);
                        
                        // Apply AI mappings to data
                        const mappedData = rawData.map(row => {
                            const mappedRow: any = {};
                            Object.keys(row).forEach(header => {
                                const mapping = mappingResult.mappings[header];
                                if (mapping) {
                                    mappedRow[mapping.expectedHeader] = row[header];
                                } else {
                                    mappedRow[header] = row[header]; // Keep original if not mapped
                                }
                            });
                            return mappedRow;
                        });
                        
                        let transformedData: any[];
                        switch (entityDetection.entityType) {
                            case 'client':
                                transformedData = transformClientData(mappedData);
                                break;
                            case 'worker':
                                transformedData = transformWorkerData(mappedData);
                                break;
                            case 'task':
                                transformedData = transformTaskData(mappedData);
                                break;
                            default:
                                transformedData = [];
                        }
                        
                        return {
                            entityType: entityDetection.entityType,
                            data: transformedData,
                            mapping: mappingResult
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    return null;
                }
            });

            // Wait for all files to be processed
            const results = await Promise.all(fileProcessingPromises);
            
            // Merge results into newData
            results.forEach(result => {
                if (result) {
                    newMappings.push(result.mapping);
                    switch (result.entityType) {
                        case 'client':
                            newData.clients = [...newData.clients, ...result.data];
                            break;
                        case 'worker':
                            newData.workers = [...newData.workers, ...result.data];
                            break;
                        case 'task':
                            newData.tasks = [...newData.tasks, ...result.data];
                            break;
                    }
                }
            });
            
        } catch (error) {
            console.error('Error processing files:', error);
        }
        
        setAppData(newData);
        setHeaderMappings(newMappings);
        setIsProcessing(false);
        
        // Defer validation to avoid blocking UI
        setTimeout(() => runValidation(newData), 100);
    };

    const runValidation = async (data: AppData) => {
        setIsValidating(true);
        
        try {
            validationEngine.setData(data.clients, data.workers, data.tasks);
            const { errors, summary } = validationEngine.validateAll();
            
            setValidationErrors(errors);
            setValidationSummary(summary);
            
            // Optimize AI Data Correction Suggestions - run in background and only for critical errors
            const criticalErrors = errors.filter(e => e.type === 'error' && 
                (e.message.includes('required') || e.message.includes('Duplicate')));
            
            if (criticalErrors.length > 0 && criticalErrors.length < 10) { // Only run AI for manageable number of critical errors
                setTimeout(async () => {
                    try {
                        const suggestions: CorrectionSuggestion[] = [];
                        const entityGroups = {
                            client: criticalErrors.filter(e => e.entityType === 'client'),
                            worker: criticalErrors.filter(e => e.entityType === 'worker'),
                            task: criticalErrors.filter(e => e.entityType === 'task')
                        };
                        
                        // Process suggestions in parallel for better performance
                        const suggestionPromises = Object.entries(entityGroups).map(async ([entityType, entityErrors]) => {
                            if (entityErrors.length > 0) {
                                const entityData = data[`${entityType}s` as keyof AppData];
                                if (Array.isArray(entityData) && entityData.length > 0) {
                                    return await aiDataCorrector.suggestCorrections(
                                        entityData, 
                                        entityErrors, 
                                        entityType as 'client' | 'worker' | 'task'
                                    );
                                }
                            }
                            return [];
                        });
                        
                        const allSuggestions = await Promise.all(suggestionPromises);
                        allSuggestions.flat().forEach(suggestion => suggestions.push(suggestion));
                        
                        setCorrectionSuggestions(suggestions);
                    } catch (error) {
                        console.error('Error generating AI suggestions:', error);
                        setCorrectionSuggestions([]);
                    }
                }, 500); // Delay to not block UI
            } else {
                setCorrectionSuggestions([]);
            }
        } catch (error) {
            console.error('Error during validation:', error);
        } finally {
            setIsValidating(false);
        }
    };

    // Debounce validation to avoid excessive calls during editing
    const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleDataChange = (entityType: EntityType, updatedData: any[]) => {
        const newData = { ...appData };
        newData[`${entityType}s` as keyof AppData] = updatedData;
        setAppData(newData);
        
        // Clear existing timeout
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        
        // Set new timeout for validation
        const newTimeout = setTimeout(() => {
            runValidation(newData);
        }, 1000); // Wait 1 second after last change before validating
        
        setValidationTimeout(newTimeout);
    };

    const getEntityErrors = (entityType: EntityType) => {
        return validationErrors.filter(error => error.entityType === entityType);
    };

    const handleNaturalQuery = async () => {
        if (!naturalQuery.trim()) return;
        
        const result = await aiQueryProcessor.processQuery(naturalQuery, appData);
        setQueryResults(result);
    };

    const applyCorrection = async (suggestion: CorrectionSuggestion) => {
        const entityType = suggestion.error.entityType;
        const currentData = appData[`${entityType}s` as keyof AppData];
        const correctedData = await aiDataCorrector.applyCorrection(currentData, suggestion);
        
        handleDataChange(entityType, correctedData);
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8">🤖 AI Data Alchemist</h1>
                
                {/* File Upload Section */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Upload Data Files</h2>
                    <FileUpload onfileUploaded={handleFileUpload} />
                    
                    {/* AI Header Mapping Results */}
                    {headerMappings.length > 0 && (
                        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <h3 className="font-semibold text-blue-900 mb-2">🤖 AI Header Mapping Results</h3>
                            {headerMappings.map((mapping, index) => (
                                <div key={index} className="text-sm text-blue-800">
                                    <p>Confidence: {(mapping.confidence * 100).toFixed(1)}%</p>
                                    <p>Mapped {Object.keys(mapping.mappings).length} headers</p>
                                    {mapping.unmappedHeaders.length > 0 && (
                                        <p className="text-orange-600">
                                            Unmapped: {mapping.unmappedHeaders.join(', ')}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Natural Language Query Interface */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold">🔍 Natural Language Search</h2>
                        <button
                            onClick={() => setShowQueryInterface(!showQueryInterface)}
                            className="text-blue-600 hover:text-blue-800"
                        >
                            {showQueryInterface ? 'Hide' : 'Show'}
                        </button>
                    </div>
                    
                    {showQueryInterface && (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={naturalQuery}
                                    onChange={(e) => setNaturalQuery(e.target.value)}
                                    placeholder="e.g., Show tasks with duration greater than 2"
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    onKeyPress={(e) => e.key === 'Enter' && handleNaturalQuery()}
                                />
                                <button
                                    onClick={handleNaturalQuery}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Search
                                </button>
                            </div>
                            
                            {queryResults && (
                                <div className="p-4 bg-green-50 rounded-lg">
                                    <h4 className="font-semibold text-green-900">Results ({queryResults.totalCount} items)</h4>
                                    <p className="text-sm text-green-700">Query: "{queryResults.query}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Validation Summary */}
                {validationSummary && (
                    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                        <h2 className="text-xl font-semibold mb-4">Validation Summary</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                                <div className="text-2xl font-bold text-red-600">{validationSummary.totalErrors}</div>
                                <div className="text-sm text-gray-600">Errors</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-yellow-600">{validationSummary.totalWarnings}</div>
                                <div className="text-sm text-gray-600">Warnings</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-blue-600">{appData.clients.length}</div>
                                <div className="text-sm text-gray-600">Clients</div>
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-green-600">{appData.workers.length + appData.tasks.length}</div>
                                <div className="text-sm text-gray-600">Workers + Tasks</div>
                            </div>
                        </div>
                        
                        {/* AI Correction Suggestions */}
                        {correctionSuggestions.length > 0 && (
                            <div className="mt-4">
                                <h3 className="font-semibold text-gray-900 mb-2">🤖 AI Correction Suggestions</h3>
                                <div className="space-y-2">
                                    {correctionSuggestions.slice(0, 5).map((suggestion, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-yellow-900">{suggestion.suggestion}</p>
                                                <p className="text-xs text-yellow-700">Confidence: {(suggestion.confidence * 100).toFixed(0)}%</p>
                                            </div>
                                            {suggestion.action === 'auto-fix' && (
                                                <button
                                                    onClick={() => applyCorrection(suggestion)}
                                                    className="ml-2 px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
                                                >
                                                    Apply
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Data Tabs */}
                <div className="bg-white rounded-lg shadow-md">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {(['client', 'worker', 'task'] as EntityType[]).map((entityType) => (
                                <button
                                    key={entityType}
                                    onClick={() => setActiveTab(entityType)}
                                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                        activeTab === entityType
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                                >
                                    {entityType.charAt(0).toUpperCase() + entityType.slice(1)}s
                                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                                        {appData[`${entityType}s` as keyof AppData]?.length || 0}
                                    </span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="p-6">
                        {isValidating || isProcessing ? (
                            <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                                <p className="mt-2 text-gray-600">
                                    {isProcessing ? '🤖 AI is analyzing your data...' : '✅ Running data validation...'}
                                </p>
                                {isProcessing && (
                                    <p className="mt-1 text-sm text-gray-500">
                                        Processing files in parallel with optimized AI calls
                                    </p>
                                )}
                            </div>
                        ) : (
                            <DataGrid
                                data={appData[`${activeTab}s` as keyof AppData] || []}
                                entityType={activeTab}
                                onDataChange={(updatedData: any[]) => handleDataChange(activeTab, updatedData)}
                                validationErrors={getEntityErrors(activeTab)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
