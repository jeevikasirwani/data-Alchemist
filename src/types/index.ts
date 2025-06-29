interface Client{
    ClientId: string;
    ClientName:string;
    PriorityLevel:number;
    RequestedTaskIDs:string[];
    GroupTag:string;
    AttributesJSON:string;
}


interface Worker{
    WorkerID:string;
    WorkerName:string;
    Skills:string[]; //
    AvailableSlots:number[]; //
    MaxLoadPerPhase:number;
    WorkerGroup:string;
    QualificationLevel:number;
}


interface Task {
    TaskID: string;
    TaskName: string;
    Category: string;
    Duration: number;
    RequiredSkills: string[]; //
    PreferredPhases: number[];  //
    MaxConcurrent: number;
  }

  interface ValidationError{
    type:string;
    message:string;
    entity:'client' | 'worker' | 'task';
    entityId:string;
    phase:number;
    timestamp:string;
  }

  interface Rule {
    id: string;
    type: 'coRun' | 'slotRestriction' | 'loadLimit' | 'phaseWindow' | 'patternMatch' | 'precedence';
    tasks?: string[];
    workerGroups?: string[];
    clientGroups?: string[];
    parameters: Record<string, any>;
  }

  interface PriorityWeights {
    priorityLevel: number;
    fulfillment: number;
    fairness: number;
    workload: number;
    cost: number;
  }

  interface Schedule {
    taskId: string;
    workerId: string;
    phase: number;
    clientId: string;
  }

  interface StoreTypes{
    clients:Client[];
    workers:Worker[];
    tasks:Task[];
    validationErrors:ValidationError[];
    schedule:Schedule[];
    isScheduleValid:boolean;
    isScheduleComplete:boolean;
    isScheduleOptimized:boolean;
    isScheduleFeasible:boolean;
  }

  interface AppState {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    validationErrors: ValidationError[];
    rules: Rule[];
    priorities: PriorityWeights;
  }