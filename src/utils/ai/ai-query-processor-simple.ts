import { generateChatCompletion, ChatMessage } from './ai-chat-completion';

export interface QueryIntent {
    action: 'filter' | 'search' | 'count' | 'find';
    entity: 'client' | 'worker' | 'task' | 'all';
    conditions: FilterCondition[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface FilterCondition {
    field: string;
    operator: 'equals' | 'contains' | 'greater' | 'less' | 'in' | 'not_in';
    value: any;
    confidence: number;
}

export interface QueryResult {
    data: any[];
    totalCount: number;
    appliedFilters: FilterCondition[];
    query: string;
    aiExplanation?: string;
}

/**
 * Simplified AI Query Processor using modular architecture
 * Processes natural language queries into structured data filters
 */
export class AIQueryProcessorSimple {
    private fieldMappings = {
        client: {
            'name': ['ClientName', 'client_name', 'name'],
            'id': ['ClientID', 'ClientId', 'client_id'],
            'priority': ['PriorityLevel', 'priority_level', 'priority'],
            'group': ['GroupTag', 'group_tag', 'group'],
            'tasks': ['RequestedTaskIDs', 'requested_tasks', 'tasks']
        },
        worker: {
            'name': ['WorkerName', 'worker_name', 'name'],
            'id': ['WorkerID', 'WorkerId', 'worker_id'],
            'skills': ['Skills', 'skills', 'skill'],
            'slots': ['AvailableSlots', 'available_slots', 'slots'],
            'load': ['MaxLoadPerPhase', 'max_load', 'load'],
            'group': ['WorkerGroup', 'worker_group', 'group'],
            'qualification': ['QualificationLevel', 'qualification', 'level']
        },
        task: {
            'name': ['TaskName', 'task_name', 'name'],
            'id': ['TaskID', 'TaskId', 'task_id'],
            'category': ['Category', 'category', 'type'],
            'duration': ['Duration', 'duration', 'time'],
            'skills': ['RequiredSkills', 'required_skills', 'skills'],
            'phases': ['PreferredPhases', 'preferred_phases', 'phases'],
            'concurrent': ['MaxConcurrent', 'max_concurrent', 'concurrent']
        }
    };

    async processQuery(query: string, data: { clients: any[]; workers: any[]; tasks: any[] }): Promise<QueryResult> {
        try {
            return await this.processQueryWithAI(query, data);
        } catch (error) {
            console.warn('AI query processing failed, using pattern matching:', error);
            return this.processQueryWithPatterns(query, data);
        }
    }

    /**
     * AI-enhanced query processing using chat completion
     */
    private async processQueryWithAI(query: string, data: { clients: any[]; workers: any[]; tasks: any[] }): Promise<QueryResult> {
        const sampleData = {
            clients: data.clients.slice(0, 2),
            workers: data.workers.slice(0, 2),
            tasks: data.tasks.slice(0, 2)
        };

        const messages: ChatMessage[] = [
            {
                role: 'system',
                content: `Parse natural language queries into structured filter conditions for resource allocation data.

Data Schema:
- Clients: ClientID, ClientName, PriorityLevel (1-5), GroupTag, RequestedTaskIDs
- Workers: WorkerID, WorkerName, Skills, AvailableSlots, MaxLoadPerPhase, QualificationLevel (1-5), WorkerGroup  
- Tasks: TaskID, TaskName, Category, Duration, RequiredSkills, PreferredPhases, MaxConcurrent

Return JSON: {"entity": "client|worker|task|all", "conditions": [{"field": "string", "operator": "equals|contains|greater|less|in", "value": "any", "confidence": 0.8}], "explanation": "string"}`
            },
            {
                role: 'user',
                content: `Parse: "${query}"\n\nSample data:\n${JSON.stringify(sampleData, null, 2)}`
            }
        ];

        const response = await generateChatCompletion(messages);
        const content = response.choices[0].message.content;

        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON in AI response');

        const queryPlan = JSON.parse(jsonMatch[0]);
        const filteredData = this.applyFilters(queryPlan.conditions || [], data, queryPlan.entity);

        return {
            data: filteredData,
            totalCount: filteredData.length,
            appliedFilters: queryPlan.conditions || [],
            query,
            aiExplanation: queryPlan.explanation || 'AI-parsed query'
        };
    }

    /**
     * Fallback pattern-based query processing
     */
    private processQueryWithPatterns(query: string, data: { clients: any[]; workers: any[]; tasks: any[] }): QueryResult {
        const intent = this.extractIntent(query);
        const filters = this.generateFilters(intent, query);
        const filteredData = this.applyFilters(filters, data, intent.entity);

        return {
            data: filteredData,
            totalCount: filteredData.length,
            appliedFilters: filters,
            query,
            aiExplanation: 'Pattern matching used (AI unavailable)'
        };
    }

    private extractIntent(query: string): QueryIntent {
        const lowerQuery = query.toLowerCase();

        let action: 'filter' | 'search' | 'count' | 'find' = 'filter';
        if (lowerQuery.includes('count') || lowerQuery.includes('how many')) action = 'count';
        else if (lowerQuery.includes('find') || lowerQuery.includes('show me')) action = 'find';
        else if (lowerQuery.includes('search')) action = 'search';

        let entity: 'client' | 'worker' | 'task' | 'all' = 'all';
        if (lowerQuery.includes('client') || lowerQuery.includes('customer')) entity = 'client';
        else if (lowerQuery.includes('worker') || lowerQuery.includes('employee')) entity = 'worker';
        else if (lowerQuery.includes('task') || lowerQuery.includes('job')) entity = 'task';

        return { action, entity, conditions: [] };
    }

    private generateFilters(intent: QueryIntent, query: string): FilterCondition[] {
        const conditions: FilterCondition[] = [];
        const lowerQuery = query.toLowerCase();

        // Duration patterns
        const durationMatch = lowerQuery.match(/duration.*?(\d+)/i);
        if (durationMatch) {
            conditions.push({
                field: 'Duration',
                operator: 'greater',
                value: parseInt(durationMatch[1]),
                confidence: 0.8
            });
        }

        // Priority patterns
        const priorityMatch = lowerQuery.match(/priority.*?(\d+)/i);
        if (priorityMatch) {
            conditions.push({
                field: 'PriorityLevel',
                operator: 'equals',
                value: parseInt(priorityMatch[1]),
                confidence: 0.8
            });
        }

        return conditions;
    }

    private applyFilters(
        filters: FilterCondition[],
        data: { clients: any[]; workers: any[]; tasks: any[] },
        entity: 'client' | 'worker' | 'task' | 'all'
    ): any[] {
        let targetData: any[] = [];

        if (entity === 'client' || entity === 'all') {
            targetData = targetData.concat(data.clients.map(item => ({ ...item, _entityType: 'client' })));
        }
        if (entity === 'worker' || entity === 'all') {
            targetData = targetData.concat(data.workers.map(item => ({ ...item, _entityType: 'worker' })));
        }
        if (entity === 'task' || entity === 'all') {
            targetData = targetData.concat(data.tasks.map(item => ({ ...item, _entityType: 'task' })));
        }

        return targetData.filter(item => {
            return filters.every(filter => {
                const fieldValue = item[filter.field];

                switch (filter.operator) {
                    case 'equals': return fieldValue === filter.value;
                    case 'contains':
                        if (Array.isArray(fieldValue)) {
                            return fieldValue.some(val =>
                                String(val).toLowerCase().includes(String(filter.value).toLowerCase())
                            );
                        }
                        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
                    case 'greater': return Number(fieldValue) > Number(filter.value);
                    case 'less': return Number(fieldValue) < Number(filter.value);
                    case 'in':
                        if (Array.isArray(fieldValue)) {
                            return Array.isArray(filter.value)
                                ? filter.value.some((v: any) => fieldValue.includes(v))
                                : fieldValue.includes(filter.value);
                        }
                        return Array.isArray(filter.value)
                            ? filter.value.includes(fieldValue)
                            : fieldValue === filter.value;
                    default: return true;
                }
            });
        });
    }
} 