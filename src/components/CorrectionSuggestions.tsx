import React from 'react';
import { CorrectionSuggestion } from '../utils/ai-data-corrector';
import { EnhancedCorrectionSuggestion } from '../utils/ai';

interface CorrectionSuggestionsProps {
    correctionSuggestions: CorrectionSuggestion[];
    enhancedCorrections: EnhancedCorrectionSuggestion[];
    onApplyCorrection: (suggestion: CorrectionSuggestion) => void;
    onApplyEnhancedCorrection: (suggestion: EnhancedCorrectionSuggestion) => void;
}

const CorrectionSuggestions: React.FC<CorrectionSuggestionsProps> = ({
    correctionSuggestions,
    enhancedCorrections,
    onApplyCorrection,
    onApplyEnhancedCorrection
}) => {
    const totalSuggestions = correctionSuggestions.length + enhancedCorrections.length;
    
    console.log('🔧 CorrectionSuggestions rendered:', { 
        basicSuggestions: correctionSuggestions.length, 
        enhancedSuggestions: enhancedCorrections.length,
        totalSuggestions 
    });

    if (totalSuggestions === 0) {
        return null;
    }

    return (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                🤖 AI Correction Suggestions ({totalSuggestions})
            </h3>

            {/* Basic Corrections */}
            {correctionSuggestions.length > 0 && (
                <div className="mb-4">
                    <h4 className="font-medium text-gray-800 mb-2">Basic Corrections</h4>
                    <div className="space-y-2">
                        {correctionSuggestions.map((suggestion, index) => (
                            <div key={index} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-blue-800">
                                                {suggestion.error.entityType} - Row {suggestion.error.row}
                                            </span>
                                            <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded">
                                                {suggestion.error.column}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">
                                            <strong>Issue:</strong> {suggestion.error.message}
                                        </p>
                                        <p className="text-sm text-blue-700">
                                            <strong>Suggestion:</strong> {suggestion.suggestion}
                                        </p>
                                        {suggestion.correctedValue && (
                                            <p className="text-sm text-green-700 mt-1">
                                                <strong>Proposed value:</strong> {suggestion.correctedValue}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-gray-500">
                                                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                suggestion.action === 'auto-fix' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {suggestion.action}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            console.log('🔧 Apply button clicked for suggestion:', suggestion);
                                            onApplyCorrection(suggestion);
                                        }}
                                        className="ml-3 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Enhanced Corrections */}
            {enhancedCorrections.length > 0 && (
                <div>
                    <h4 className="font-medium text-gray-800 mb-2">Enhanced AI Corrections</h4>
                    <div className="space-y-2">
                        {enhancedCorrections.map((suggestion, index) => (
                            <div key={index} className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-medium text-purple-800">
                                                {suggestion.error.entityType} - Row {suggestion.error.row}
                                            </span>
                                            <span className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded">
                                                {suggestion.error.column}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-700 mb-2">
                                            <strong>Issue:</strong> {suggestion.error.message}
                                        </p>
                                        <p className="text-sm text-purple-700">
                                            <strong>AI Suggestion:</strong> {suggestion.suggestion}
                                        </p>
                                        {suggestion.explanation && (
                                            <p className="text-sm text-gray-600 mt-1">
                                                <strong>Reasoning:</strong> {suggestion.explanation}
                                            </p>
                                        )}
                                        {suggestion.correctedValue && (
                                            <p className="text-sm text-green-700 mt-1">
                                                <strong>Proposed value:</strong> {suggestion.correctedValue}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-2 mt-2">
                                            <span className="text-xs text-gray-500">
                                                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${
                                                suggestion.action === 'auto-fix' 
                                                    ? 'bg-green-100 text-green-700' 
                                                    : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                                {suggestion.action}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            console.log('🔧 Enhanced Apply button clicked for suggestion:', suggestion);
                                            onApplyEnhancedCorrection(suggestion);
                                        }}
                                        className="ml-3 px-3 py-1 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 transition-colors"
                                    >
                                        Apply
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CorrectionSuggestions; 