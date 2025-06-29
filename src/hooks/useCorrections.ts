import { useState } from 'react';
import { AIDataCorrector, CorrectionSuggestion } from '../utils/ai-data-corrector';
import { createAIDataCorrector, EnhancedCorrectionSuggestion } from '../utils/ai';
import { ValidationError } from '../utils/validation';

type EntityType = 'client' | 'worker' | 'task';

interface AppData {
    clients: any[];
    workers: any[];
    tasks: any[];
}

export const useCorrections = () => {
    const [correctionSuggestions, setCorrectionSuggestions] = useState<CorrectionSuggestion[]>([]);
    const [enhancedCorrections, setEnhancedCorrections] = useState<EnhancedCorrectionSuggestion[]>([]);

    const aiDataCorrector = new AIDataCorrector();
    const aiDataCorrectorEnhanced = createAIDataCorrector();

    const generateCorrections = async (data: AppData, validationErrors: ValidationError[]) => {
        try {
            console.log('🤖 Generating AI corrections...');
            
            // Basic corrections - filter errors for each entity type
            const clientErrors = validationErrors.filter(e => e.entityType === 'client');
            const workerErrors = validationErrors.filter(e => e.entityType === 'worker');
            const taskErrors = validationErrors.filter(e => e.entityType === 'task');

            let allSuggestions: CorrectionSuggestion[] = [];

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

        } catch (error) {
            console.error('Error generating corrections:', error);
        }
    };

    const applyCorrection = async (
        suggestion: CorrectionSuggestion, 
        data: AppData, 
        updateData: (entityType: EntityType, updatedData: any[]) => void
    ) => {
        try {
            console.log('🔧 Applying correction:', suggestion);
            
            const entityType = suggestion.error.entityType as EntityType;
            const currentEntityData = data[`${entityType}s` as keyof AppData] as any[];
            
            if (!currentEntityData || currentEntityData.length === 0) {
                console.error('No data found for entity type:', entityType);
                return;
            }

            if (suggestion.error.row >= currentEntityData.length) {
                console.error('Row index out of bounds:', suggestion.error.row, 'max:', currentEntityData.length - 1);
                return;
            }

            // Get the corrected value from either correctedValue or parameters.newValue
            const newValue = suggestion.correctedValue ?? suggestion.parameters?.newValue;
            
            if (newValue === undefined) {
                console.error('No corrected value found in suggestion:', suggestion);
                return;
            }
            
            console.log(`Updating ${entityType} row ${suggestion.error.row}, field ${suggestion.error.column} from "${currentEntityData[suggestion.error.row][suggestion.error.column]}" to "${newValue}"`);
            
            const updatedData = currentEntityData.map((item: any, index: number) => {
                if (index === suggestion.error.row) {
                    return {
                        ...item,
                        [suggestion.error.column]: newValue
                    };
                }
                return item;
            });

            // Call the update function
            updateData(entityType, updatedData);

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
        updateData: (entityType: EntityType, updatedData: any[]) => void
    ) => {
        try {
            console.log('🔧 Applying enhanced correction:', suggestion);
            
            const entityType = suggestion.error.entityType as EntityType;
            const currentEntityData = data[`${entityType}s` as keyof AppData] as any[];
            
            if (!currentEntityData || currentEntityData.length === 0) {
                console.error('No data found for entity type:', entityType);
                return;
            }

            if (suggestion.error.row >= currentEntityData.length) {
                console.error('Row index out of bounds:', suggestion.error.row, 'max:', currentEntityData.length - 1);
                return;
            }

            // Get the corrected value
            const newValue = suggestion.correctedValue;
            
            if (newValue === undefined) {
                console.error('No corrected value found in enhanced suggestion:', suggestion);
                return;
            }
            
            console.log(`Updating ${entityType} row ${suggestion.error.row}, field ${suggestion.error.column} from "${currentEntityData[suggestion.error.row][suggestion.error.column]}" to "${newValue}"`);
            
            const updatedData = currentEntityData.map((item: any, index: number) => {
                if (index === suggestion.error.row) {
                    return {
                        ...item,
                        [suggestion.error.column]: newValue
                    };
                }
                return item;
            });

            updateData(entityType, updatedData);

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

    return {
        correctionSuggestions,
        enhancedCorrections,
        generateCorrections,
        applyCorrection,
        applyEnhancedCorrection
    };
}; 