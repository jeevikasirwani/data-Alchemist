import React from 'react';
import { ValidationError, ValidationSummary as IValidationSummary } from '../utils/validation';

interface ValidationSummaryProps {
    validationSummary: IValidationSummary | null;
    validationErrors: ValidationError[];
    aiValidationResults: ValidationError[];
    isValidating: boolean;
}

const ValidationSummary: React.FC<ValidationSummaryProps> = ({
    validationSummary,
    validationErrors,
    aiValidationResults,
    isValidating
}) => {
    const totalErrors = validationErrors.length;
    const aiErrors = aiValidationResults.length;
    const traditionalErrors = totalErrors - aiErrors;

    if (isValidating) {
        return (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">🔍 Validation in Progress</h3>
                <p className="text-blue-700">Running traditional and AI validation...</p>
            </div>
        );
    }

    if (!validationSummary && totalErrors === 0) {
        return (
            <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-600 mb-2">📊 Validation Summary</h3>
                <p className="text-gray-500">No data uploaded yet</p>
            </div>
        );
    }

    return (
        <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">📊 Validation Summary</h3>
            
            {validationSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-green-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                            {(validationSummary.validationScore || 0).toFixed(0)}%
                        </div>
                        <div className="text-sm text-green-800">Validation Score</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                            {validationSummary.totalErrors || 0}
                        </div>
                        <div className="text-sm text-blue-800">Total Errors</div>
                    </div>
                    <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                            {validationSummary.totalWarnings || 0}
                        </div>
                        <div className="text-sm text-orange-800">Warnings</div>
                    </div>
                </div>
            )}

            {/* Error Breakdown */}
            {totalErrors > 0 && (
                <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Error Breakdown</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                            <span className="text-orange-800">Traditional Validation</span>
                            <span className="font-bold text-orange-600">{traditionalErrors}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 bg-purple-50 rounded">
                            <span className="text-purple-800">AI Validation</span>
                            <span className="font-bold text-purple-600">{aiErrors}</span>
                        </div>
                    </div>
                    <div className="mt-2 p-2 bg-gray-50 rounded">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-800 font-medium">Total Issues Found</span>
                            <span className="font-bold text-red-600">{totalErrors}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Enhancement Notice */}
            {aiErrors > 0 && (
                <div className="mt-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center mb-2">
                        <span className="text-purple-600 font-medium">🤖 AI Enhancement Active</span>
                    </div>
                    <p className="text-sm text-purple-700">
                        AI found {aiErrors} additional data quality issues that traditional validation missed.
                        These include pattern anomalies, cross-reference issues, and business logic violations.
                    </p>
                </div>
            )}

            {totalErrors === 0 && validationSummary && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center">
                        <span className="text-green-600 font-medium">✅ All Data Valid</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                        All records passed both traditional and AI validation checks.
                    </p>
                </div>
            )}
        </div>
    );
};

export default ValidationSummary; 