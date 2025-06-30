import React, { useState } from 'react';
import { FaDownload, FaFileExport, FaCog, FaCheck, FaSpinner } from 'react-icons/fa';
import { BusinessRule } from './RuleBuilder';
import { PriorityWeight } from './PriorityWeights';
import { AppData } from '../types';
import { ValidationSummary } from '../utils/validation';

interface ExportSystemProps {
    appData: AppData;
    rules: BusinessRule[];
    priorities: PriorityWeight[];
    validationSummary: ValidationSummary | null;
}

export default function ExportSystem({ appData, rules, priorities, validationSummary }: ExportSystemProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<string>('');
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');

    // Generate clean CSV content
    const generateCSV = (data: Record<string, unknown>[], headers: string[]): string => {
        const csvHeaders = headers.join(',');
        const csvRows = data.map(row => 
            headers.map(header => {
                const value = row[header];
                if (Array.isArray(value)) {
                    return `"${value.join(',')}"`;
                }
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value || '';
            }).join(',')
        );
        return [csvHeaders, ...csvRows].join('\n');
    };

    // Generate rules configuration JSON
    const generateRulesConfig = () => {
        const config = {
            metadata: {
                version: '1.0',
                generatedAt: new Date().toISOString(),
                source: 'AI Data Alchemist',
                dataStats: {
                    totalClients: appData.clients.length,
                    totalWorkers: appData.workers.length,
                    totalTasks: appData.tasks.length,
                    validationStatus: {
                        errors: validationSummary?.totalErrors || 0,
                        warnings: validationSummary?.totalWarnings || 0,
                        isValid: (validationSummary?.totalErrors || 0) === 0
                    }
                }
            },
            businessRules: rules.filter(rule => rule.enabled).map(rule => ({
                id: rule.id,
                type: rule.type,
                name: rule.name,
                parameters: rule.parameters,
                priority: rule.priority,
                description: rule.parameters?.description || ''
            })),
            priorityWeights: priorities.reduce((acc, weight) => {
                acc[weight.id] = weight;
                return acc;
            }, {} as Record<string, typeof priorities[0]>),
            allocationSettings: {
                optimizationObjective: getOptimizationObjective(),
                constraints: extractConstraints(),
                preferences: {
                    balanceWorkload: priorities.find(p => p.id === 'worker_fairness')?.weight || 0,
                    prioritizeQuality: priorities.find(p => p.id === 'skill_matching')?.weight || 0,
                    maximizeEfficiency: priorities.find(p => p.id === 'phase_efficiency')?.weight || 0
                }
            }
        };

        return JSON.stringify(config, null, 2);
    };

    const getOptimizationObjective = (): string => {
        const topPriority = priorities.sort((a, b) => b.weight - a.weight)[0];
        switch (topPriority?.category) {
            case 'fulfillment': return 'maximize_task_completion';
            case 'fairness': return 'balance_workload_distribution';
            case 'efficiency': return 'optimize_resource_utilization';
            case 'quality': return 'maximize_skill_match_quality';
            default: return 'balanced_optimization';
        }
    };

    const extractConstraints = () => {
        const constraints: Record<string, unknown>[] = [];
        
        rules.forEach(rule => {
            switch (rule.type) {
                case 'coRun':
                    constraints.push({
                        type: 'co_execution',
                        taskIds: rule.parameters.tasks,
                        enforcement: 'strict'
                    });
                    break;
                case 'loadLimit':
                    constraints.push({
                        type: 'workload_limit',
                        workerGroup: rule.parameters.workerGroup,
                        maxSlotsPerPhase: rule.parameters.maxSlotsPerPhase,
                        enforcement: 'strict'
                    });
                    break;
                case 'phaseWindow':
                    constraints.push({
                        type: 'phase_restriction',
                        taskId: rule.parameters.taskId,
                        allowedPhases: rule.parameters.allowedPhases,
                        enforcement: 'preferred'
                    });
                    break;
                case 'slotRestriction':
                    constraints.push({
                        type: 'slot_availability',
                        group: rule.parameters.targetGroup,
                        groupType: rule.parameters.groupType,
                        minCommonSlots: rule.parameters.minCommonSlots,
                        enforcement: 'strict'
                    });
                    break;
            }
        });

        return constraints;
    };

    // Download file utility
    const downloadFile = (content: string, filename: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // Export individual entity
    const exportEntity = async (entityType: 'clients' | 'workers' | 'tasks') => {
        setIsExporting(true);
        setExportStatus(`Exporting ${entityType}...`);

        try {
            const data = appData[entityType];
            if (data.length === 0) {
                throw new Error(`No ${entityType} data to export`);
            }

            const headers = Object.keys(data[0] as unknown as Record<string, unknown>);
            const csvContent = generateCSV(data as unknown as Record<string, unknown>[], headers);
            
            const timestamp = new Date().toISOString().split('T')[0];
            const filename = `${entityType}_cleaned_${timestamp}.csv`;
            
            downloadFile(csvContent, filename, 'text/csv');
            setExportStatus(`✅ ${entityType} exported successfully`);
        } catch (error) {
            setExportStatus(`❌ Error exporting ${entityType}: ${error}`);
        }

        setTimeout(() => {
            setIsExporting(false);
            setExportStatus('');
        }, 2000);
    };

    // Export all data
    const exportAllData = async () => {
        setIsExporting(true);
        setExportStatus('Preparing export package...');

        try {
            const timestamp = new Date().toISOString().split('T')[0];

            // Export each entity
            for (const entityType of ['clients', 'workers', 'tasks'] as const) {
                const data = appData[entityType];
                if (data.length > 0) {
                    const headers = Object.keys(data[0] as unknown as Record<string, unknown>);
                    const csvContent = generateCSV(data as unknown as Record<string, unknown>[], headers);
                    downloadFile(csvContent, `${entityType}_cleaned_${timestamp}.csv`, 'text/csv');
                }
            }

            // Export rules configuration
            const rulesConfig = generateRulesConfig();
            downloadFile(rulesConfig, `rules_config_${timestamp}.json`, 'application/json');

            setExportStatus('✅ Export package completed successfully');
        } catch (error) {
            setExportStatus(`❌ Export failed: ${error}`);
        }

        setTimeout(() => {
            setIsExporting(false);
            setExportStatus('');
        }, 3000);
    };

    // Export rules only
    const exportRulesConfig = async () => {
        setIsExporting(true);
        setExportStatus('Generating rules configuration...');

        try {
            const rulesConfig = generateRulesConfig();
            const timestamp = new Date().toISOString().split('T')[0];
            downloadFile(rulesConfig, `rules_config_${timestamp}.json`, 'application/json');
            setExportStatus('✅ Rules configuration exported');
        } catch (error) {
            setExportStatus(`❌ Error exporting rules: ${error}`);
        }

        setTimeout(() => {
            setIsExporting(false);
            setExportStatus('');
        }, 2000);
    };

    // Check if data is ready for export
    const isReadyForExport = () => {
        const hasData = appData.clients.length > 0 || appData.workers.length > 0 || appData.tasks.length > 0;
        const hasNoErrors = (validationSummary?.totalErrors || 0) === 0;
        return hasData && hasNoErrors;
    };

    const getDataSummary = () => {
        return {
            clients: appData.clients.length,
            workers: appData.workers.length,
            tasks: appData.tasks.length,
            totalRecords: appData.clients.length + appData.workers.length + appData.tasks.length,
            entities: [
                { name: 'Clients', count: appData.clients.length },
                { name: 'Workers', count: appData.workers.length },
                { name: 'Tasks', count: appData.tasks.length }
            ].filter(entity => entity.count > 0),
            rules: rules.filter(r => r.enabled).length,
            priorities: priorities.length
        };
    };

    const summary = getDataSummary();

    return (
        <div className="space-y-8">
            {/* Export Status */}
            {exportStatus && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5 shadow-sm">
                    <div className="flex items-center gap-3">
                        {isExporting && <FaSpinner className="animate-spin text-blue-600" />}
                        <span className="text-blue-800 font-medium text-lg">{exportStatus}</span>
                    </div>
                </div>
            )}

            {/* Data Summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-900">
                    <FaCog className="text-blue-600 text-2xl" />
                    Export Summary
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                    <div className="text-center p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200 shadow-sm">
                        <div className="text-3xl font-bold text-blue-600 mb-2">{summary.clients}</div>
                        <div className="text-gray-600 font-semibold">Clients</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 shadow-sm">
                        <div className="text-3xl font-bold text-green-600 mb-2">{summary.workers}</div>
                        <div className="text-gray-600 font-semibold">Workers</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200 shadow-sm">
                        <div className="text-3xl font-bold text-purple-600 mb-2">{summary.tasks}</div>
                        <div className="text-gray-600 font-semibold">Tasks</div>
                    </div>
                    <div className="text-center p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-200 shadow-sm">
                        <div className="text-3xl font-bold text-orange-600 mb-2">{summary.totalRecords}</div>
                        <div className="text-gray-600 font-semibold">Total Records</div>
                    </div>
                </div>

                {/* Validation Status */}
                {validationSummary && (
                    <div className="p-6 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200">
                        <h4 className="font-semibold mb-4 text-lg text-gray-900">Validation Status</h4>
                        <div className="grid grid-cols-3 gap-6">
                            <div className="text-center">
                                <span className="text-2xl font-bold text-red-600">{validationSummary.totalErrors}</span>
                                <div className="text-gray-600 font-medium">Errors</div>
                            </div>
                            <div className="text-center">
                                <span className="text-2xl font-bold text-yellow-600">{validationSummary.totalWarnings}</span>
                                <div className="text-gray-600 font-medium">Warnings</div>
                            </div>
                            <div className="text-center">
                                <span className="text-2xl font-bold text-blue-600">{validationSummary.validationScore}</span>
                                <div className="text-gray-600 font-medium">Score</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Options */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-gray-900">
                    <FaDownload className="text-green-600 text-2xl" />
                    Export Options
                </h3>

                <div className="space-y-6">
                    {/* Individual Entity Exports */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <button
                            onClick={() => exportEntity('clients')}
                            disabled={isExporting || summary.clients === 0}
                            className="flex items-center justify-center gap-3 p-5 border-2 border-blue-300 text-blue-700 rounded-xl hover:bg-blue-50 hover:border-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                        >
                            <FaFileExport className="text-lg" />
                            Export Clients ({summary.clients})
                        </button>
                        
                        <button
                            onClick={() => exportEntity('workers')}
                            disabled={isExporting || summary.workers === 0}
                            className="flex items-center justify-center gap-3 p-5 border-2 border-green-300 text-green-700 rounded-xl hover:bg-green-50 hover:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                        >
                            <FaFileExport className="text-lg" />
                            Export Workers ({summary.workers})
                        </button>
                        
                        <button
                            onClick={() => exportEntity('tasks')}
                            disabled={isExporting || summary.tasks === 0}
                            className="flex items-center justify-center gap-3 p-5 border-2 border-purple-300 text-purple-700 rounded-xl hover:bg-purple-50 hover:border-purple-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md font-semibold"
                        >
                            <FaFileExport className="text-lg" />
                            Export Tasks ({summary.tasks})
                        </button>
                    </div>

                    {/* Bulk Export */}
                    <div className="border-t border-gray-200 pt-6">
                        <button
                            onClick={exportAllData}
                            disabled={isExporting || !isReadyForExport()}
                            className="w-full flex items-center justify-center gap-3 p-5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-lg"
                        >
                            <FaDownload className="text-xl" />
                            Export All Data as CSV Package
                        </button>
                    </div>

                    {/* Configuration Export */}
                    <div className="border-t border-gray-200 pt-6">
                        <button
                            onClick={exportRulesConfig}
                            disabled={isExporting}
                            className="w-full flex items-center justify-center gap-3 p-5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg font-semibold text-lg"
                        >
                            <FaCog className="text-xl" />
                            Export Allocation Configuration
                        </button>
                    </div>
                </div>
            </div>

            {/* Export Settings */}
            <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
                <h3 className="text-xl font-bold mb-6 text-gray-900">Export Settings</h3>
                
                <div className="space-y-6">
                    <div className="flex items-center gap-4">
                        <input
                            type="checkbox"
                            id="includeMetadata"
                            checked={includeMetadata}
                            onChange={(e) => setIncludeMetadata(e.target.checked)}
                            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="includeMetadata" className="text-gray-800 font-medium">
                            Include metadata and validation summary
                        </label>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <span className="text-gray-800 font-semibold">Format:</span>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="format"
                                value="csv"
                                checked={exportFormat === 'csv'}
                                onChange={(e) => setExportFormat(e.target.value as 'csv')}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-gray-700 font-medium">CSV</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input
                                type="radio"
                                name="format"
                                value="xlsx"
                                checked={exportFormat === 'xlsx'}
                                onChange={(e) => setExportFormat(e.target.value as 'xlsx')}
                                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <span className="text-gray-700 font-medium">Excel (XLSX)</span>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
} 