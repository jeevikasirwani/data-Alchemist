import React, { useState } from 'react';
import { FaWrench, FaTrash, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';

interface QuickFixProps {
    errors: Array<{
        row: number;
        column: string;
        message: string;
        type: 'error' | 'warning';
        entityType: 'client' | 'worker' | 'task';
    }>;
    data: any[];
    availableTasks: any[];
    onDataChange: (updatedData: any[], immediate?: boolean) => void;
}

export default function QuickFix({ errors, data, availableTasks, onDataChange }: QuickFixProps) {
    const [fixingRow, setFixingRow] = useState<number | null>(null);
    const [replacementTaskId, setReplacementTaskId] = useState('');

    // Filter only missing task reference errors
    const missingTaskErrors = errors.filter(error => 
        error.message.includes('not found in tasks')
    );

    if (missingTaskErrors.length === 0) {
        return null;
    }

    const getMissingTaskId = (message: string) => {
        const match = message.match(/TaskID '(\w+)' not found/);
        return match ? match[1] : '';
    };

    const getAvailableTaskIds = () => {
        return availableTasks.map(task => task.TaskID).filter(Boolean);
    };

    const fixByReplacing = (rowIndex: number, oldTaskId: string, newTaskId: string) => {
        const updatedData = [...data];
        const row = { ...updatedData[rowIndex] };
        
        if (Array.isArray(row.RequestedTaskIDs)) {
            row.RequestedTaskIDs = row.RequestedTaskIDs.map((taskId: string) => 
                taskId === oldTaskId ? newTaskId : taskId
            );
        }
        
        updatedData[rowIndex] = row;
        onDataChange(updatedData, true); // immediate validation
        setFixingRow(null);
        setReplacementTaskId('');
        
        console.log(`Fixed: Replaced '${oldTaskId}' with '${newTaskId}' in row ${rowIndex}`);
    };

    const fixByRemoving = (rowIndex: number, taskIdToRemove: string) => {
        const updatedData = [...data];
        const row = { ...updatedData[rowIndex] };
        
        if (Array.isArray(row.RequestedTaskIDs)) {
            row.RequestedTaskIDs = row.RequestedTaskIDs.filter((taskId: string) => 
                taskId !== taskIdToRemove
            );
        }
        
        updatedData[rowIndex] = row;
        onDataChange(updatedData, true); // immediate validation
        
        console.log(`Fixed: Removed '${taskIdToRemove}' from row ${rowIndex}`);
    };

    const getSimilarTasks = (missingTaskId: string) => {
        const availableIds = getAvailableTaskIds();
        return availableIds
            .map(taskId => ({
                taskId,
                similarity: calculateSimilarity(missingTaskId, taskId)
            }))
            .filter(item => item.similarity > 0.4)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3);
    };

    const calculateSimilarity = (str1: string, str2: string): number => {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        
        if (longer.length === 0) return 1.0;
        
        const editDistance = getEditDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    };

    const getEditDistance = (str1: string, str2: string): number => {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
        
        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
        
        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,     // deletion
                    matrix[j - 1][i] + 1,     // insertion
                    matrix[j - 1][i - 1] + indicator // substitution
                );
            }
        }
        
        return matrix[str2.length][str1.length];
    };

    return (
        <div className="mt-6 p-6 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl shadow-lg">
            <div className="flex items-center gap-3 mb-6">
                <FaWrench className="text-yellow-600 text-xl" />
                <h4 className="font-semibold text-yellow-900 text-lg">Quick Fix: Missing Task References</h4>
                <span className="bg-gradient-to-r from-yellow-200 to-orange-200 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                    {missingTaskErrors.length} errors
                </span>
            </div>

            <div className="space-y-4">
                {missingTaskErrors.map((error, index) => {
                    const missingTaskId = getMissingTaskId(error.message);
                    const clientName = data[error.row]?.ClientName || `Row ${error.row + 1}`;
                    const similarTasks = getSimilarTasks(missingTaskId);
                    const isFixing = fixingRow === error.row;

                    return (
                        <div key={index} className="bg-white p-5 rounded-xl border border-gray-200 shadow-md">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex-1">
                                    <span className="font-semibold text-gray-800 text-lg">{clientName}</span>
                                    <div className="text-sm text-gray-600 mt-1">
                                        Missing TaskID: <code className="bg-red-100 text-red-800 px-2 py-1 rounded-md font-mono">{missingTaskId}</code>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {!isFixing && (
                                        <>
                                            <button
                                                onClick={() => setFixingRow(error.row)}
                                                className="p-3 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:shadow-md"
                                                title="Replace with another task"
                                            >
                                                <FaEdit size={16} />
                                            </button>
                                            <button
                                                onClick={() => fixByRemoving(error.row, missingTaskId)}
                                                className="p-3 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:shadow-md"
                                                title="Remove this task ID"
                                            >
                                                <FaTrash size={16} />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isFixing && (
                                <div className="mt-4 p-5 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200">
                                    <h5 className="text-sm font-semibold mb-4 text-gray-800">Replace with:</h5>
                                    
                                    {/* Similar tasks suggestions */}
                                    {similarTasks.length > 0 && (
                                        <div className="mb-4">
                                            <p className="text-xs text-gray-600 mb-3 font-medium">Suggested (similar tasks):</p>
                                            <div className="flex flex-wrap gap-2">
                                                {similarTasks.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setReplacementTaskId(item.taskId)}
                                                        className={`px-3 py-2 text-sm rounded-lg font-medium transition-all duration-200 ${
                                                            replacementTaskId === item.taskId
                                                                ? 'bg-blue-500 text-white shadow-md'
                                                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 hover:shadow-sm'
                                                        }`}
                                                    >
                                                        {item.taskId} ({(item.similarity * 100).toFixed(0)}%)
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual input */}
                                    <div className="flex gap-3">
                                        <select
                                            value={replacementTaskId}
                                            onChange={(e) => setReplacementTaskId(e.target.value)}
                                            className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 shadow-sm"
                                        >
                                            <option value="">Select replacement task...</option>
                                            {getAvailableTaskIds().map(taskId => (
                                                <option key={taskId} value={taskId}>{taskId}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => fixByReplacing(error.row, missingTaskId, replacementTaskId)}
                                            disabled={!replacementTaskId}
                                            className="px-4 py-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                                        >
                                            <FaCheck />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFixingRow(null);
                                                setReplacementTaskId('');
                                            }}
                                            className="px-4 py-3 bg-gray-500 text-white text-sm rounded-lg hover:bg-gray-600 transition-all duration-200 shadow-sm hover:shadow-md"
                                        >
                                            <FaTimes />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 pt-6 border-t border-yellow-200 text-sm text-gray-700">
                <p className="font-semibold mb-3">Quick Fix Options:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <FaEdit className="text-blue-500" />
                        <span>Replace with valid TaskID</span>
                    </div>
                    <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
                        <FaTrash className="text-red-500" />
                        <span>Remove invalid TaskID from client's requests</span>
                    </div>
                </div>
            </div>
        </div>
    );
} 