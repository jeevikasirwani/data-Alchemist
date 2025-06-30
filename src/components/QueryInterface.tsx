import React from 'react';
import { QueryResult } from '../utils/ai';

interface QueryInterfaceProps {
    showQueryInterface: boolean;
    naturalQuery: string;
    queryResults: QueryResult | null;
    isProcessingQuery: boolean;
    onToggleInterface: () => void;
    onQueryChange: (query: string) => void;
    onExecuteQuery: () => void;
    onClearQuery: () => void;
}

const QueryInterface: React.FC<QueryInterfaceProps> = ({
    showQueryInterface,
    naturalQuery,
    queryResults,
    isProcessingQuery,
    onToggleInterface,
    onQueryChange,
    onExecuteQuery,
    onClearQuery
}) => {
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onExecuteQuery();
        }
    };

    return (
        <div className="mb-6">
            <button
                onClick={onToggleInterface}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 flex items-center gap-2 text-sm font-medium shadow-sm"
            >
                <span>🔍</span>
                <span>
                    {showQueryInterface ? 'Hide Natural Language Search' : 'Natural Language Search'}
                </span>
            </button>

            {showQueryInterface && (
                <div className="mt-4 p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Natural Language Data Search
                    </h3>
                    
                    <div className="mb-4">
                        <textarea
                            value={naturalQuery}
                            onChange={(e) => onQueryChange(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your data in plain English... e.g., 'Show me all clients with high priority tasks'"
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200"
                            rows={2}
                            disabled={isProcessingQuery}
                        />
                        <div className="flex justify-between items-center mt-3">
                            <div className="text-xs text-gray-500">
                                Press Enter to search • Shift+Enter for new line
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClearQuery}
                                    className="px-3 py-1 text-gray-600 hover:text-gray-800 text-sm transition-colors"
                                    disabled={isProcessingQuery}
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={onExecuteQuery}
                                    disabled={!naturalQuery.trim() || isProcessingQuery}
                                    className="px-4 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                                >
                                    {isProcessingQuery ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Query Results */}
                    {queryResults && (
                        <div className="border-t border-gray-200 pt-4">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="font-medium text-gray-900">Search Results</h4>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-gray-500">
                                        Found {queryResults.data.length} results
                                    </span>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        Total: {queryResults.totalCount}
                                    </span>
                                </div>
                            </div>

                            {/* Query Explanation */}
                            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-blue-800">
                                        Query: {queryResults.query}
                                    </span>
                                </div>
                                {queryResults.aiExplanation && (
                                    <p className="text-sm text-blue-700">
                                        {queryResults.aiExplanation}
                                    </p>
                                )}
                            </div>

                            {/* Applied Filters */}
                            {queryResults.appliedFilters && queryResults.appliedFilters.length > 0 && (
                                <div className="mb-3">
                                    <h5 className="text-sm font-medium text-gray-700 mb-2">Applied Filters:</h5>
                                    <div className="flex flex-wrap gap-2">
                                        {queryResults.appliedFilters.map((filter, index) => (
                                            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded border border-blue-200">
                                                {filter.field} {filter.operator} {filter.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Results Table */}
                            {queryResults.data.length > 0 ? (
                                <div className="overflow-x-auto bg-gray-50 rounded-lg border border-gray-200">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                {Object.keys(queryResults.data[0]).map(key => (
                                                    <th key={key} className="px-3 py-2 text-left font-medium text-gray-800 border-b">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {queryResults.data.slice(0, 10).map((result, index) => (
                                                <tr key={index} className="hover:bg-gray-50 transition-colors duration-150">
                                                    {Object.values(result).map((value, cellIndex) => (
                                                        <td key={cellIndex} className="px-3 py-2 text-gray-700 border-b">
                                                            {String(value)}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {queryResults.data.length > 10 && (
                                        <p className="text-sm text-gray-500 mt-2 text-center">
                                            Showing first 10 of {queryResults.data.length} results
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
                                    <p className="font-medium">No results found matching your query</p>
                                    <p className="text-sm mt-1">Try rephrasing your search or use different keywords</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default QueryInterface; 