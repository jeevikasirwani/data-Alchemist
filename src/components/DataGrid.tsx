// I designed a table-based grid that:
// Uses React state to track which cell is being edited
// Provides visual feedback for validation errors (red background)
// Supports keyboard navigation (Enter to save, Escape to cancel)
// Dynamically generates headers based on entity type
// Maintains data integrity during editing

import React, { useState } from 'react';
import QuickFix from './QuickFix';
import { ValidationError } from '../utils/validation';
import { Client, Worker, Task, EntityType, AppData } from '../types';

interface DataGridProps {
    data: Client[] | Worker[] | Task[];
    entityType: EntityType;
    onDataChange: (updatedData: Client[] | Worker[] | Task[]) => void;
    validationErrors: ValidationError[];
    allData?: AppData;
}

export default function DataGrid({ data, entityType, onDataChange, validationErrors = [], allData }: DataGridProps) {
    const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const getHeaders = (): string[] => {
        switch (entityType) {
            case 'client':
                return ['ClientId', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'];
            case 'worker':
                return ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'];
            case 'task':
                return ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent'];
            default:
                return [];
        }
    };

    const handleCellEdit = (rowIndex: number, column: string, value: string) => {
        const updatedData = [...data];
        
        // Type-safe update based on entity type
        switch (entityType) {
            case 'client': {
                const clientData = updatedData as Client[];
                clientData[rowIndex] = { ...clientData[rowIndex], [column]: value };
                onDataChange(clientData);
                break;
            }
            case 'worker': {
                const workerData = updatedData as Worker[];
                workerData[rowIndex] = { ...workerData[rowIndex], [column]: value };
                onDataChange(workerData);
                break;
            }
            case 'task': {
                const taskData = updatedData as Task[];
                taskData[rowIndex] = { ...taskData[rowIndex], [column]: value };
                onDataChange(taskData);
                break;
            }
        }
    };

    const startEditing = (rowIndex: number, column: string, value: unknown) => {
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

    const getCellError = (rowIndex: number, column: string): ValidationError | undefined => {
        return validationErrors?.find((error: ValidationError) => error.row === rowIndex && error.column === column);
    };

    const getCellValue = (row: Client | Worker | Task, header: string): unknown => {
        return (row as unknown as Record<string, unknown>)[header];
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
                                const cellValue = getCellValue(row, header);
                                
                                return (
                                    <td 
                                        key={header} 
                                        className={`px-4 py-2 border-b ${error ? 'bg-red-50 border-red-300' : ''}`}
                                        onClick={() => startEditing(rowIndex, header, cellValue)}
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
                                                {String(cellValue || '')}
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

            {/* QuickFix for missing task references (only for clients) */}
            {entityType === 'client' && allData?.tasks && (
                <QuickFix
                    errors={validationErrors
                        .filter(e => e.type !== 'critical' && e.entityType !== 'system')
                        .map(e => ({
                            row: e.row,
                            column: e.column,
                            message: e.message,
                            type: e.type as 'error' | 'warning',
                            entityType: e.entityType as 'client' | 'worker' | 'task'
                        }))}
                    data={data as Client[]}
                    availableTasks={allData.tasks}
                    onDataChange={(updatedData) => onDataChange(updatedData as Client[])}
                />
            )}
        </div>
    );
}

