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
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                AI Correction Suggestions ({totalSuggestions})
            </h3>

            {/* Basic Corrections */}
            {correctionSuggestions.length > 0 && (
                <div className="mb-6">
                    <h4 className="font-semibold text-gray-800 mb-4 text-lg">Basic Corrections</h4>
                    <div className="space-y-4">
                        {correctionSuggestions.map((suggestion, index) => (
                            <div key={index} className="p-5 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-sm font-semibold text-blue-800 px-3 py-1 bg-blue-200 rounded-lg">
                                                {suggestion.error.entityType} - Row {suggestion.error.row}
                                            </span>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                                                {suggestion.error.column}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-700">
                                                <strong className="text-gray-900">Issue:</strong> {suggestion.error.message}
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                <strong className="text-blue-900">Suggestion:</strong> {suggestion.suggestion}
                                            </p>
                                            {suggestion.correctedValue && (
                                                <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                                                    <strong className="text-green-900">Proposed value:</strong> {suggestion.correctedValue}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="text-xs text-gray-500 font-medium">
                                                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                                            </span>
                                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                                suggestion.action === 'auto-fix' 
                                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
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
                                        className="ml-4 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-all duration-200 shadow-sm hover:shadow-md"
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
                    <h4 className="font-semibold text-gray-800 mb-4 text-lg">Enhanced AI Corrections</h4>
                    <div className="space-y-4">
                        {enhancedCorrections.map((suggestion, index) => (
                            <div key={index} className="p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl shadow-sm">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-3">
                                            <span className="text-sm font-semibold text-purple-800 px-3 py-1 bg-purple-200 rounded-lg">
                                                {suggestion.error.entityType} - Row {suggestion.error.row}
                                            </span>
                                            <span className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-medium">
                                                {suggestion.error.column}
                                            </span>
                                        </div>
                                        <div className="space-y-3">
                                            <p className="text-sm text-gray-700">
                                                <strong className="text-gray-900">Issue:</strong> {suggestion.error.message}
                                            </p>
                                            <p className="text-sm text-purple-700">
                                                <strong className="text-purple-900">AI Suggestion:</strong> {suggestion.suggestion}
                                            </p>
                                            {suggestion.explanation && (
                                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                                    <strong className="text-gray-800">Reasoning:</strong> {suggestion.explanation}
                                                </p>
                                            )}
                                            {suggestion.correctedValue && (
                                                <p className="text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-200">
                                                    <strong className="text-green-900">Proposed value:</strong> {suggestion.correctedValue}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 mt-4">
                                            <span className="text-xs text-gray-500 font-medium">
                                                Confidence: {(suggestion.confidence * 100).toFixed(0)}%
                                            </span>
                                            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                                                suggestion.action === 'auto-fix' 
                                                    ? 'bg-green-100 text-green-700 border border-green-200' 
                                                    : 'bg-yellow-100 text-yellow-700 border border-yellow-200'
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
                                        className="ml-4 px-6 py-3 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
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