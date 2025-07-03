/**
 * Minimal AI Header Mapper - Just what you need
 */

import { generateWithAI } from './ai-helper';


export interface MappingResult {
    mappings: Record<string, string>;
    unmapped: string[];
    entityType: 'client' | 'worker' | 'task';
}

// What we want our data to look like
export const SCHEMAS = {
    client: ['ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 'GroupTag', 'AttributesJSON'],
    worker: ['WorkerID', 'WorkerName', 'Skills', 'AvailableSlots', 'MaxLoadPerPhase', 'WorkerGroup', 'QualificationLevel'],
    task: ['TaskID', 'TaskName', 'Category', 'Duration', 'RequiredSkills', 'PreferredPhases', 'MaxConcurrent']
};

/**
 * AI map headers automatically - ONE function that does everything
 */
export async function mapHeaders(headers: string[]): Promise<MappingResult> {
    try {
        // Let AI figure out what type of data this is
        const typePrompt = `
Headers: ${headers.join(', ')}
Is this client, worker, or task data? Answer with just one word.
`;
        
        const typeResponse = await generateWithAI(typePrompt);
        const entityType = typeResponse.toLowerCase().trim() || 'client';
        const detectedType = ['client', 'worker', 'task'].includes(entityType) ? entityType as 'client' | 'worker' | 'task' : 'client';
        
        // Let AI map the headers
        const mapPrompt = `
Map these headers to expected fields:
Headers: ${headers.join(', ')}
Expected: ${SCHEMAS[detectedType].join(', ')}

Handle case variations (e.g., CLIENTNAME -> ClientName, clientid -> ClientID).
Map each input header to the exact expected field name with proper capitalization.

Return ONLY JSON: {"Header": "ExpectedField"}
`;
        
        const responseText = await generateWithAI(mapPrompt);
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[^}]*\}/);
        let mappings = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        
        // Add manual fallback mappings for common case variations
        mappings = addFallbackMappings(mappings, headers, detectedType);
        
        const unmapped = headers.filter(h => !mappings[h]);
        
        return { mappings, unmapped, entityType: detectedType };
        
    } catch (error) {
        console.warn('AI mapping failed:', error);
        return { mappings: {}, unmapped: headers, entityType: 'client' };
    }
}

/**
 * Add fallback mappings for common case variations
 */
function addFallbackMappings(
    existingMappings: Record<string, string>,
    headers: string[],
    entityType: 'client' | 'worker' | 'task'
): Record<string, string> {
    const mappings = { ...existingMappings };
    const expectedFields = SCHEMAS[entityType];
    
    // For each header that isn't mapped yet
    for (const header of headers) {
        if (!mappings[header]) {
            // Find a matching expected field (case-insensitive)
            const normalizedHeader = header.toLowerCase();
            const matchingField = expectedFields.find(field => 
                field.toLowerCase() === normalizedHeader
            );
            
            if (matchingField) {
                mappings[header] = matchingField;
            }
        }
    }
    
    return mappings;
}