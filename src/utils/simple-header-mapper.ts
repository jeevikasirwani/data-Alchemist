/**
 * Minimal AI Header Mapper - Just what you need
 */

import { generateChatCompletion } from './ai/ai-chat-completion';

export interface MappingResult {
    mappings: Record<string, string>;
    unmapped: string[];
    entityType: 'client' | 'worker' | 'task';
}

// What we want our data to look like
const SCHEMAS = {
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
        
        const typeResponse = await generateChatCompletion([{ role: 'user', content: typePrompt }]);
        const entityType = typeResponse.choices[0].message.content?.toLowerCase().trim() || 'client';
        const detectedType = ['client', 'worker', 'task'].includes(entityType) ? entityType as 'client' | 'worker' | 'task' : 'client';
        
        // Let AI map the headers
        const mapPrompt = `
Map these headers to expected fields:
Headers: ${headers.join(', ')}
Expected: ${SCHEMAS[detectedType].join(', ')}

Return ONLY JSON: {"Header": "ExpectedField"}
`;
        
        const mapResponse = await generateChatCompletion([{ role: 'user', content: mapPrompt }]);
        const responseText = mapResponse.choices[0].message.content || '';
        
        // Extract JSON from response
        const jsonMatch = responseText.match(/\{[^}]*\}/);
        const mappings = jsonMatch ? JSON.parse(jsonMatch[0]) : {};
        
        const unmapped = headers.filter(h => !mappings[h]);
        
        return { mappings, unmapped, entityType: detectedType };
        
    } catch (error) {
        console.warn('AI mapping failed:', error);
        return { mappings: {}, unmapped: headers, entityType: 'client' };
    }
}