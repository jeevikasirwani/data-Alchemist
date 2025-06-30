import React, { useState } from 'react';
import { FaArrowUp, FaArrowDown, FaBalanceScale, FaSlidersH } from 'react-icons/fa';

export interface PriorityWeight {
    id: string;
    name: string;
    description: string;
    weight: number;
    category: 'fulfillment' | 'fairness' | 'efficiency' | 'quality';
    rank: number;
}

export interface PriorityProfile {
    id: string;
    name: string;
    description: string;
    weights: Record<string, number>;
}

interface PriorityWeightsProps {
    weights: PriorityWeight[];
    onWeightsChange: (weights: PriorityWeight[]) => void;
    onProfileSelect: (profile: PriorityProfile) => void;
}

export default function PriorityWeights({ weights, onWeightsChange, onProfileSelect }: PriorityWeightsProps) {
    const [activeView, setActiveView] = useState<'sliders' | 'ranking' | 'matrix'>('sliders');
    const [selectedProfile, setSelectedProfile] = useState<string>('');

    // Default weights configuration
    const defaultWeights: PriorityWeight[] = [
        {
            id: 'client_priority',
            name: 'Client Priority Level',
            description: 'Higher priority clients get preferential treatment',
            weight: 0.25,
            category: 'fulfillment',
            rank: 1
        },
        {
            id: 'task_fulfillment',
            name: 'Task Fulfillment Rate',
            description: 'Maximize number of requested tasks completed',
            weight: 0.20,
            category: 'fulfillment',
            rank: 2
        },
        {
            id: 'worker_fairness',
            name: 'Worker Load Fairness',
            description: 'Distribute workload evenly among workers',
            weight: 0.15,
            category: 'fairness',
            rank: 3
        },
        {
            id: 'skill_matching',
            name: 'Skill Match Quality',
            description: 'Assign tasks to best-qualified workers',
            weight: 0.15,
            category: 'quality',
            rank: 4
        },
        {
            id: 'phase_efficiency',
            name: 'Phase Efficiency',
            description: 'Minimize idle time and maximize slot utilization',
            weight: 0.10,
            category: 'efficiency',
            rank: 5
        },
        {
            id: 'group_cohesion',
            name: 'Group Cohesion',
            description: 'Keep related tasks and workers together',
            weight: 0.10,
            category: 'efficiency',
            rank: 6
        },
        {
            id: 'deadline_adherence',
            name: 'Deadline Adherence',
            description: 'Prioritize tasks with tight deadlines',
            weight: 0.05,
            category: 'quality',
            rank: 7
        }
    ];

    // Preset profiles
    const presetProfiles: PriorityProfile[] = [
        {
            id: 'maximize_fulfillment',
            name: 'Maximize Fulfillment',
            description: 'Focus on completing as many requested tasks as possible',
            weights: {
                client_priority: 0.35,
                task_fulfillment: 0.30,
                skill_matching: 0.15,
                worker_fairness: 0.10,
                phase_efficiency: 0.05,
                group_cohesion: 0.03,
                deadline_adherence: 0.02
            }
        },
        {
            id: 'fair_distribution',
            name: 'Fair Distribution',
            description: 'Ensure equitable workload distribution among workers',
            weights: {
                worker_fairness: 0.40,
                skill_matching: 0.20,
                task_fulfillment: 0.15,
                client_priority: 0.10,
                phase_efficiency: 0.08,
                group_cohesion: 0.05,
                deadline_adherence: 0.02
            }
        }
    ];

    React.useEffect(() => {
        if (weights.length === 0) {
            onWeightsChange(defaultWeights);
        }
    }, [weights.length, onWeightsChange]);

    const updateWeight = (id: string, newWeight: number) => {
        const updatedWeights = weights.map(w => 
            w.id === id ? { ...w, weight: newWeight } : w
        );
        
        const totalWeight = updatedWeights.reduce((sum, w) => sum + w.weight, 0);
        const normalizedWeights = updatedWeights.map(w => ({
            ...w,
            weight: w.weight / totalWeight
        }));
        
        onWeightsChange(normalizedWeights);
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'fulfillment': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'fairness': return 'bg-green-100 text-green-800 border-green-200';
            case 'efficiency': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'quality': return 'bg-purple-100 text-purple-800 border-purple-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const renderSlidersView = () => (
        <div className="space-y-6">
            {weights.map((weight) => (
                <div key={weight.id} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow duration-200">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900 text-lg">{weight.name}</h4>
                                <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getCategoryColor(weight.category)}`}>
                                    {weight.category}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 leading-relaxed">{weight.description}</p>
                        </div>
                        <div className="ml-6 text-right">
                            <span className="font-mono text-2xl font-bold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 px-4 py-2 rounded-xl border border-gray-300">
                                {(weight.weight * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={weight.weight}
                            onChange={(e) => updateWeight(weight.id, parseFloat(e.target.value))}
                            className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{
                                background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${weight.weight * 100}%, #e5e7eb ${weight.weight * 100}%, #e5e7eb 100%)`
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-200">
            <div className="flex items-center gap-3 mb-8">
                <FaBalanceScale className="text-2xl text-gray-600" />
                <h2 className="text-2xl font-bold text-gray-900">Priority & Weight Configuration</h2>
            </div>
            
            <div className="mb-8">
                <h3 className="font-semibold text-gray-800 mb-4 text-lg flex items-center gap-2">
                    <span>📋</span>
                    Preset Profiles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {presetProfiles.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => onProfileSelect(profile)}
                            className="p-5 border-2 border-gray-200 rounded-xl text-left hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 shadow-sm hover:shadow-md"
                        >
                            <h4 className="font-semibold text-gray-900 mb-2">{profile.name}</h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{profile.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {renderSlidersView()}
        </div>
    );
} 