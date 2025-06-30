'use client';

import React, { useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import DataGrid from '../components/DataGrid';
import RuleBuilder from '../components/RuleBuilder';
import PriorityWeights from '../components/PriorityWeights';
import ExportSystem from '../components/ExportSystem';
import ValidationSummary from '../components/ValidationSummary';
import CorrectionSuggestions from '../components/CorrectionSuggestions';
import QueryInterface from '../components/QueryInterface';

// Custom hooks
import { useFileUpload } from '../hooks/useFileUpload';
import { useValidation } from '../hooks/useValidation';
import { useCorrections } from '../hooks/useCorrections';
import { useQueryProcessor } from '../hooks/useQueryProcessor';
import { useDataManagement } from '../hooks/useDataManagement';

// Types
import { EntityType, Client, Worker, Task } from '../types';
import { CorrectionSuggestion } from '../utils/ai-data-corrector';
import { EnhancedCorrectionSuggestion } from '../utils/ai';

export default function Home() {
    // All hooks for modular functionality
    const fileUpload = useFileUpload();
    const validation = useValidation();
    const corrections = useCorrections();
    const queryProcessor = useQueryProcessor();
    const dataManagement = useDataManagement();

    // Handle file upload
    const handleFileUpload = async (files: File[]) => {
        // For now, assume all files are of the same type based on filename patterns
        // In a real app, you might want a file selection UI for entity types
        for (const file of files) {
            const filename = file.name.toLowerCase();
            let entityType: EntityType = 'client'; // default

            if (filename.includes('client')) {
                entityType = 'client';
            } else if (filename.includes('worker')) {
                entityType = 'worker';
            } else if (filename.includes('task')) {
                entityType = 'task';
            }

            await fileUpload.handleFileUpload(file, entityType, (entityType, data) => {
                dataManagement.updateEntityData(entityType, data);
                // Run validation after data update
                setTimeout(() => dataManagement.runValidation(), 100);
            });
        }
    };

    // Handle data changes with validation
    const handleDataChange = (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]) => {
        dataManagement.updateEntityData(entityType, updatedData);
        dataManagement.runValidation();
    };

    // Generate corrections after validation completes
    useEffect(() => {
        if (dataManagement.data.validationErrors.length > 0 &&
            (dataManagement.data.clients.length > 0 ||
                dataManagement.data.workers.length > 0 ||
                dataManagement.data.tasks.length > 0)) {
            corrections.generateCorrections(dataManagement.getAppData(), dataManagement.data.validationErrors);
        }
    }, [dataManagement.data.validationErrors]);

    // Handle natural language query
    const handleNaturalQuery = async () => {
        await queryProcessor.handleNaturalQuery(dataManagement.getAppData());
    };

    // Apply corrections with proper data updates
    const handleApplyCorrection = async (suggestion: CorrectionSuggestion) => {
        await corrections.applyCorrection(suggestion, dataManagement.getAppData(), handleDataChange);
    };

    const handleApplyEnhancedCorrection = async (suggestion: EnhancedCorrectionSuggestion) => {
        await corrections.applyEnhancedCorrection(suggestion, dataManagement.getAppData(), handleDataChange);
    };

    const hasData = () => {
        return dataManagement.data.clients.length > 0 ||
            dataManagement.data.workers.length > 0 ||
            dataManagement.data.tasks.length > 0;
    };

    const getCurrentEntityData = (entityType: EntityType): Client[] | Worker[] | Task[] => {
        switch (entityType) {
            case 'client':
                return dataManagement.data.clients;
            case 'worker':
                return dataManagement.data.workers;
            case 'task':
                return dataManagement.data.tasks;
            default:
                return [];
        }
    };

    const getEntityErrors = (entityType: EntityType) => {
        return dataManagement.data.validationErrors.filter(error => error.entityType === entityType);
    };

    const [activeTab, setActiveTab] = React.useState<EntityType | 'rules' | 'priorities' | 'export'>('client');

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
                    🧪 Data Alchemist - AI-Powered Data Validation & Processing
                </h1>

                {/* File Upload Section */}
                <div className="mb-6">
                    <FileUpload
                        onFilesUploaded={handleFileUpload}
                        isProcessing={fileUpload.uploadState.isProcessing}
                    />
                </div>

                {/* Natural Language Query Interface */}
                <QueryInterface
                    showQueryInterface={queryProcessor.showQueryInterface}
                    naturalQuery={queryProcessor.naturalQuery}
                    queryResults={queryProcessor.queryResults}
                    isProcessingQuery={queryProcessor.isProcessingQuery}
                    onToggleInterface={queryProcessor.toggleQueryInterface}
                    onQueryChange={queryProcessor.setNaturalQuery}
                    onExecuteQuery={handleNaturalQuery}
                    onClearQuery={queryProcessor.clearQuery}
                />

                {/* Validation Summary */}
                <ValidationSummary
                    validationSummary={dataManagement.data.validationSummary}
                    validationErrors={dataManagement.data.validationErrors}
                    isValidating={dataManagement.data.isValidating}
                    aiValidationResults={[]}
                />

                {/* AI Correction Suggestions */}
                <CorrectionSuggestions
                    correctionSuggestions={corrections.correctionSuggestions}
                    enhancedCorrections={corrections.enhancedCorrections}
                    onApplyCorrection={handleApplyCorrection}
                    onApplyEnhancedCorrection={handleApplyEnhancedCorrection}
                />

                {/* Main Data Tabs */}
                {hasData() && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Tab Navigation */}
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-8 px-6">
                                {(['client', 'worker', 'task', 'rules', 'priorities', 'export'] as const).map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === tab
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        {tab === 'client' && `Clients (${dataManagement.data.clients.length})`}
                                        {tab === 'worker' && `Workers (${dataManagement.data.workers.length})`}
                                        {tab === 'task' && `Tasks (${dataManagement.data.tasks.length})`}
                                        {tab === 'rules' && 'Business Rules'}
                                        {tab === 'priorities' && 'Priority Weights'}
                                        {tab === 'export' && 'Export Data'}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Tab Content */}
                        <div className="p-6">
                            {/* Data Grid Tabs */}
                            {(['client', 'worker', 'task'] as const).includes(activeTab as EntityType) && (
                                <DataGrid
                                    data={getCurrentEntityData(activeTab as EntityType)}
                                    onDataChange={(updatedData) => handleDataChange(activeTab as EntityType, updatedData)}
                                    validationErrors={getEntityErrors(activeTab as EntityType)}
                                    entityType={activeTab as EntityType}
                                    allData={dataManagement.getAppData()}
                                />
                            )}

                            {/* Business Rules Tab */}
                            {activeTab === 'rules' && (
                                <RuleBuilder
                                    rules={[]}
                                    onRulesChange={() => { }}
                                    appData={dataManagement.getAppData()}
                                    onGenerateConfig={() => { }}
                                />
                            )}

                            {/* Priority Weights Tab */}
                            {activeTab === 'priorities' && (
                                <PriorityWeights
                                    weights={[]}
                                    onWeightsChange={() => { }}
                                    onProfileSelect={() => { }}
                                />
                            )}

                            {/* Export Tab */}
                            {activeTab === 'export' && (
                                <ExportSystem
                                    appData={dataManagement.getAppData()}
                                    rules={[]}
                                    priorities={[]}
                                    validationSummary={dataManagement.data.validationSummary}
                                />
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!hasData() && !fileUpload.uploadState.isProcessing && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📊</div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Ready to Transform Your Data</h2>
                        <p className="text-gray-600 mb-6">Upload CSV or Excel files to get started with AI-powered data validation and processing</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto text-sm text-gray-500">
                            <div className="flex items-center justify-center gap-2">
                                <span>🤖</span>
                                <span>AI-driven validation</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span>🔍</span>
                                <span>Natural language search</span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                                <span>✨</span>
                                <span>Smart corrections</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
