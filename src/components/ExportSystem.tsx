import React, { useState } from 'react';
import { FaDownload, FaFileExport, FaCog, FaCheck, FaSpinner } from 'react-icons/fa';
import { BusinessRule } from './RuleBuilder';
import { PriorityWeight } from './PriorityWeights';

interface ExportSystemProps {
    appData: {
        clients: any[];
        workers: any[];
        tasks: any[];
    };
    rules: BusinessRule[];
    priorities: PriorityWeight[];
    validationSummary: {
        totalErrors: number;
        totalWarnings: number;
    } | null;
}

export default function ExportSystem({ appData, rules, priorities, validationSummary }: ExportSystemProps) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportStatus, setExportStatus] = useState<string>('');
    const [includeMetadata, setIncludeMetadata] = useState(true);
    const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');

    // Generate clean CSV content
    const generateCSV = (data: any[], headers: string[]): string => {
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
                acc[weight.id] = {
                    weight: weight.weight,
                    category: weight.category,
                    rank: weight.rank,
                    description: weight.description
                };
                return acc;
            }, {} as Record<string, any>),
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
        const constraints: any[] = [];
        
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

            const headers = Object.keys(data[0]);
            const csvContent = generateCSV(data, headers);
            
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
                    const headers = Object.keys(data[0]);
                    const csvContent = generateCSV(data, headers);
                    const filename = `${entityType}_cleaned_${timestamp}.csv`;
                    downloadFile(csvContent, filename, 'text/csv');
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
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">📤 Export Clean Data & Configuration</h2>
                <div className="flex items-center gap-2">
                    {validationSummary && (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            validationSummary.totalErrors === 0 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                        }`}>
                            {validationSummary.totalErrors === 0 ? '✅ Ready' : `❌ ${validationSummary.totalErrors} Errors`}
                        </span>
                    )}
                </div>
            </div>

            {/* Export Status */}
            {exportStatus && (
                <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800">
                        {isExporting && <FaSpinner className="animate-spin" />}
                        <span className="text-sm">{exportStatus}</span>
                    </div>
                </div>
            )}

            {/* Data Summary */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-3">📊 Export Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{summary.totalRecords}</div>
                        <div className="text-gray-600">Total Records</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-green-600">{summary.entities.length}</div>
                        <div className="text-gray-600">Entity Types</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-purple-600">{summary.rules}</div>
                        <div className="text-gray-600">Active Rules</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-orange-600">{summary.priorities}</div>
                        <div className="text-gray-600">Priorities</div>
                    </div>
                </div>
                
                <div className="mt-3 pt-3 border-t">
                    <div className="flex flex-wrap gap-2">
                        {summary.entities.map(entity => (
                            <span key={entity.name} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {entity.name}: {entity.count}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Export Options */}
            <div className="space-y-4">
                {/* Individual Entity Exports */}
                <div>
                    <h3 className="font-medium mb-3">🗂️ Individual Entity Export</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(['clients', 'workers', 'tasks'] as const).map(entityType => (
                            <button
                                key={entityType}
                                onClick={() => exportEntity(entityType)}
                                disabled={isExporting || appData[entityType].length === 0}
                                className={`p-3 border-2 rounded-lg text-left transition-colors ${
                                    appData[entityType].length === 0
                                        ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                        : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-medium capitalize">{entityType}</h4>
                                        <p className="text-sm text-gray-600">
                                            {appData[entityType].length} records
                                        </p>
                                    </div>
                                    <FaDownload className="text-blue-600" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Rules Configuration Export */}
                <div>
                    <h3 className="font-medium mb-3">⚙️ Configuration Export</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <button
                            onClick={exportRulesConfig}
                            disabled={isExporting || rules.length === 0}
                            className={`p-4 border-2 rounded-lg flex items-center justify-between transition-colors ${
                                rules.length === 0
                                    ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                    : 'border-green-200 hover:border-green-400 hover:bg-green-50'
                            }`}
                        >
                            <div className="text-left">
                                <h4 className="font-medium">Rules Configuration</h4>
                                <p className="text-sm text-gray-600">
                                    Business rules + priorities (JSON)
                                </p>
                            </div>
                            <FaCog className="text-green-600 text-xl" />
                        </button>

                        <div className="p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
                            <h4 className="font-medium text-gray-700">Export Options</h4>
                            <div className="mt-2 space-y-2">
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={includeMetadata}
                                        onChange={(e) => setIncludeMetadata(e.target.checked)}
                                    />
                                    Include metadata & stats
                                </label>
                                <div className="flex gap-2">
                                    <label className="flex items-center gap-1 text-sm">
                                        <input
                                            type="radio"
                                            name="format"
                                            value="csv"
                                            checked={exportFormat === 'csv'}
                                            onChange={() => setExportFormat('csv')}
                                        />
                                        CSV
                                    </label>
                                    <label className="flex items-center gap-1 text-sm">
                                        <input
                                            type="radio"
                                            name="format"
                                            value="xlsx"
                                            checked={exportFormat === 'xlsx'}
                                            onChange={() => setExportFormat('xlsx')}
                                        />
                                        Excel
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Complete Export Package */}
                <div className="pt-4 border-t">
                    <button
                        onClick={exportAllData}
                        disabled={isExporting || !isReadyForExport()}
                        className={`w-full p-4 rounded-lg font-medium transition-colors ${
                            !isReadyForExport()
                                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                    >
                        <div className="flex items-center justify-center gap-3">
                            {isExporting ? (
                                <FaSpinner className="animate-spin" />
                            ) : (
                                <FaFileExport />
                            )}
                            <span>
                                {isExporting ? 'Exporting...' : 'Export Complete Package'}
                            </span>
                        </div>
                        <p className="text-sm opacity-90 mt-1">
                            Clean CSV files + rules.json configuration
                        </p>
                    </button>

                    {!isReadyForExport() && (
                        <div className="mt-2 text-sm text-red-600 text-center">
                            {(validationSummary?.totalErrors || 0) > 0 
                                ? '⚠️ Fix validation errors before exporting'
                                : '⚠️ No data available for export'
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
} 