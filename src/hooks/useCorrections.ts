import { useState } from 'react';
import { AIDataCorrector, CorrectionSuggestion } from '../utils/ai-data-corrector';
import { createAIDataCorrector, EnhancedCorrectionSuggestion } from '../utils/ai';
import { SmartAIDataCorrector, SmartCorrectionSuggestion } from '../utils/ai-data-corrector-smart';
import { ValidationError } from '../utils/validation';
import { EntityType, AppData, Client, Worker, Task } from '../types';

export const useCorrections = () => {
    const [correctionSuggestions, setCorrectionSuggestions] = useState<CorrectionSuggestion[]>([]);
    const [enhancedCorrections, setEnhancedCorrections] = useState<EnhancedCorrectionSuggestion[]>([]);
    const [smartCorrections, setSmartCorrections] = useState<SmartCorrectionSuggestion[]>([]);

    const aiDataCorrector = new AIDataCorrector();
    const aiDataCorrectorEnhanced = createAIDataCorrector();
    const smartAICorrector = new SmartAIDataCorrector();

    const generateCorrections = async (data: AppData, validationErrors: ValidationError[]) => {
        try {
            console.log('🤖 Generating AI corrections...');
            
            // Basic corrections - filter errors for each entity type
            const clientErrors = validationErrors.filter(e => e.entityType === 'client');
            const workerErrors = validationErrors.filter(e => e.entityType === 'worker');
            const taskErrors = validationErrors.filter(e => e.entityType === 'task');

            const allSuggestions: CorrectionSuggestion[] = [];

            if (clientErrors.length > 0) {
                const clientSuggestions = await aiDataCorrector.suggestCorrections(data.clients, clientErrors, 'client', data);
                allSuggestions.push(...clientSuggestions);
            }

            if (workerErrors.length > 0) {
                const workerSuggestions = await aiDataCorrector.suggestCorrections(data.workers, workerErrors, 'worker', data);
                allSuggestions.push(...workerSuggestions);
            }

            if (taskErrors.length > 0) {
                const taskSuggestions = await aiDataCorrector.suggestCorrections(data.tasks, taskErrors, 'task', data);
                allSuggestions.push(...taskSuggestions);
            }

            setCorrectionSuggestions(allSuggestions);
            console.log(`✅ Generated ${allSuggestions.length} basic corrections`);

            // Enhanced corrections
            const enhancedSuggestions = await aiDataCorrectorEnhanced.suggestCorrections([], validationErrors, 'client', data);
            setEnhancedCorrections(enhancedSuggestions);
            console.log(`✅ Generated ${enhancedSuggestions.length} enhanced corrections`);

            // Smart AI corrections (if API key is available)
            if (process.env.NEXT_PUBLIC_OPENAI_API_KEY) {
                try {
                    const smartSuggestions = await smartAICorrector.suggestCorrections(
                        [...data.clients, ...data.workers, ...data.tasks], 
                        validationErrors, 
                        'client', 
                        data
                    );
                    setSmartCorrections(smartSuggestions);
                    console.log(`🤖 Generated ${smartSuggestions.length} smart AI corrections`);
                } catch (error) {
                    console.warn('Smart AI corrections unavailable:', error);
                    setSmartCorrections([]);
                }
            }

        } catch (error) {
            console.error('Error generating corrections:', error);
        }
    };

    const applyCorrection = async (
        suggestion: CorrectionSuggestion, 
        data: AppData, 
        updateData: (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]) => void
    ) => {
        try {
            console.log('🔧 Applying correction:', suggestion);
            
            // Validate suggestion has required data
            if (!suggestion || !suggestion.error) {
                console.error('Invalid suggestion: missing error data');
                return;
            }
            
            const entityType = suggestion.error.entityType as EntityType;
            
            // Skip system errors as they can't be corrected by editing data
            if (suggestion.error.entityType === 'system') {
                console.log('Skipping system error correction');
                return;
            }
            
            // Get the corrected value from either correctedValue or parameters.newValue
            const newValue = suggestion.correctedValue ?? suggestion.parameters?.newValue;
            
            if (newValue === undefined) {
                console.error('No corrected value found in suggestion:', suggestion);
                return;
            }

            switch (entityType) {
                case 'client': {
                    const currentData = data.clients;
                    if (!currentData || suggestion.error.row < 0 || suggestion.error.row >= currentData.length) {
                        console.error('Invalid client data or row index:', suggestion.error.row, 'max:', currentData?.length);
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                case 'worker': {
                    const currentData = data.workers;
                    if (!currentData || suggestion.error.row < 0 || suggestion.error.row >= currentData.length) {
                        console.error('Invalid worker data or row index:', suggestion.error.row, 'max:', currentData?.length);
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                case 'task': {
                    const currentData = data.tasks;
                    if (!currentData || suggestion.error.row < 0 || suggestion.error.row >= currentData.length) {
                        console.error('Invalid task data or row index:', suggestion.error.row, 'max:', currentData?.length);
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                default:
                    console.error('Unknown entity type:', entityType);
                    return;
            }

            // Remove the applied suggestion
            setCorrectionSuggestions(prev => 
                prev.filter(s => 
                    s.error.row !== suggestion.error.row || 
                    s.error.column !== suggestion.error.column || 
                    s.error.entityType !== suggestion.error.entityType
                )
            );

            console.log(`✅ Applied correction for ${entityType} row ${suggestion.error.row}, field ${suggestion.error.column}`);
        } catch (error) {
            console.error('Error applying correction:', error);
        }
    };

    const applyEnhancedCorrection = async (
        suggestion: EnhancedCorrectionSuggestion,
        data: AppData,
        updateData: (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]) => void
    ) => {
        try {
            console.log('🔧 Applying enhanced correction:', suggestion);
            
            const entityType = suggestion.error.entityType as EntityType;
            
            // Get the corrected value
            const newValue = suggestion.correctedValue;
            
            if (newValue === undefined) {
                console.error('No corrected value found in enhanced suggestion:', suggestion);
                return;
            }

            switch (entityType) {
                case 'client': {
                    const currentData = data.clients;
                    if (!currentData || suggestion.error.row >= currentData.length) {
                        console.error('Invalid client data or row index');
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                case 'worker': {
                    const currentData = data.workers;
                    if (!currentData || suggestion.error.row >= currentData.length) {
                        console.error('Invalid worker data or row index');
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                case 'task': {
                    const currentData = data.tasks;
                    if (!currentData || suggestion.error.row >= currentData.length) {
                        console.error('Invalid task data or row index');
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                default:
                    console.error('Unknown entity type:', entityType);
                    return;
            }

            // Remove the applied suggestion by comparing error properties
            setEnhancedCorrections(prev => 
                prev.filter(s => 
                    s.error.row !== suggestion.error.row ||
                    s.error.column !== suggestion.error.column ||
                    s.error.entityType !== suggestion.error.entityType
                )
            );

            console.log(`✅ Applied enhanced correction for ${entityType} row ${suggestion.error.row}`);
        } catch (error) {
            console.error('Error applying enhanced correction:', error);
        }
    };

    const applySmartCorrection = async (
        suggestion: SmartCorrectionSuggestion,
        data: AppData,
        updateData: (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]) => void
    ) => {
        try {
            console.log('🤖 Applying smart correction:', suggestion);
            
            const entityType = suggestion.error.entityType as EntityType;
            const newValue = suggestion.correctedValue;
            
            if (newValue === undefined) {
                console.error('No corrected value found in smart suggestion:', suggestion);
                return;
            }

            switch (entityType) {
                case 'client': {
                    const currentData = data.clients;
                    if (!currentData || suggestion.error.row >= currentData.length) {
                        console.error('Invalid client data or row index');
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                case 'worker': {
                    const currentData = data.workers;
                    if (!currentData || suggestion.error.row >= currentData.length) {
                        console.error('Invalid worker data or row index');
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                case 'task': {
                    const currentData = data.tasks;
                    if (!currentData || suggestion.error.row >= currentData.length) {
                        console.error('Invalid task data or row index');
                        return;
                    }
                    
                    const updatedData = currentData.map((item, index) => {
                        if (index === suggestion.error.row) {
                            return { ...item, [suggestion.error.column]: newValue };
                        }
                        return item;
                    });
                    updateData(entityType, updatedData);
                    break;
                }
                default:
                    console.error('Unknown entity type:', entityType);
                    return;
            }

            // Remove the applied suggestion
            setSmartCorrections(prev => 
                prev.filter(s => 
                    s.error.row !== suggestion.error.row ||
                    s.error.column !== suggestion.error.column ||
                    s.error.entityType !== suggestion.error.entityType
                )
            );

            console.log(`🤖 Applied smart correction for ${entityType} row ${suggestion.error.row}`);
        } catch (error) {
            console.error('Error applying smart correction:', error);
        }
    };

    return {
        correctionSuggestions,
        enhancedCorrections,
        smartCorrections,
        generateCorrections,
        applyCorrection,
        applyEnhancedCorrection,
        applySmartCorrection
    };
}; 