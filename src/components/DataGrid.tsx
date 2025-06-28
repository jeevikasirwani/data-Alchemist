// I designed a table-based grid that:
// Uses React state to track which cell is being edited
// Provides visual feedback for validation errors (red background)
// Supports keyboard navigation (Enter to save, Escape to cancel)
// Dynamically generates headers based on entity type
// Maintains data integrity during editing

import React, { useState } from 'react';

interface DataGridProps {
    data: any[];
    entityType: 'client' | 'worker' | 'task';
    onDataChange: (updatedData: any[]) => void;
    validationErrors: any[];
}

interface ValidationError {
    row: number;
    column: string;
    message: string;
    type: 'error' | 'warning';
}

export default function DataGrid({ data, entityType, onDataChange, validationErrors }: DataGridProps) {
    const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const getHeaders = () => {
        switch (entityType) {
            case 'client':
                return ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
            case 'worker':
                return ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
            case 'task':
                return ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];
            default:
                return [];
        }
    };

    const handleCellEdit = (rowIndex: number, column: string, value: any) => {
        const updatedData = [...data];
        updatedData[rowIndex] = { ...updatedData[rowIndex], [column]: value };
        onDataChange(updatedData);
    };

    const startEditing = (rowIndex: number, column: string, value: any) => {
        setEditingCell({ row: rowIndex, column });
        setEditValue(String(value || ''));
    };

    const saveEdit = () => {
        if (editingCell) {
            handleCellEdit(editingCell.row, editingCell.column, editValue);
            setEditingCell(null);
            setEditValue('');
        }
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const getCellError = (rowIndex: number, column: string) => {
        return validationErrors.find((error: ValidationError) => error.row === rowIndex && error.column === column);
    };

    const headers = getHeaders();

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-300">
                <thead>
                    <tr className="bg-gray-50">
                        {headers.map((header) => (
                            <th key={header} className="px-4 py-2 border-b text-left font-semibold text-gray-700">
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => (
                        <tr key={rowIndex} className="hover:bg-gray-50">
                            {headers.map((header) => {
                                const error = getCellError(rowIndex, header);
                                const isEditing = editingCell?.row === rowIndex && editingCell?.column === header;
                                
                                return (
                                    <td 
                                        key={header} 
                                        className={`px-4 py-2 border-b ${error ? 'bg-red-50 border-red-300' : ''}`}
                                        onClick={() => startEditing(rowIndex, header, row[header])}
                                    >
                                        {isEditing ? (
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') saveEdit();
                                                        if (e.key === 'Escape') cancelEdit();
                                                    }}
                                                    className="flex-1 px-2 py-1 border rounded"
                                                    autoFocus
                                                />
                                            </div>
                                        ) : (
                                            <div className="cursor-pointer">
                                                {String(row[header] || '')}
                                                {error && (
                                                    <div className="text-xs text-red-600 mt-1">
                                                        {error.message}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

