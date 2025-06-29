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
                className="w-full p-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 flex items-center justify-center gap-2"
            >
                <span>🔍</span>
                <span className="font-medium">
                    {showQueryInterface ? 'Hide Natural Language Search' : 'Try Natural Language Search'}
                </span>
            </button>

            {showQueryInterface && (
                <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                        🤖 Natural Language Data Search
                    </h3>
                    
                    <div className="mb-4">
                        <textarea
                            value={naturalQuery}
                            onChange={(e) => onQueryChange(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder="Ask about your data in plain English... e.g., 'Show me all clients with high priority tasks' or 'Find workers who are available this week'"
                            className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            rows={3}
                            disabled={isProcessingQuery}
                        />
                        <div className="flex justify-between items-center mt-2">
                            <div className="text-sm text-gray-500">
                                Press Enter to search • Shift+Enter for new line
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={onClearQuery}
                                    className="px-3 py-1 text-gray-600 hover:text-gray-800 transition-colors"
                                    disabled={isProcessingQuery}
                                >
                                    Clear
                                </button>
                                <button
                                    onClick={onExecuteQuery}
                                    disabled={!naturalQuery.trim() || isProcessingQuery}
                                    className="px-4 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isProcessingQuery ? 'Searching...' : 'Search'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Query Results */}
                    {queryResults && (
                        <div className="border-t pt-4">
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
                            <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-purple-800">
                                        Query: {queryResults.query}
                                    </span>
                                </div>
                                {queryResults.aiExplanation && (
                                    <p className="text-sm text-purple-700">
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
                                            <span key={index} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                {filter.field} {filter.operator} {filter.value}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Results Table */}
                            {queryResults.data.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm border border-gray-200 rounded-lg">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                {Object.keys(queryResults.data[0]).map(key => (
                                                    <th key={key} className="px-3 py-2 text-left font-medium text-gray-700 border-b">
                                                        {key}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {queryResults.data.slice(0, 10).map((result, index) => (
                                                <tr key={index} className="hover:bg-gray-50">
                                                    {Object.values(result).map((value, cellIndex) => (
                                                        <td key={cellIndex} className="px-3 py-2 border-b text-gray-700">
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
                                <div className="text-center py-8 text-gray-500">
                                    <span className="text-2xl mb-2 block">🔍</span>
                                    <p>No results found matching your query</p>
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