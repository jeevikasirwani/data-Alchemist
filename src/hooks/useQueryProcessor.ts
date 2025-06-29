import { useState } from 'react';
import { createAIQueryProcessor, QueryResult } from '../utils/ai';

interface AppData {
    clients: any[];
    workers: any[];
    tasks: any[];
}

export const useQueryProcessor = () => {
    const [naturalQuery, setNaturalQuery] = useState('');
    const [queryResults, setQueryResults] = useState<QueryResult | null>(null);
    const [showQueryInterface, setShowQueryInterface] = useState(false);
    const [isProcessingQuery, setIsProcessingQuery] = useState(false);

    const aiQueryProcessor = createAIQueryProcessor();

    const handleNaturalQuery = async (data: AppData) => {
        if (!naturalQuery.trim()) return;

        setIsProcessingQuery(true);
        try {
            console.log('🤖 Processing natural language query:', naturalQuery);
            const result = await aiQueryProcessor.processQuery(naturalQuery, data);
            setQueryResults(result);
            console.log(`✅ Query processed: found ${result.data.length} results`);
        } catch (error) {
            console.error('Error processing query:', error);
            setQueryResults({
                data: [],
                totalCount: 0,
                appliedFilters: [],
                query: naturalQuery,
                aiExplanation: 'Query processing failed'
            });
        } finally {
            setIsProcessingQuery(false);
        }
    };

    const clearQuery = () => {
        setNaturalQuery('');
        setQueryResults(null);
    };

    const toggleQueryInterface = () => {
        setShowQueryInterface(prev => !prev);
        if (showQueryInterface) {
            clearQuery();
        }
    };

    return {
        naturalQuery,
        setNaturalQuery,
        queryResults,
        showQueryInterface,
        isProcessingQuery,
        handleNaturalQuery,
        clearQuery,
        toggleQueryInterface
    };
}; 