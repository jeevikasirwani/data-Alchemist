import { useState } from 'react';
import { ValidationEngine, ValidationError, ValidationSummary } from '../utils/validation';
// AI validation removed - using simplified architecture

type EntityType = 'client' | 'worker' | 'task';

interface AppData {
    clients: any[];
    workers: any[];
    tasks: any[];
}

export const useValidation = () => {
    const [isValidating, setIsValidating] = useState(false);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [validationSummary, setValidationSummary] = useState<ValidationSummary | null>(null);
    const [aiValidationResults, setAiValidationResults] = useState<ValidationError[]>([]);
    const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

    const validationEngine = new ValidationEngine();

    const runValidation = async (data: AppData) => {
        setIsValidating(true);
        
        console.log('🔍 Starting validation with data:', {
            clientsCount: data.clients?.length || 0,
            workersCount: data.workers?.length || 0,
            tasksCount: data.tasks?.length || 0,
            hasClients: Boolean(data.clients),
            hasWorkers: Boolean(data.workers),
            hasTasks: Boolean(data.tasks)
        });

        try {
            let errors: ValidationError[] = [];
            let summary: ValidationSummary | null = null;
            
            // Ensure data arrays are properly initialized
            const clientsData = data.clients || [];
            const workersData = data.workers || [];
            const tasksData = data.tasks || [];
            
            // 1. Run traditional validation with error handling
            try {
                console.log('🔍 Setting data for validation...');
                console.log('🔍 Data arrays:', { clientsData: clientsData.length, workersData: workersData.length, tasksData: tasksData.length });
                validationEngine.setData(clientsData, workersData, tasksData);
                
                console.log('🔍 Running traditional validation...');
                const validationResult = validationEngine.validateAll();
                errors = validationResult.errors;
                summary = validationResult.summary;
                console.log('✅ Traditional validation completed successfully');
            } catch (traditionalError) {
                console.error('❌ Traditional validation failed:', traditionalError);
                // Set fallback values
                errors = [];
                summary = {
                    totalErrors: 0,
                    totalWarnings: 0,
                    totalCritical: 0,
                    errorsByEntity: {},
                    errorsByType: {},
                    validationScore: 0,
                    canProceed: false
                };
            }

            // AI validation removed - using simplified architecture
            const allErrors = errors;
            setValidationErrors(allErrors);
            setValidationSummary(summary);

        } catch (error) {
            console.error('Error during validation:', error);
        } finally {
            setIsValidating(false);
        }
    };

    const runDeferredValidation = (data: AppData, immediate: boolean = false) => {
        // Clear existing timeout
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }

        if (immediate) {
            // Run validation immediately (for QuickFix operations)
            runValidation(data);
        } else {
            // Set new timeout for validation
            const newTimeout = setTimeout(() => {
                runValidation(data);
            }, 1000); // Wait 1 second after last change before validating

            setValidationTimeout(newTimeout);
        }
    };

    const getEntityErrors = (entityType: EntityType): ValidationError[] => {
        return validationErrors.filter(error => error.entityType === entityType);
    };

    return {
        isValidating,
        validationErrors,
        validationSummary,
        aiValidationResults,
        runValidation,
        runDeferredValidation,
        getEntityErrors
    };
}; 