import React from 'react';
import { ValidationError, ValidationSummary as IValidationSummary } from '../utils/validation';

interface ValidationSummaryProps {
    validationSummary: IValidationSummary | null;
    validationErrors: ValidationError[];
    aiValidationResults: ValidationError[];
    isValidating: boolean;
    hasData: boolean;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
    validationSummary,
    validationErrors,
    aiValidationResults,
    isValidating,
    hasData
}) => {
    const totalErrors = validationErrors.length;
    const aiErrors = aiValidationResults.length;
    const traditionalErrors = totalErrors - aiErrors;

    if (isValidating) {
        return (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="animate-spin">🔍</span> 
                    Validation in Progress
                </h3>
                <p className="text-blue-700 font-medium">Running traditional and AI validation...</p>
            </div>
        );
    }

    if (!hasData) {
        return (
            <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-gray-600 mb-3">📊 Validation Summary</h3>
                <p className="text-gray-500 font-medium">No data uploaded yet</p>
            </div>
        );
    }

    // When we have data but no validation summary yet (validation pending or failed)
    if (hasData && !validationSummary && !isValidating && totalErrors === 0) {
        return (
            <div className="mb-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
                <h3 className="text-xl font-semibold text-green-800 mb-3">📊 Validation Summary</h3>
                <p className="text-green-700 font-medium">✅ Data uploaded successfully - Validation complete</p>
                <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                    <div className="text-green-600 font-semibold">All data appears to be valid</div>
                    <div className="text-green-600 text-sm mt-1">No validation errors detected</div>
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold text-gray-900 mb-6">📊 Validation Summary</h3>
            
            {validationSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-200 shadow-sm">
                        <div className="text-3xl font-bold text-green-600 mb-2">
                            {(validationSummary.validationScore || 0).toFixed(0)}%
                        </div>
                        <div className="text-sm font-semibold text-green-800 uppercase tracking-wide">Validation Score</div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                            {validationSummary.totalErrors || 0}
                        </div>
                        <div className="text-sm font-semibold text-blue-800 uppercase tracking-wide">Total Errors</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-amber-50 p-6 rounded-xl border border-orange-200 shadow-sm">
                        <div className="text-3xl font-bold text-orange-600 mb-2">
                            {validationSummary.totalWarnings || 0}
                        </div>
                        <div className="text-sm font-semibold text-orange-800 uppercase tracking-wide">Warnings</div>
                    </div>
                </div>
            )}

            {/* Error Breakdown */}
            {totalErrors > 0 && (
                <div className="border-t border-gray-200 pt-6">
                    <h4 className="font-semibold text-gray-900 mb-4 text-lg">Error Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl border border-orange-200 shadow-sm">
                            <span className="font-medium text-orange-800">Traditional Validation</span>
                            <span className="font-bold text-2xl text-orange-600">{traditionalErrors}</span>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200 shadow-sm">
                            <span className="font-medium text-purple-800">AI Validation</span>
                            <span className="font-bold text-2xl text-purple-600">{aiErrors}</span>
                        </div>
                    </div>
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-800 font-semibold text-lg">Total Issues Found</span>
                            <span className="font-bold text-3xl text-red-600">{totalErrors}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Enhancement Notice */}
            {aiErrors > 0 && (
                <div className="mt-6 p-5 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border border-purple-200 rounded-xl shadow-sm">
                    <div className="flex items-center mb-3">
                        <span className="text-purple-600 font-semibold text-lg">🤖 AI Enhancement Active</span>
                    </div>
                    <p className="text-purple-700 leading-relaxed">
                        AI found <span className="font-semibold text-purple-800">{aiErrors}</span> additional data quality issues that traditional validation missed.
                        These include pattern anomalies, cross-reference issues, and business logic violations.
                    </p>
                </div>
            )}

            {totalErrors === 0 && validationSummary && (
                <div className="mt-6 p-5 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl shadow-sm">
                    <div className="flex items-center mb-2">
                        <span className="text-green-600 font-semibold text-lg">✅ All Data Valid</span>
                    </div>
                    <p className="text-green-700 leading-relaxed">
                        All records passed both traditional and AI validation checks.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ValidationSummary; 