export interface Client {
    ClientId: string;
    ClientName: string;
    PriorityLevel: number;
    RequestedTaskIDs: string[];
    GroupTag: string;
    AttributesJSON: string;
}

export interface Worker {
    WorkerID: string;
    WorkerName: string;
    Skills: string[];
    AvailableSlots: number[];
    MaxLoadPerPhase: number;
    WorkerGroup: string;
    QualificationLevel: number;
}

export interface Task {
    TaskID: string;
    TaskName: string;
    Category: string;
    Duration: number;
    RequiredSkills: string[];
    PreferredPhases: number[];
    MaxConcurrent: number;
    Dependencies?: string[];
}

export interface ValidationError {
    row: number;
    column: string;
    message: string;
    type: 'error' | 'warning' | 'critical';
    entityType: 'client' | 'worker' | 'task' | 'system';
    severity: 1 | 2 | 3 | 4 | 5;
    timestamp?: string;
}

export interface Rule {
    id: string;
    type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedence';
    tasks?: string[];
    workerGroups?: string[];
    clientGroups?: string[];
    parameters: Record<string, unknown>;
}

export interface PriorityWeights {
    priorityLevel: number;
    fulfillment: number;
    fairness: number;
    workload: number;
    cost: number;
}

export interface Schedule {
    taskId: string;
    workerId: string;
    phase: number;
    clientId: string;
}

export interface AppData {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
}

export interface StoreTypes {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    validationErrors: ValidationError[];
    schedule: Schedule[];
    isScheduleValid: boolean;
    isScheduleComplete: boolean;
    isScheduleOptimized: boolean;
    isScheduleFeasible: boolean;
}

export interface AppState {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    validationErrors: ValidationError[];
    rules: Rule[];
    priorities: PriorityWeights;
}

export type EntityType = 'client' | 'worker' | 'task';

export interface DataUpdateFunction {
    (entityType: EntityType, updatedData: Client[] | Worker[] | Task[]): void;
}