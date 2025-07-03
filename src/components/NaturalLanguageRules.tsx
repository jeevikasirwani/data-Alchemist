import React, { useState } from 'react';
import { FaMagic, FaLightbulb, FaCheck, FaSpinner, FaRobot, FaBrain } from 'react-icons/fa';
import { BusinessRule } from './RuleBuilder';
import { AppData } from '../types';
import { generateWithAI, naturalLanguageToRule, generateRuleRecommendations, isAIAvailable } from '../utils/ai-helper';

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
    const [aiRecommendations, setAiRecommendations] = useState<string[]>([]);
    const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

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

    // Enhanced pattern recognition with AI support
    const parseNaturalLanguage = async (input: string): Promise<{ rule: BusinessRule | null, confidence: number }> => {
        const cleanInput = input.toLowerCase().trim();
        
        // First try AI-powered parsing
        try {
            const aiAvailable = await isAIAvailable();
            if (aiAvailable) {
                const aiRule = await naturalLanguageToRule(input);
                if (aiRule && aiRule.name && aiRule.field !== 'unknown') {
                    return {
                        rule: {
                            id: `rule_${Date.now()}`,
                            type: 'patternMatch', // Use patternMatch as fallback for AI-generated rules
                            name: aiRule.name,
                            enabled: true,
                            priority: 3,
                            parameters: {
                                regex: aiRule.condition,
                                template: aiRule.message,
                                parameters: { field: aiRule.field },
                                description: aiRule.description,
                                enforcement: 'strict'
                            }
                        },
                        confidence: 0.85
                    };
                }
            }
        } catch (error) {
            console.warn('AI parsing failed, falling back to pattern matching:', error);
        }
        
        // Fallback to pattern matching
        
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

    const generateAIRecommendations = async () => {
        if (appData.clients.length === 0 && appData.workers.length === 0 && appData.tasks.length === 0) {
            return;
        }

        setIsLoadingRecommendations(true);
        try {
            const allData = [...appData.clients, ...appData.workers, ...appData.tasks];
            const recommendations = await generateRuleRecommendations(allData);
            setAiRecommendations(recommendations);
        } catch (error) {
            console.warn('Failed to generate AI recommendations:', error);
            setAiRecommendations([]);
        } finally {
            setIsLoadingRecommendations(false);
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
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-4 mb-8">
                <FaMagic className="text-purple-600 text-2xl" />
                <h2 className="text-2xl font-bold text-gray-900">🧙 Natural Language Rule Creator</h2>
            </div>

            {/* Input Section */}
            <div className="mb-8">
                <div className="flex gap-4 mb-6">
                    <input
                        type="text"
                        value={naturalInput}
                        onChange={(e) => setNaturalInput(e.target.value)}
                        placeholder="Describe your business rule in plain English..."
                        className="flex-1 px-5 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all duration-200 shadow-sm hover:shadow-md text-lg"
                        onKeyPress={(e) => e.key === 'Enter' && handleNaturalInput()}
                    />
                    <button
                        onClick={handleNaturalInput}
                        disabled={isProcessing || !naturalInput.trim()}
                        className="px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-3 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                        {isProcessing ? <FaSpinner className="animate-spin text-lg" /> : <FaMagic className="text-lg" />}
                        {isProcessing ? 'Parsing...' : 'Generate Rule'}
                    </button>
                </div>

                {/* AI-Powered Rule Recommendations */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <FaBrain className="text-purple-600" />
                            AI Rule Recommendations
                        </h4>
                        <button
                            onClick={generateAIRecommendations}
                            disabled={isLoadingRecommendations || (appData.clients.length === 0 && appData.workers.length === 0 && appData.tasks.length === 0)}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2 transition-all duration-200"
                        >
                            {isLoadingRecommendations ? <FaSpinner className="animate-spin" /> : <FaRobot />}
                            {isLoadingRecommendations ? 'Analyzing...' : 'Get AI Suggestions'}
                        </button>
                    </div>
                    
                    {aiRecommendations.length > 0 && (
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl">
                            <h5 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                                <FaBrain />
                                AI Suggested Rules
                            </h5>
                            <div className="space-y-2">
                                {aiRecommendations.map((recommendation, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setNaturalInput(recommendation)}
                                        className="w-full text-left p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-all duration-200 text-sm text-purple-800"
                                    >
                                        {recommendation}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Data-Based Suggestions */}
                {getDataSuggestions().length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <span>💡</span>
                            Quick suggestions based on your data:
                        </h4>
                        <div className="flex flex-wrap gap-3">
                            {getDataSuggestions().map((suggestion, index) => (
                                <button
                                    key={index}
                                    onClick={() => setNaturalInput(suggestion)}
                                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-xl text-sm hover:bg-blue-200 transition-all duration-200 font-medium border border-blue-200 hover:shadow-sm"
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
                <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-green-900 text-lg flex items-center gap-2">
                            <span>✨</span>
                            Generated Rule
                        </h4>
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-green-700 font-medium">
                                Confidence: {(confidence * 100).toFixed(0)}%
                            </span>
                            <div className="w-16 h-3 bg-gray-200 rounded-full overflow-hidden">
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
                    
                    <div className="bg-white p-5 rounded-xl border border-green-200 shadow-sm">
                        <h5 className="font-semibold text-gray-900 text-lg mb-2">{suggestion.name}</h5>
                        <p className="text-gray-600 mb-3 leading-relaxed">{suggestion.parameters?.description}</p>
                        <div className="flex items-center gap-6 text-sm text-gray-500">
                            <span className="font-medium">Type: <span className="text-gray-700">{suggestion.type}</span></span>
                            <span className="font-medium">Priority: <span className="text-gray-700">{suggestion.priority}/5</span></span>
                            <span className="font-medium">Enforcement: <span className="text-gray-700">{suggestion.parameters?.enforcement}</span></span>
                        </div>
                    </div>
                    
                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={acceptSuggestion}
                            className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            <FaCheck /> Accept Rule
                        </button>
                        <button
                            onClick={() => setSuggestion(null)}
                            className="px-6 py-3 bg-gray-300 text-gray-700 rounded-xl hover:bg-gray-400 font-semibold transition-all duration-200 shadow-sm hover:shadow-md"
                        >
                            Reject
                        </button>
                    </div>
                </div>
            )}

            {/* No Match Message */}
            {naturalInput && !isProcessing && !suggestion && naturalInput.length > 10 && (
                <div className="mb-8 p-5 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl shadow-sm">
                    <div className="flex items-center gap-3 text-yellow-800 mb-2">
                        <FaLightbulb className="text-lg" />
                        <span className="font-semibold text-lg">Couldn't understand that pattern</span>
                    </div>
                    <p className="text-yellow-700 leading-relaxed">
                        Try using one of the example patterns below, or be more specific about tasks, workers, or groups.
                    </p>
                </div>
            )}

            {/* Example Patterns */}
            <div className="mb-8">
                <h3 className="font-semibold mb-6 text-lg flex items-center gap-2">
                    <span>📋</span>
                    Supported Patterns
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {examplePatterns.map((pattern, index) => (
                        <div key={index} className="border border-gray-200 rounded-xl p-5 bg-gradient-to-br from-gray-50 to-blue-50 hover:shadow-md transition-shadow duration-200">
                            <h4 className="font-semibold text-gray-900 mb-2">{pattern.description}</h4>
                            <p className="text-sm text-gray-600 mb-3">Pattern: "{pattern.pattern}"</p>
                            <button
                                onClick={() => setNaturalInput(pattern.example)}
                                className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                            >
                                Try: "{pattern.example}"
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Statistics */}
            <div className="pt-6 border-t border-gray-200 text-center">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
                        <div className="text-2xl font-bold text-purple-600">{existingRules.length}</div>
                        <div className="text-gray-600 font-medium">Total Rules</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                        <div className="text-2xl font-bold text-green-600">{existingRules.filter(r => r.enabled).length}</div>
                        <div className="text-gray-600 font-medium">Active Rules</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                        <div className="text-2xl font-bold text-blue-600">
                            {getDataSuggestions().length}
                        </div>
                        <div className="text-gray-600 font-medium">Quick Suggestions</div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-200">
                        <div className="text-2xl font-bold text-indigo-600">
                            {aiRecommendations.length}
                        </div>
                        <div className="text-gray-600 font-medium">AI Recommendations</div>
                    </div>
                </div>
            </div>
        </div>
    );
} 