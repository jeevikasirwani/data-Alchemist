import { useState, useCallback, useRef } from 'react';
import { ValidationEngine, ValidationError, ValidationSummary } from '../utils/validation';
import { Client, Worker, Task, EntityType, AppData } from '../types';

interface DataManagementState {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    validationErrors: ValidationError[];
    validationSummary: ValidationSummary | null;
    isValidating: boolean;
}

export const useDataManagement = () => {
    const [data, setData] = useState<DataManagementState>({
        clients: [],
        workers: [],
        tasks: [],
        validationErrors: [],
        validationSummary: null,
        isValidating: false
    });

    // Use useRef to prevent creating new validation engine on every render
    const validationEngineRef = useRef(new ValidationEngine());

    const updateEntityData = (entityType: EntityType, newData: Client[] | Worker[] | Task[]) => {
        console.log(`🔄 Updating ${entityType} data:`, newData);
        
        setData(prevData => {
            const updatedData = { ...prevData };
            
            switch (entityType) {
                case 'client':
                    updatedData.clients = newData as Client[];
                    break;
                case 'worker':
                    updatedData.workers = newData as Worker[];
                    break;
                case 'task':
                    updatedData.tasks = newData as Task[];
                    break;
            }
            
            return updatedData;
        });
    };

    const runValidation = useCallback((immediate = false) => {
        // Use a single setTimeout to avoid multiple state updates
        const delay = immediate ? 0 : 100;
        
        setTimeout(() => {
            setData(currentData => {
                // Set validating state and perform validation in one atomic operation
                try {
                    console.log('🔍 Running validation with current data:', {
                        clients: currentData.clients.length,
                        workers: currentData.workers.length,
                        tasks: currentData.tasks.length
                    });
                    
                    // First, set validating state
                    const validatingData = { ...currentData, isValidating: true };
                    
                    // Defer the actual validation to next tick to avoid blocking
                    setTimeout(() => {
                        setData(dataToValidate => {
                            try {
                                validationEngineRef.current.setData(
                                    dataToValidate.clients, 
                                    dataToValidate.workers, 
                                    dataToValidate.tasks
                                );
                                const { errors, summary } = validationEngineRef.current.validateAll();
                                
                                console.log(`✅ Validation complete: ${errors.length} errors found`);
                                
                                return {
                                    ...dataToValidate,
                                    validationErrors: errors,
                                    validationSummary: summary,
                                    isValidating: false
                                };
                            } catch (error) {
                                console.error('Validation failed:', error);
                                return {
                                    ...dataToValidate,
                                    validationErrors: [],
                                    validationSummary: null,
                                    isValidating: false
                                };
                            }
                        });
                    }, 10);
                    
                    return validatingData;
                    
                } catch (error) {
                    console.error('Error starting validation:', error);
                    return {
                        ...currentData,
                        isValidating: false
                    };
                }
            });
        }, delay);
    }, []);

    const getAppData = (): AppData => ({
        clients: data.clients,
        workers: data.workers,
        tasks: data.tasks
    });

    return {
        data,
        updateEntityData,
        runValidation,
        getAppData
    };
}; 