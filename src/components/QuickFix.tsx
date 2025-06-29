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
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
                <FaWrench className="text-yellow-600" />
                <h4 className="font-medium text-yellow-900">Quick Fix: Missing Task References</h4>
                <span className="bg-yellow-200 text-yellow-800 px-2 py-1 rounded-full text-xs">
                    {missingTaskErrors.length} errors
                </span>
            </div>

            <div className="space-y-3">
                {missingTaskErrors.map((error, index) => {
                    const missingTaskId = getMissingTaskId(error.message);
                    const clientName = data[error.row]?.ClientName || `Row ${error.row + 1}`;
                    const similarTasks = getSimilarTasks(missingTaskId);
                    const isFixing = fixingRow === error.row;

                    return (
                        <div key={index} className="bg-white p-3 rounded border">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <span className="font-medium">{clientName}</span>
                                    <span className="text-sm text-gray-600 ml-2">
                                        Missing TaskID: <code className="bg-red-100 text-red-800 px-1 rounded">{missingTaskId}</code>
                                    </span>
                                </div>
                                <div className="flex gap-1">
                                    {!isFixing && (
                                        <>
                                            <button
                                                onClick={() => setFixingRow(error.row)}
                                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                                title="Replace with another task"
                                            >
                                                <FaEdit />
                                            </button>
                                            <button
                                                onClick={() => fixByRemoving(error.row, missingTaskId)}
                                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                                title="Remove this task ID"
                                            >
                                                <FaTrash />
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {isFixing && (
                                <div className="mt-3 p-3 bg-gray-50 rounded">
                                    <h5 className="text-sm font-medium mb-2">Replace with:</h5>
                                    
                                    {/* Similar tasks suggestions */}
                                    {similarTasks.length > 0 && (
                                        <div className="mb-3">
                                            <p className="text-xs text-gray-600 mb-1">Suggested (similar tasks):</p>
                                            <div className="flex flex-wrap gap-1">
                                                {similarTasks.map((item, idx) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setReplacementTaskId(item.taskId)}
                                                        className={`px-2 py-1 text-xs rounded transition-colors ${
                                                            replacementTaskId === item.taskId
                                                                ? 'bg-blue-500 text-white'
                                                                : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                                        }`}
                                                    >
                                                        {item.taskId} ({(item.similarity * 100).toFixed(0)}%)
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Manual input */}
                                    <div className="flex gap-2">
                                        <select
                                            value={replacementTaskId}
                                            onChange={(e) => setReplacementTaskId(e.target.value)}
                                            className="flex-1 px-2 py-1 text-sm border rounded"
                                        >
                                            <option value="">Select replacement task...</option>
                                            {getAvailableTaskIds().map(taskId => (
                                                <option key={taskId} value={taskId}>{taskId}</option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => fixByReplacing(error.row, missingTaskId, replacementTaskId)}
                                            disabled={!replacementTaskId}
                                            className="px-2 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-400"
                                        >
                                            <FaCheck />
                                        </button>
                                        <button
                                            onClick={() => {
                                                setFixingRow(null);
                                                setReplacementTaskId('');
                                            }}
                                            className="px-2 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
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

            <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                <p><strong>Quick Fix Options:</strong></p>
                <ul className="text-xs list-disc list-inside mt-1 space-y-1">
                    <li><FaEdit className="inline mr-1" /> Replace with valid TaskID</li>
                    <li><FaTrash className="inline mr-1" /> Remove invalid TaskID from client's requests</li>
                </ul>
            </div>
        </div>
    );
} 