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
            case 'fulfillment': return 'bg-blue-100 text-blue-800';
            case 'fairness': return 'bg-green-100 text-green-800';
            case 'efficiency': return 'bg-yellow-100 text-yellow-800';
            case 'quality': return 'bg-purple-100 text-purple-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const renderSlidersView = () => (
        <div className="space-y-4">
            {weights.map((weight) => (
                <div key={weight.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <h4 className="font-medium">{weight.name}</h4>
                            <p className="text-sm text-gray-600">{weight.description}</p>
                        </div>
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                            {(weight.weight * 100).toFixed(1)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={weight.weight}
                        onChange={(e) => updateWeight(weight.id, parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg"
                    />
                </div>
            ))}
        </div>
    );

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">⚖️ Priority & Weight Configuration</h2>
            
            <div className="mb-6">
                <h3 className="font-medium mb-3">📋 Preset Profiles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {presetProfiles.map((profile) => (
                        <button
                            key={profile.id}
                            onClick={() => onProfileSelect(profile)}
                            className="p-3 border-2 border-gray-200 rounded-lg text-left hover:border-blue-300"
                        >
                            <h4 className="font-medium text-sm mb-1">{profile.name}</h4>
                            <p className="text-xs text-gray-600">{profile.description}</p>
                        </button>
                    ))}
                </div>
            </div>

            {renderSlidersView()}
        </div>
    );
} 