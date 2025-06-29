import React, { useState } from 'react';
import { FaPlus, FaTrash, FaCog, FaMagic, FaCogs } from 'react-icons/fa';
import NaturalLanguageRules from './NaturalLanguageRules';

// Rule types and interfaces
export interface BusinessRule {
    id: string;
    type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedenceOverride';
    name: string;
    parameters: any;
    priority: number;
    enabled: boolean;
}

export interface CoRunRule {
    type: 'coRun';
    tasks: string[];
    description: string;
}

export interface SlotRestrictionRule {
    type: 'slotRestriction';
    targetGroup: string;
    groupType: 'client' | 'worker';
    minCommonSlots: number;
    description: string;
}

export interface LoadLimitRule {
    type: 'loadLimit';
    workerGroup: string;
    maxSlotsPerPhase: number;
    description: string;
}

export interface PhaseWindowRule {
    type: 'phaseWindow';
    taskId: string;
    allowedPhases: number[];
    description: string;
}

export interface PatternMatchRule {
    type: 'patternMatch';
    regex: string;
    template: string;
    parameters: Record<string, any>;
    description: string;
}

interface RuleBuilderProps {
    appData: {
        clients: any[];
        workers: any[];
        tasks: any[];
    };
    rules: BusinessRule[];
    onRulesChange: (rules: BusinessRule[]) => void;
    onGenerateConfig: () => void;
}

export default function RuleBuilder({ appData, rules, onRulesChange, onGenerateConfig }: RuleBuilderProps) {
    const [activeTab, setActiveTab] = useState<'manual' | 'natural'>('manual');
    const [activeRuleType, setActiveRuleType] = useState<string>('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [newRule, setNewRule] = useState<Partial<BusinessRule>>({});

    // Get available options for dropdowns
    const getTaskIds = () => appData.tasks.map(t => t.TaskID).filter(Boolean);
    const getClientGroups = () => [...new Set(appData.clients.map(c => c.GroupTag).filter(Boolean))];
    const getWorkerGroups = () => [...new Set(appData.workers.map(w => w.WorkerGroup).filter(Boolean))];

    const ruleTemplates = {
        coRun: {
            name: 'Co-Run Tasks',
            description: 'Tasks that must run together',
            icon: '🔗',
            defaultParams: { tasks: [], description: '' }
        },
        slotRestriction: {
            name: 'Slot Restriction',
            description: 'Minimum common slots for groups',
            icon: '⏰',
            defaultParams: { targetGroup: '', groupType: 'client', minCommonSlots: 1, description: '' }
        },
        loadLimit: {
            name: 'Load Limit',
            description: 'Maximum workload per worker group',
            icon: '⚖️',
            defaultParams: { workerGroup: '', maxSlotsPerPhase: 5, description: '' }
        },
        phaseWindow: {
            name: 'Phase Window',
            description: 'Restrict tasks to specific phases',
            icon: '📅',
            defaultParams: { taskId: '', allowedPhases: [], description: '' }
        },
        patternMatch: {
            name: 'Pattern Match',
            description: 'Regex-based rule matching',
            icon: '🔍',
            defaultParams: { regex: '', template: '', parameters: {}, description: '' }
        },
        precedenceOverride: {
            name: 'Precedence Override',
            description: 'Custom priority ordering',
            icon: '⬆️',
            defaultParams: { globalPriority: 1, specificRules: [], description: '' }
        }
    };

    const addRule = () => {
        if (!activeRuleType || !newRule.name) return;

        const rule: BusinessRule = {
            id: `rule_${Date.now()}`,
            type: activeRuleType as any,
            name: newRule.name || '',
            parameters: newRule.parameters || ruleTemplates[activeRuleType as keyof typeof ruleTemplates].defaultParams,
            priority: newRule.priority || rules.length + 1,
            enabled: true
        };

        onRulesChange([...rules, rule]);
        setNewRule({});
        setShowAddForm(false);
        setActiveRuleType('');
    };

    const updateRule = (ruleId: string, updates: Partial<BusinessRule>) => {
        const updatedRules = rules.map(rule =>
            rule.id === ruleId ? { ...rule, ...updates } : rule
        );
        onRulesChange(updatedRules);
    };

    const deleteRule = (ruleId: string) => {
        onRulesChange(rules.filter(rule => rule.id !== ruleId));
    };

    const renderRuleForm = () => {
        if (!activeRuleType) return null;

        const template = ruleTemplates[activeRuleType as keyof typeof ruleTemplates];

        switch (activeRuleType) {
            case 'coRun':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Configure Co-Run Rule</h4>
                        <div>
                            <label className="block text-sm font-medium mb-2">Select Tasks</label>
                            <select
                                multiple
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => {
                                    const tasks = Array.from(e.target.selectedOptions, option => option.value);
                                    setNewRule({
                                        ...newRule,
                                        parameters: { ...newRule.parameters, tasks }
                                    });
                                }}
                            >
                                {getTaskIds().map(taskId => (
                                    <option key={taskId} value={taskId}>{taskId}</option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple tasks</p>
                        </div>
                    </div>
                );

            case 'slotRestriction':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Configure Slot Restriction</h4>
                        <div>
                            <label className="block text-sm font-medium mb-2">Group Type</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, groupType: e.target.value }
                                })}
                            >
                                <option value="client">Client Group</option>
                                <option value="worker">Worker Group</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Target Group</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, targetGroup: e.target.value }
                                })}
                            >
                                {(newRule.parameters?.groupType === 'worker' ? getWorkerGroups() : getClientGroups()).map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Minimum Common Slots</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, minCommonSlots: parseInt(e.target.value) }
                                })}
                            />
                        </div>
                    </div>
                );

            case 'loadLimit':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Configure Load Limit</h4>
                        <div>
                            <label className="block text-sm font-medium mb-2">Worker Group</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, workerGroup: e.target.value }
                                })}
                            >
                                {getWorkerGroups().map(group => (
                                    <option key={group} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Max Slots Per Phase</label>
                            <input
                                type="number"
                                min="1"
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, maxSlotsPerPhase: parseInt(e.target.value) }
                                })}
                            />
                        </div>
                    </div>
                );

            case 'phaseWindow':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Configure Phase Window</h4>
                        <div>
                            <label className="block text-sm font-medium mb-2">Task ID</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, taskId: e.target.value }
                                })}
                            >
                                {getTaskIds().map(taskId => (
                                    <option key={taskId} value={taskId}>{taskId}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Allowed Phases</label>
                            <input
                                type="text"
                                placeholder="e.g., 1,2,3 or 1-5"
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => {
                                    const phases = e.target.value.includes('-')
                                        ? parseRange(e.target.value)
                                        : e.target.value.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p));
                                    setNewRule({
                                        ...newRule,
                                        parameters: { ...newRule.parameters, allowedPhases: phases }
                                    });
                                }}
                            />
                        </div>
                    </div>
                );

            case 'patternMatch':
                return (
                    <div className="space-y-4">
                        <h4 className="font-medium">Configure Pattern Match</h4>
                        <div>
                            <label className="block text-sm font-medium mb-2">Regex Pattern</label>
                            <input
                                type="text"
                                placeholder="e.g., ^TASK_[0-9]+$"
                                className="w-full p-2 border rounded-lg font-mono"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, regex: e.target.value }
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2">Rule Template</label>
                            <select
                                className="w-full p-2 border rounded-lg"
                                onChange={(e) => setNewRule({
                                    ...newRule,
                                    parameters: { ...newRule.parameters, template: e.target.value }
                                })}
                            >
                                <option value="">Select template...</option>
                                <option value="priority_boost">Priority Boost</option>
                                <option value="exclusion">Exclusion Rule</option>
                                <option value="grouping">Auto Grouping</option>
                            </select>
                        </div>
                    </div>
                );

            default:
                return null;
        }
    };

    const parseRange = (range: string): number[] => {
        const [start, end] = range.split('-').map(n => parseInt(n.trim()));
        if (isNaN(start) || isNaN(end)) return [];
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">⚙️ Business Rules Configuration</h2>
                <button
                    onClick={onGenerateConfig}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                    <FaCog /> Generate Config
                </button>
            </div>

            {/* Tabs Navigation */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'manual'
                                ? 'border-blue-500 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FaCogs className="inline mr-2" />
                        Manual Rules
                        <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                            {rules.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('natural')}
                        className={`py-3 px-1 border-b-2 font-medium text-sm ${activeTab === 'natural'
                                ? 'border-purple-500 text-purple-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <FaMagic className="inline mr-2" />
                        Natural Language
                        <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                            AI
                        </span>
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'manual' ? (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-medium">Manual Rule Configuration</h3>
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                        >
                            <FaPlus /> Add Rule
                        </button>
                    </div>

                    {/* Add Rule Form */}
                    {showAddForm && (
                        <div className="mb-6 p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
                            <h3 className="font-medium mb-4">Create New Rule</h3>

                            {/* Rule Type Selection */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                                {Object.entries(ruleTemplates).map(([type, template]) => (
                                    <button
                                        key={type}
                                        onClick={() => setActiveRuleType(type)}
                                        className={`p-3 rounded-lg border-2 text-left transition-colors ${activeRuleType === type
                                                ? 'border-blue-500 bg-blue-100'
                                                : 'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="text-lg mb-1">{template.icon}</div>
                                        <div className="font-medium text-sm">{template.name}</div>
                                        <div className="text-xs text-gray-600">{template.description}</div>
                                    </button>
                                ))}
                            </div>

                            {/* Rule Configuration */}
                            {activeRuleType && (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Rule Name</label>
                                        <input
                                            type="text"
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="Enter rule name..."
                                            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                                        />
                                    </div>

                                    {renderRuleForm()}

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Description</label>
                                        <textarea
                                            className="w-full p-2 border rounded-lg"
                                            rows={2}
                                            placeholder="Describe what this rule does..."
                                            onChange={(e) => setNewRule({
                                                ...newRule,
                                                parameters: { ...newRule.parameters, description: e.target.value }
                                            })}
                                        />
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={addRule}
                                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                                        >
                                            Add Rule
                                        </button>
                                        <button
                                            onClick={() => {
                                                setShowAddForm(false);
                                                setActiveRuleType('');
                                                setNewRule({});
                                            }}
                                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Existing Rules List */}
                    <div className="space-y-3">
                        {rules.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <FaCog className="mx-auto text-4xl mb-2 opacity-50" />
                                <p>No rules configured yet. Add your first rule above!</p>
                            </div>
                        ) : (
                            rules.map((rule) => (
                                <div key={rule.id} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-lg">
                                                    {ruleTemplates[rule.type]?.icon || '⚙️'}
                                                </span>
                                                <span className="font-medium">{rule.name}</span>
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                    {ruleTemplates[rule.type]?.name || rule.type}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {rule.parameters?.description || 'No description provided'}
                                            </p>
                                            <div className="text-xs text-gray-500 mt-1">
                                                Priority: {rule.priority} | Status: {rule.enabled ? 'Active' : 'Disabled'}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <label className="flex items-center gap-1">
                                                <input
                                                    type="checkbox"
                                                    checked={rule.enabled}
                                                    onChange={(e) => updateRule(rule.id, { enabled: e.target.checked })}
                                                />
                                                <span className="text-sm">Enabled</span>
                                            </label>
                                            <button
                                                onClick={() => deleteRule(rule.id)}
                                                className="p-2 text-red-600 hover:bg-red-100 rounded"
                                            >
                                                <FaTrash />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Rule Summary */}
                    {rules.length > 0 && (
                        <div className="mt-6 p-4 bg-gray-100 rounded-lg">
                            <h4 className="font-medium mb-2">Configuration Summary</h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                    <div className="font-medium">{rules.length}</div>
                                    <div className="text-gray-600">Total Rules</div>
                                </div>
                                <div>
                                    <div className="font-medium">{rules.filter(r => r.enabled).length}</div>
                                    <div className="text-gray-600">Active Rules</div>
                                </div>
                                <div>
                                    <div className="font-medium">{new Set(rules.map(r => r.type)).size}</div>
                                    <div className="text-gray-600">Rule Types</div>
                                </div>
                                <div>
                                    <div className="font-medium">{rules.filter(r => r.priority <= 3).length}</div>
                                    <div className="text-gray-600">High Priority</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <NaturalLanguageRules
                    onRuleGenerated={(rule) => onRulesChange([...rules, rule])}
                    existingRules={rules}
                    appData={appData}
                />
            )}
        </div>
    );
} 