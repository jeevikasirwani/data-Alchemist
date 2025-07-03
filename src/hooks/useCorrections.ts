import { useState } from 'react';
import { AIDataCorrectorSimplified, CorrectionSuggestion } from '../utils/ai-data-corrector-simplified';
import { ValidationError } from '../utils/validation';
import { EntityType, AppData, Client, Worker, Task } from '../types';

export const useCorrections = () => {
    const [correctionSuggestions, setCorrectionSuggestions] = useState<CorrectionSuggestion[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const aiCorrector = new AIDataCorrectorSimplified();

    const generateCorrections = async (data: AppData, validationErrors: ValidationError[]) => {
        if (validationErrors.length === 0) {
            setCorrectionSuggestions([]);
            return;
        }

        setIsGenerating(true);
        try {
            console.log('🤖 Generating AI corrections for', validationErrors.length, 'errors...');
            
            // Filter errors by entity type and generate suggestions
            const clientErrors = validationErrors.filter(e => e.entityType === 'client');
            const workerErrors = validationErrors.filter(e => e.entityType === 'worker');
            const taskErrors = validationErrors.filter(e => e.entityType === 'task');

            const allSuggestions: CorrectionSuggestion[] = [];

            // Generate suggestions for each entity type
            if (clientErrors.length > 0) {
                const suggestions = await aiCorrector.suggestCorrections(
                    data.clients, 
                    clientErrors, 
                    'client', 
                    data
                );
                allSuggestions.push(...suggestions);
            }

            if (workerErrors.length > 0) {
                const suggestions = await aiCorrector.suggestCorrections(
                    data.workers, 
                    workerErrors, 
                    'worker', 
                    data
                );
                allSuggestions.push(...suggestions);
            }

            if (taskErrors.length > 0) {
                const suggestions = await aiCorrector.suggestCorrections(
                    data.tasks, 
                    taskErrors, 
                    'task', 
                    data
                );
                allSuggestions.push(...suggestions);
            }

            setCorrectionSuggestions(allSuggestions);
            console.log(`✅ Generated ${allSuggestions.length} AI correction suggestions`);

        } catch (error) {
            console.error('Error generating corrections:', error);
            setCorrectionSuggestions([]);
        } finally {
            setIsGenerating(false);
        }
    };

    const applyCorrection = async (
        suggestion: CorrectionSuggestion, 
        data: AppData, 
        updateData: (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]) => void
    ) => {
        try {
            console.log('🔧 Applying correction:', suggestion);
            
            // Skip system errors
            if (suggestion.error.entityType === 'system') {
                console.log('Skipping system error correction');
                return;
            }
            
            const entityType = suggestion.error.entityType as EntityType;

            // Validate suggestion has required data
            if (!suggestion || !suggestion.error || suggestion.correctedValue === undefined) {
                console.error('Invalid suggestion: missing required data');
                return;
            }

            // Get current data for the entity type
            let currentData: any[];
            switch (entityType) {
                case 'client':
                    currentData = data.clients;
                    break;
                case 'worker':
                    currentData = data.workers;
                    break;
                case 'task':
                    currentData = data.tasks;
                    break;
                default:
                    console.error('Unknown entity type:', entityType);
                    return;
            }

            // Validate row index
            if (suggestion.error.row < 0 || suggestion.error.row >= currentData.length) {
                console.error('Invalid row index:', suggestion.error.row, 'max:', currentData.length);
                return;
            }

            // Apply the correction using the AI corrector
            const correctedData = await aiCorrector.applyCorrection(currentData, suggestion);
            
            // Update the data
            updateData(entityType, correctedData);

            // Remove the applied suggestion from the list
            setCorrectionSuggestions(prev => 
                prev.filter(s => 
                    !(s.error.row === suggestion.error.row && 
                      s.error.column === suggestion.error.column && 
                      s.error.entityType === suggestion.error.entityType)
                )
            );

            console.log(`✅ Applied correction for ${entityType} row ${suggestion.error.row}, field ${suggestion.error.column}`);
        } catch (error) {
            console.error('Error applying correction:', error);
        }
    };

    const dismissSuggestion = (suggestion: CorrectionSuggestion) => {
        setCorrectionSuggestions(prev => 
            prev.filter(s => 
                !(s.error.row === suggestion.error.row && 
                  s.error.column === suggestion.error.column && 
                  s.error.entityType === suggestion.error.entityType)
            )
        );
    };

    const clearAllSuggestions = () => {
        setCorrectionSuggestions([]);
    };

    const applyAllAutoFixes = async (
        data: AppData,
        updateData: (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]) => void
    ) => {
        const autoFixSuggestions = correctionSuggestions.filter(s => s.action === 'auto-fix');
        
        for (const suggestion of autoFixSuggestions) {
            await applyCorrection(suggestion, data, updateData);
            // Small delay to prevent overwhelming the UI
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    return {
        correctionSuggestions,
        isGenerating,
        generateCorrections,
        applyCorrection,
        dismissSuggestion,
        clearAllSuggestions,
        applyAllAutoFixes
    };
}; 