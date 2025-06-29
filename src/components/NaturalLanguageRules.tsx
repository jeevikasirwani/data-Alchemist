import React, { useState } from 'react';
import { FaMagic, FaLightbulb, FaCheck, FaSpinner } from 'react-icons/fa';
import { BusinessRule } from './RuleBuilder';
import { AppData } from '../types';

interface NaturalLanguageRulesProps {
    onRuleGenerated: (rule: BusinessRule) => void;
    existingRules: BusinessRule[];
    appData: AppData;
}

export default function NaturalLanguageRules({ onRuleGenerated, existingRules, appData }: NaturalLanguageRulesProps) {
    const [naturalInput, setNaturalInput] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [suggestion, setSuggestion] = useState<BusinessRule | null>(null);
    const [confidence, setConfidence] = useState(0);

    // Example natural language patterns
    const examplePatterns = [
        {
            pattern: "Tasks A and B must run together",
            description: "Creates a co-execution rule",
            example: "Task-001 and Task-002 must run together"
        },
        {
            pattern: "Workers in group X can only work Y hours per phase",
            description: "Creates a load limit rule",
            example: "Workers in Senior group can only work 6 hours per phase"
        },
        {
            pattern: "Task X should only run in phases Y and Z",
            description: "Creates a phase window rule",
            example: "Task-003 should only run in phases 2 and 3"
        },
        {
            pattern: "Group X needs at least Y common slots",
            description: "Creates a slot restriction rule",
            example: "Client group Premium needs at least 3 common slots"
        }
    ];

    // Pattern recognition and rule parsing
    const parseNaturalLanguage = async (input: string): Promise<{ rule: BusinessRule | null, confidence: number }> => {
        const cleanInput = input.toLowerCase().trim();
        
        // Simple pattern matching (in a real app, this would use NLP/AI)
        
        // Co-execution pattern: "tasks X and Y must run together"
        const coRunPattern = /tasks?\s+([\w-]+)\s+and\s+([\w-]+)\s+must\s+run\s+together/i;
        const coRunMatch = cleanInput.match(coRunPattern);
        if (coRunMatch) {
            return {
                rule: {
                    id: `rule_${Date.now()}`,
                    type: 'coRun',
                    name: `Co-execution: ${coRunMatch[1]} + ${coRunMatch[2]}`,
                    enabled: true,
                    priority: 5,
                    parameters: {
                        tasks: [coRunMatch[1], coRunMatch[2]],
                        enforcement: 'strict',
                        description: `Tasks ${coRunMatch[1]} and ${coRunMatch[2]} must execute together`
                    }
                },
                confidence: 0.9
            };
        }

        // Load limit pattern: "workers in X group can only work Y hours per phase"
        const loadPattern = /workers?\s+in\s+([\w\s]+)\s+group\s+can\s+only\s+work\s+(\d+)\s+hours?\s+per\s+phase/i;
        const loadMatch = cleanInput.match(loadPattern);
        if (loadMatch) {
            return {
                rule: {
                    id: `rule_${Date.now()}`,
                    type: 'loadLimit',
                    name: `Load Limit: ${loadMatch[1]} Group`,
                    enabled: true,
                    priority: 4,
                    parameters: {
                        workerGroup: loadMatch[1].trim(),
                        maxSlotsPerPhase: parseInt(loadMatch[2]),
                        enforcement: 'strict',
                        description: `Workers in ${loadMatch[1]} group limited to ${loadMatch[2]} hours per phase`
                    }
                },
                confidence: 0.85
            };
        }

        // Phase window pattern: "task X should only run in phases Y and Z"
        const phasePattern = /task\s+([\w-]+)\s+should\s+only\s+run\s+in\s+phases?\s+([\d\s,and]+)/i;
        const phaseMatch = cleanInput.match(phasePattern);
        if (phaseMatch) {
            const phases = phaseMatch[2].match(/\d+/g)?.map(p => parseInt(p)) || [];
            return {
                rule: {
                    id: `rule_${Date.now()}`,
                    type: 'phaseWindow',
                    name: `Phase Window: ${phaseMatch[1]}`,
                    enabled: true,
                    priority: 3,
                    parameters: {
                        taskId: phaseMatch[1],
                        allowedPhases: phases,
                        enforcement: 'preferred',
                        description: `Task ${phaseMatch[1]} restricted to phases ${phases.join(', ')}`
                    }
                },
                confidence: 0.8
            };
        }

        // Slot restriction pattern: "group X needs at least Y common slots"
        const slotPattern = /([\w\s]+)\s+group\s+needs\s+at\s+least\s+(\d+)\s+common\s+slots?/i;
        const slotMatch = cleanInput.match(slotPattern);
        if (slotMatch) {
            return {
                rule: {
                    id: `rule_${Date.now()}`,
                    type: 'slotRestriction',
                    name: `Slot Requirement: ${slotMatch[1]} Group`,
                    enabled: true,
                    priority: 4,
                    parameters: {
                        targetGroup: slotMatch[1].trim(),
                        groupType: 'client',
                        minCommonSlots: parseInt(slotMatch[2]),
                        enforcement: 'strict',
                        description: `${slotMatch[1]} group requires at least ${slotMatch[2]} common available slots`
                    }
                },
                confidence: 0.75
            };
        }

        return { rule: null, confidence: 0 };
    };

    const handleNaturalInput = async () => {
        if (!naturalInput.trim()) return;
        
        setIsProcessing(true);
        
        try {
            const { rule, confidence } = await parseNaturalLanguage(naturalInput);
            
            if (rule) {
                setSuggestion(rule);
                setConfidence(confidence);
            } else {
                setSuggestion(null);
                setConfidence(0);
            }
        } catch (error) {
            console.error('Error parsing natural language:', error);
            setSuggestion(null);
            setConfidence(0);
        }
        
        setIsProcessing(false);
    };

    const acceptSuggestion = () => {
        if (suggestion) {
            onRuleGenerated(suggestion);
            setSuggestion(null);
            setNaturalInput('');
            setConfidence(0);
        }
    };

    const getDataSuggestions = () => {
        const suggestions = [];
        
        // Suggest based on actual data
        if (appData.tasks.length >= 2) {
            const taskIds = appData.tasks.slice(0, 2).map(t => t.TaskID);
            suggestions.push(`Tasks ${taskIds[0]} and ${taskIds[1]} must run together`);
        }
        
        if (appData.workers.length > 0) {
            const workerGroups = [...new Set(appData.workers.map(w => w.WorkerGroup).filter(Boolean))];
            if (workerGroups.length > 0) {
                suggestions.push(`Workers in ${workerGroups[0]} group can only work 8 hours per phase`);
            }
        }
        
        if (appData.clients.length > 0) {
            const clientGroups = [...new Set(appData.clients.map(c => c.GroupTag).filter(Boolean))];
            if (clientGroups.length > 0) {
                suggestions.push(`${clientGroups[0]} group needs at least 4 common slots`);
            }
        }
        
        if (appData.tasks.length > 0) {
            const taskId = appData.tasks[0].TaskID;
            suggestions.push(`Task ${taskId} should only run in phases 1 and 2`);
        }
        
        return suggestions.slice(0, 4);
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
                <FaMagic className="text-purple-600 text-xl" />
                <h2 className="text-xl font-semibold">🧙 Natural Language Rule Creator</h2>
            </div>

            {/* Input Section */}
            <div className="mb-6">
                <div className="flex gap-2 mb-4">
                    <input
                        type="text"
                        value={naturalInput}
                        onChange={(e) => setNaturalInput(e.target.value)}
                        placeholder="Describe your business rule in plain English..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && handleNaturalInput()}
                    />
                    <button
                        onClick={handleNaturalInput}
                        disabled={isProcessing || !naturalInput.trim()}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
                    >
                        {isProcessing ? <FaSpinner className="animate-spin" /> : <FaMagic />}
                        {isProcessing ? 'Parsing...' : 'Generate Rule'}
                    </button>
                </div>

                {/* Data-Based Suggestions */}
                {getDataSuggestions().length > 0 && (
                    <div className="mb-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Suggestions based on your data:</h4>
                        <div className="flex flex-wrap gap-2">
                            {getDataSuggestions().map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => setNaturalInput(suggestion)}
                                    className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm hover:bg-blue-200 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Suggestion Result */}
            {suggestion && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-green-900">✨ Generated Rule</h4>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-green-700">
                                Confidence: {(confidence * 100).toFixed(0)}%
                            </span>
                            <div className={`w-12 h-2 bg-gray-200 rounded-full overflow-hidden`}>
                                <div 
                                    className={`h-full transition-all duration-300 ${
                                        confidence >= 0.8 ? 'bg-green-500' : 
                                        confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${confidence * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                        <h5 className="font-medium text-gray-900">{suggestion.name}</h5>
                        <p className="text-sm text-gray-600 mt-1">{suggestion.parameters?.description}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                            <span>Type: {suggestion.type}</span>
                            <span>Priority: {suggestion.priority}/5</span>
                            <span>Enforcement: {suggestion.parameters?.enforcement}</span>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3">
                        <button
                            onClick={acceptSuggestion}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                            <FaCheck /> Accept Rule
                        </button>
                        <button
                            onClick={() => setSuggestion(null)}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* No Match Message */}
            {naturalInput && !isProcessing && !suggestion && naturalInput.length > 10 && (
                <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                        <FaLightbulb />
                        <span className="font-medium">Couldn't understand that pattern</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                        Try using one of the example patterns below, or be more specific about tasks, workers, or groups.
                    </p>
                </div>
            )}

            {/* Example Patterns */}
            <div>
                <h3 className="font-medium mb-3">📋 Supported Patterns</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examplePatterns.map((pattern, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3">
                            <h4 className="font-medium text-sm text-gray-900 mb-1">{pattern.description}</h4>
                            <p className="text-xs text-gray-600 mb-2">Pattern: "{pattern.pattern}"</p>
                            <button
                                onClick={() => setNaturalInput(pattern.example)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                            >
                                Try: "{pattern.example}"
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Statistics */}
            <div className="mt-6 pt-4 border-t text-center">
                <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                        <div className="font-bold text-purple-600">{existingRules.length}</div>
                        <div className="text-gray-600">Total Rules</div>
                    </div>
                    <div>
                        <div className="font-bold text-green-600">{existingRules.filter(r => r.enabled).length}</div>
                        <div className="text-gray-600">Active Rules</div>
                    </div>
                    <div>
                        <div className="font-bold text-blue-600">
                            {getDataSuggestions().length}
                        </div>
                        <div className="text-gray-600">Data Suggestions</div>
                    </div>
                </div>
            </div>
        </div>
    );
} 