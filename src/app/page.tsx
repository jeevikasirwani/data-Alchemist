'use client';

import React, { useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import DataGrid from '../components/DataGrid';
import RuleBuilder from '../components/RuleBuilder';
import PriorityWeights from '../components/PriorityWeights';
import ExportSystem from '../components/ExportSystem';
import ValidationSummary from '../components/ValidationSummary';
import AICorrectionSuggestions from '../components/AICorrectionSuggestions';
import QueryInterface from '../components/QueryInterface';

// Custom hooks
import { useValidation } from '../hooks/useValidation';
import { useCorrections } from '../hooks/useCorrections';
import { useQueryProcessor } from '../hooks/useQueryProcessor';
import { useDataManagement } from '../hooks/useDataManagement';

// Types
import { EntityType, Client, Worker, Task } from '../types';
import { CorrectionSuggestion } from '../utils/ai-data-corrector-simplified';

export default function Home() {
    // All hooks for modular functionality
    const validation = useValidation();
    const corrections = useCorrections();
    const queryProcessor = useQueryProcessor();
    const dataManagement = useDataManagement();

    // Simple callback to receive processed data from FileUpload
    const handleDataProcessed = (entityType: EntityType, data: Client[] | Worker[] | Task[]) => {
        dataManagement.updateEntityData(entityType, data);
        setTimeout(() => dataManagement.runValidation(), 100);
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
        } else {
            corrections.clearAllSuggestions();
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

    const handleDismissSuggestion = (suggestion: CorrectionSuggestion) => {
        corrections.dismissSuggestion(suggestion);
    };

    const handleApplyAllAutoFixes = async () => {
        await corrections.applyAllAutoFixes(dataManagement.getAppData(), handleDataChange);
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
                <h1 className="text-4xl font-light text-gray-900 mb-8 text-center tracking-tight">
                    Data Alchemist - AI-Powered Data Validation & Processing
                </h1>

                {/* File Upload Section */}
                <div className="mb-6">
                    <FileUpload
                        onDataProcessed={handleDataProcessed}
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

                {/* Validation Summary - Only show when there's data */}
                {hasData() && (
                    <ValidationSummary
                        validationSummary={dataManagement.data.validationSummary}
                        validationErrors={dataManagement.data.validationErrors}
                        isValidating={dataManagement.data.isValidating}
                        aiValidationResults={[]}
                        hasData={hasData()}
                    />
                )}

                {/* AI Correction Suggestions - NEW SIMPLIFIED VERSION */}
                {corrections.correctionSuggestions.length > 0 && (
                    <div className="mb-6">
                        {/* Quick action bar */}
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-blue-800 font-medium">
                                    Found {corrections.correctionSuggestions.length} AI suggestions
                                </span>
                                <span className="text-sm text-blue-600">
                                    ({corrections.correctionSuggestions.filter(s => s.action === 'auto-fix').length} auto-fixable)
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleApplyAllAutoFixes}
                                    disabled={corrections.isGenerating || corrections.correctionSuggestions.filter(s => s.action === 'auto-fix').length === 0}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
                                >
                                    Apply All Auto-fixes
                                </button>
                                <button
                                    onClick={corrections.clearAllSuggestions}
                                    className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
                                >
                                    Dismiss All
                                </button>
                            </div>
                        </div>

                        <AICorrectionSuggestions
                            suggestions={corrections.correctionSuggestions}
                            onApplyCorrection={handleApplyCorrection}
                            onDismiss={handleDismissSuggestion}
                        />
                    </div>
                )}

                {/* Loading state for AI corrections */}
                {corrections.isGenerating && (
                    <div className="mb-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                        <div className="flex items-center justify-center gap-3">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-gray-700">🤖 AI is analyzing your data and generating corrections...</span>
                        </div>
                    </div>
                )}

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
                {!hasData() && (
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
