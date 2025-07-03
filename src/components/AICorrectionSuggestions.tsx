import React, { useState } from 'react';
import { CorrectionSuggestion } from '../utils/ai-data-corrector-simplified';

interface AICorrectionSuggestionsProps {
    suggestions: CorrectionSuggestion[];
    onApplyCorrection: (suggestion: CorrectionSuggestion) => void;
    onDismiss?: (suggestion: CorrectionSuggestion) => void;
}

const AICorrectionSuggestions: React.FC<AICorrectionSuggestionsProps> = ({
    suggestions,
    onApplyCorrection,
    onDismiss
}) => {
    const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

    if (suggestions.length === 0) {
        return null;
    }

    const handleApply = (suggestion: CorrectionSuggestion) => {
        const suggestionKey = `${suggestion.error.row}-${suggestion.error.column}-${suggestion.error.entityType}`;
        setAppliedSuggestions(prev => new Set([...prev, suggestionKey]));
        onApplyCorrection(suggestion);
    };

    const getSuggestionKey = (suggestion: CorrectionSuggestion) => 
        `${suggestion.error.row}-${suggestion.error.column}-${suggestion.error.entityType}`;

    const activeSuggestions = suggestions.filter(s => !appliedSuggestions.has(getSuggestionKey(s)));

    return (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                    <span className="text-2xl">🤖</span>
                    AI Correction Suggestions ({activeSuggestions.length})
                </h3>
                {activeSuggestions.length > 0 && (
                    <div className="text-sm text-gray-500">
                        Click "Apply" to fix errors automatically
                    </div>
                )}
            </div>

            {activeSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">✅</div>
                    <p>All suggestions have been applied!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {activeSuggestions.map((suggestion, index) => (
                        <SuggestionCard
                            key={`${getSuggestionKey(suggestion)}-${index}`}
                            suggestion={suggestion}
                            onApply={() => handleApply(suggestion)}
                            onDismiss={onDismiss ? () => onDismiss(suggestion) : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

interface SuggestionCardProps {
    suggestion: CorrectionSuggestion;
    onApply: () => void;
    onDismiss?: () => void;
}

const SuggestionCard: React.FC<SuggestionCardProps> = ({ suggestion, onApply, onDismiss }) => {
    const [isApplying, setIsApplying] = useState(false);

    const handleApply = async () => {
        setIsApplying(true);
        try {
            await onApply();
        } finally {
            setIsApplying(false);
        }
    };

    const getEntityColor = (entityType: string) => {
        switch (entityType) {
            case 'client': return 'bg-blue-50 border-blue-200 text-blue-800';
            case 'worker': return 'bg-green-50 border-green-200 text-green-800';
            case 'task': return 'bg-purple-50 border-purple-200 text-purple-800';
            default: return 'bg-gray-50 border-gray-200 text-gray-800';
        }
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.8) return 'text-green-600 bg-green-50 border-green-200';
        if (confidence >= 0.6) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    const getActionColor = (action: string) => {
        return action === 'auto-fix' 
            ? 'bg-green-100 text-green-700 border-green-200'
            : 'bg-yellow-100 text-yellow-700 border-yellow-200';
    };

    return (
        <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    {/* Header with entity type and location */}
                    <div className="flex items-center gap-3 mb-3">
                        <span className={`text-sm font-semibold px-3 py-1 rounded-lg ${getEntityColor(suggestion.error.entityType)}`}>
                            {suggestion.error.entityType} - Row {suggestion.error.row}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                            {suggestion.error.column}
                        </span>
                    </div>

                    {/* Issue description */}
                    <div className="space-y-3">
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-sm text-red-800">
                                <strong className="text-red-900">Issue:</strong> {suggestion.error.message}
                            </p>
                        </div>

                        {/* AI suggestion */}
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong className="text-blue-900">Suggestion:</strong> {suggestion.suggestion}
                            </p>
                        </div>

                        {/* Proposed value */}
                        {suggestion.correctedValue !== undefined && (
                            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-sm text-green-800">
                                    <strong className="text-green-900">Proposed value:</strong>{' '}
                                    <code className="px-2 py-1 bg-green-100 rounded text-green-900 font-mono text-xs">
                                        {Array.isArray(suggestion.correctedValue) 
                                            ? suggestion.correctedValue.join(', ')
                                            : String(suggestion.correctedValue)
                                        }
                                    </code>
                                </p>
                            </div>
                        )}

                        {/* AI reasoning */}
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-sm text-gray-700">
                                <strong className="text-gray-900">AI Reasoning:</strong> {suggestion.reasoning}
                            </p>
                        </div>
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 mt-4">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getConfidenceColor(suggestion.confidence)}`}>
                            {Math.round(suggestion.confidence * 100)}% confident
                        </span>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium border ${getActionColor(suggestion.action)}`}>
                            {suggestion.action === 'auto-fix' ? '🤖 Auto-fix' : '👁️ Review needed'}
                        </span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-col gap-2 ml-4">
                    <button
                        onClick={handleApply}
                        disabled={isApplying}
                        className={`px-6 py-3 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-sm hover:shadow-md ${
                            isApplying 
                                ? 'bg-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                    >
                        {isApplying ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Applying...
                            </div>
                        ) : (
                            'Apply'
                        )}
                    </button>

                    {onDismiss && (
                        <button
                            onClick={onDismiss}
                            className="px-6 py-2 text-gray-600 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-all duration-200"
                        >
                            Dismiss
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AICorrectionSuggestions; 