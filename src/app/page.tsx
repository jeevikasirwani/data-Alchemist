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

type EntityType = 'client' | 'worker' | 'task';

export default function Home() {
    // All hooks for modular functionality
    const fileUpload = useFileUpload();
    const validation = useValidation();
    const corrections = useCorrections();
    const queryProcessor = useQueryProcessor();
    const dataManagement = useDataManagement();

    // Handle file upload
    const handleFileUpload = async (files: File[]) => {
        const newData = await fileUpload.processFiles(files, dataManagement.appData);
        dataManagement.updateData(newData);

        // Defer validation to avoid blocking UI
        setTimeout(() => validation.runValidation(newData), 100);
                        };

    // Handle data changes with validation
    const handleDataChange = (entityType: EntityType, updatedData: any[], immediate: boolean = false) => {
        const newData = dataManagement.handleDataChange(entityType, updatedData, immediate);
        validation.runDeferredValidation(newData, immediate);
    };

    // Generate corrections after validation completes
    useEffect(() => {
        if (validation.validationErrors.length > 0 && dataManagement.hasData()) {
            corrections.generateCorrections(dataManagement.appData, validation.validationErrors);
        }
    }, [validation.validationErrors]);

    // Handle natural language query
    const handleNaturalQuery = async () => {
        await queryProcessor.handleNaturalQuery(dataManagement.appData);
    };

    // Apply corrections with proper data updates
    const handleApplyCorrection = async (suggestion: any) => {
        await corrections.applyCorrection(suggestion, dataManagement.appData, handleDataChange);
    };

    const handleApplyEnhancedCorrection = async (suggestion: any) => {
        await corrections.applyEnhancedCorrection(suggestion, dataManagement.appData, handleDataChange);
    };

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
                        isProcessing={fileUpload.isProcessing}
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
                    validationSummary={validation.validationSummary}
                    validationErrors={validation.validationErrors}
                    aiValidationResults={validation.aiValidationResults}
                    isValidating={validation.isValidating}
                />

                        {/* AI Correction Suggestions */}
                <CorrectionSuggestions
                    correctionSuggestions={corrections.correctionSuggestions}
                    enhancedCorrections={corrections.enhancedCorrections}
                    onApplyCorrection={handleApplyCorrection}
                    onApplyEnhancedCorrection={handleApplyEnhancedCorrection}
                />

                {/* Main Data Tabs */}
                {dataManagement.hasData() && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        {/* Tab Navigation */}
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                                {(['client', 'worker', 'task', 'rules', 'priorities', 'export'] as const).map((tab) => (
                                <button
                                        key={tab}
                                        onClick={() => dataManagement.setActiveTab(tab)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${
                                            dataManagement.activeTab === tab
                                            ? 'border-blue-500 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                        {tab === 'client' && `Clients (${dataManagement.appData.clients.length})`}
                                        {tab === 'worker' && `Workers (${dataManagement.appData.workers.length})`}
                                        {tab === 'task' && `Tasks (${dataManagement.appData.tasks.length})`}
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
                            {(['client', 'worker', 'task'] as const).includes(dataManagement.activeTab as EntityType) && (
                                                        <DataGrid
                                data={dataManagement.getCurrentEntityData(dataManagement.activeTab as EntityType)}
                                onDataChange={(updatedData) => handleDataChange(dataManagement.activeTab as EntityType, updatedData)}
                                validationErrors={validation.getEntityErrors(dataManagement.activeTab as EntityType)}
                                entityType={dataManagement.activeTab as EntityType}
                                allData={dataManagement.appData}
                            />
                            )}

                            {/* Business Rules Tab */}
                            {dataManagement.activeTab === 'rules' && (
                                                        <RuleBuilder
                                rules={dataManagement.businessRules}
                                onRulesChange={dataManagement.setBusinessRules}
                                appData={dataManagement.appData}
                                onGenerateConfig={() => {}}
                            />
                            )}

                            {/* Priority Weights Tab */}
                            {dataManagement.activeTab === 'priorities' && (
                                                        <PriorityWeights
                                weights={dataManagement.priorityWeights}
                                onWeightsChange={dataManagement.setPriorityWeights}
                                onProfileSelect={() => {}}
                            />
                            )}

                            {/* Export Tab */}
                            {dataManagement.activeTab === 'export' && (
                                                        <ExportSystem
                                appData={dataManagement.appData}
                                rules={dataManagement.businessRules}
                                priorities={dataManagement.priorityWeights}
                                validationSummary={validation.validationSummary}
                            />
                            )}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!dataManagement.hasData() && !fileUpload.isProcessing && (
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
