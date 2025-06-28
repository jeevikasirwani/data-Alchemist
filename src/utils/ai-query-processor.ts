import { calculateSimilarity } from './ai-config';

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
}

export class AIQueryProcessor {
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
        const intent = await this.extractIntent(query);
        const filters = await this.generateFilters(intent, query);
        const filteredData = this.applyFilters(filters, data, intent.entity);
        
        return {
            data: filteredData,
            totalCount: filteredData.length,
            appliedFilters: filters,
            query
        };
    }

    private async extractIntent(query: string): Promise<QueryIntent> {
        const lowerQuery = query.toLowerCase();
        
        let action: 'filter' | 'search' | 'count' | 'find' = 'filter';
        if (lowerQuery.includes('count') || lowerQuery.includes('how many')) {
            action = 'count';
        } else if (lowerQuery.includes('find') || lowerQuery.includes('show me')) {
            action = 'find';
        } else if (lowerQuery.includes('search')) {
            action = 'search';
        }

        let entity: 'client' | 'worker' | 'task' | 'all' = 'all';
        if (lowerQuery.includes('client') || lowerQuery.includes('customer')) {
            entity = 'client';
        } else if (lowerQuery.includes('worker') || lowerQuery.includes('employee')) {
            entity = 'worker';
        } else if (lowerQuery.includes('task') || lowerQuery.includes('job')) {
            entity = 'task';
        }

        return {
            action,
            entity,
            conditions: []
        };
    }

    private async generateFilters(intent: QueryIntent, query: string): Promise<FilterCondition[]> {
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

        // Phase patterns
        const phaseMatch = lowerQuery.match(/phase.*?(\d+)/i);
        if (phaseMatch) {
            conditions.push({
                field: 'PreferredPhases',
                operator: 'in',
                value: [parseInt(phaseMatch[1])],
                confidence: 0.8
            });
        }

        // Skill patterns
        const skillMatch = lowerQuery.match(/skill.*?([a-zA-Z\s]+)/i);
        if (skillMatch) {
            conditions.push({
                field: 'RequiredSkills',
                operator: 'contains',
                value: skillMatch[1].trim(),
                confidence: 0.7
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
            targetData = targetData.concat(data.clients);
        }
        if (entity === 'worker' || entity === 'all') {
            targetData = targetData.concat(data.workers);
        }
        if (entity === 'task' || entity === 'all') {
            targetData = targetData.concat(data.tasks);
        }

        return targetData.filter(item => {
            return filters.every(filter => {
                const fieldValue = item[filter.field];
                
                switch (filter.operator) {
                    case 'equals':
                        return fieldValue === filter.value;
                    case 'contains':
                        return String(fieldValue).toLowerCase().includes(String(filter.value).toLowerCase());
                    case 'greater':
                        return Number(fieldValue) > Number(filter.value);
                    case 'less':
                        return Number(fieldValue) < Number(filter.value);
                    case 'in':
                        if (Array.isArray(fieldValue)) {
                            return filter.value.some((v: any) => fieldValue.includes(v));
                        }
                        return fieldValue === filter.value;
                    default:
                        return true;
                }
            });
        });
    }

    async suggestQueries(): Promise<string[]> {
        return [
            'Show tasks with duration greater than 2',
            'Find tasks in phase 2',
            'Search for tasks requiring programming skills',
            'Show workers with qualification level 5 or higher',
            'Find workers available in slots 1,2,3',
            'Show clients with priority level 4 or 5'
        ];
    }
} 