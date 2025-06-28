// Local type definitions to avoid import issues
type Client = {
    ClientId: string;
    ClientName: string;
    PriorityLevel: number;
    RequestedTaskIDs: string[];
    GroupTag: string;
    AttributesJSON: string;
}

type WorkerData = {
    WorkerID: string;
    WorkerName: string;
    Skills: string[];
    AvailableSlots: number[];
    MaxLoadPerPhase: number;
    WorkerGroup: string;
    QualificationLevel: number;
}

type Task = {
    TaskID: string;
    TaskName: string;
    Category: string;
    Duration: number;
    RequiredSkills: string[];
    PreferredPhases: number[];
    MaxConcurrent: number;
}

export interface ValidationError {
    row: number;
    column: string;
    message: string;
    type: 'error' | 'warning';
    entityType: 'client' | 'worker' | 'task';
}

export interface ValidationSummary {
    totalErrors: number;
    totalWarnings: number;
    errorsByEntity: Record<string, number>;
    errorsByType: Record<string, number>;
}

export class ValidationEngine {
    private clients: Client[] = [];
    private workers: WorkerData[] = [];
    private tasks: Task[] = [];

    setData(clients: Client[], workers: WorkerData[], tasks: Task[]) {
        this.clients = clients;
        this.workers = workers;
        this.tasks = tasks;
    }

    validateAll(): { errors: ValidationError[]; summary: ValidationSummary } {
        const errors: ValidationError[] = [];
        
        // Validate each entity type
        errors.push(...this.validateClients());
        errors.push(...this.validateWorkers());
        errors.push(...this.validateTasks());
        
        // Cross-entity validations
        errors.push(...this.validateCrossEntity());
        
        const summary = this.generateSummary(errors);
        return { errors, summary };
    }

    private validateClients(): ValidationError[] {
        const errors: ValidationError[] = [];
        const clientIds = new Set<string>();

        this.clients.forEach((client, index) => {
            // 1. Missing required columns
            if (!client.ClientId) {
                errors.push({
                    row: index,
                    column: 'ClientId',
                    message: 'ClientID is required',
                    type: 'error',
                    entityType: 'client'
                });
            }

            // 2. Duplicate IDs
            if (client.ClientId) {
                if (clientIds.has(client.ClientId)) {
                    errors.push({
                        row: index,
                        column: 'ClientId',
                        message: 'Duplicate ClientID found',
                        type: 'error',
                        entityType: 'client'
                    });
                } else {
                    clientIds.add(client.ClientId);
                }
            }

            // 3. Out-of-range values (PriorityLevel 1-5)
            if (client.PriorityLevel < 1 || client.PriorityLevel > 5) {
                errors.push({
                    row: index,
                    column: 'PriorityLevel',
                    message: 'PriorityLevel must be between 1 and 5',
                    type: 'error',
                    entityType: 'client'
                });
            }

            // 4. Broken JSON in AttributesJSON
            if (client.AttributesJSON) {
                try {
                    JSON.parse(client.AttributesJSON);
                } catch {
                    errors.push({
                        row: index,
                        column: 'AttributesJSON',
                        message: 'Invalid JSON format',
                        type: 'error',
                        entityType: 'client'
                    });
                }
            }
        });

        return errors;
    }

    private validateWorkers(): ValidationError[] {
        const errors: ValidationError[] = [];
        const workerIds = new Set<string>();

        this.workers.forEach((worker, index) => {
            // 1. Missing required columns
            if (!worker.WorkerID) {
                errors.push({
                    row: index,
                    column: 'WorkerID',
                    message: 'WorkerID is required',
                    type: 'error',
                    entityType: 'worker'
                });
            }

            // 2. Duplicate IDs
            if (worker.WorkerID) {
                if (workerIds.has(worker.WorkerID)) {
                    errors.push({
                        row: index,
                        column: 'WorkerID',
                        message: 'Duplicate WorkerID found',
                        type: 'error',
                        entityType: 'worker'
                    });
                } else {
                    workerIds.add(worker.WorkerID);
                }
            }

            // 3. Malformed lists (AvailableSlots)
            const availableSlots = Array.isArray(worker.AvailableSlots) ? worker.AvailableSlots : [];
            if (availableSlots.some((slot: number) => isNaN(slot) || slot < 1)) {
                errors.push({
                    row: index,
                    column: 'AvailableSlots',
                    message: 'AvailableSlots must contain valid positive numbers',
                    type: 'error',
                    entityType: 'worker'
                });
            }

            // 4. Overloaded workers
            if (availableSlots.length < worker.MaxLoadPerPhase) {
                errors.push({
                    row: index,
                    column: 'MaxLoadPerPhase',
                    message: 'MaxLoadPerPhase cannot exceed AvailableSlots count',
                    type: 'error',
                    entityType: 'worker'
                });
            }

            // 5. Qualification level validation
            if (worker.QualificationLevel < 1 || worker.QualificationLevel > 10) {
                errors.push({
                    row: index,
                    column: 'QualificationLevel',
                    message: 'QualificationLevel must be between 1 and 10',
                    type: 'error',
                    entityType: 'worker'
                });
            }
        });

        return errors;
    }

    private validateTasks(): ValidationError[] {
        const errors: ValidationError[] = [];
        const taskIds = new Set<string>();

        this.tasks.forEach((task, index) => {
            // 1. Missing required columns
            if (!task.TaskID) {
                errors.push({
                    row: index,
                    column: 'TaskID',
                    message: 'TaskID is required',
                    type: 'error',
                    entityType: 'task'
                });
            }

            // 2. Duplicate IDs
            if (task.TaskID) {
                if (taskIds.has(task.TaskID)) {
                    errors.push({
                        row: index,
                        column: 'TaskID',
                        message: 'Duplicate TaskID found',
                        type: 'error',
                        entityType: 'task'
                    });
                } else {
                    taskIds.add(task.TaskID);
                }
            }

            // 3. Out-of-range values (Duration < 1)
            if (task.Duration < 1) {
                errors.push({
                    row: index,
                    column: 'Duration',
                    message: 'Duration must be at least 1',
                    type: 'error',
                    entityType: 'task'
                });
            }

            // 4. MaxConcurrent validation
            if (task.MaxConcurrent < 1) {
                errors.push({
                    row: index,
                    column: 'MaxConcurrent',
                    message: 'MaxConcurrent must be at least 1',
                    type: 'error',
                    entityType: 'task'
                });
            }
        });

        return errors;
    }

    private validateCrossEntity(): ValidationError[] {
        const errors: ValidationError[] = [];
        const taskIds = new Set(this.tasks.map(t => t.TaskID));

        // Unknown references (RequestedTaskIDs not in tasks)
        this.clients.forEach((client, index) => {
            // Ensure RequestedTaskIDs is always an array
            const requestedTaskIDs = Array.isArray(client.RequestedTaskIDs) ? client.RequestedTaskIDs : [];
            
            requestedTaskIDs.forEach((taskId: string) => {
                if (!taskIds.has(taskId)) {
                    errors.push({
                        row: index,
                        column: 'RequestedTaskIDs',
                        message: `TaskID "${taskId}" not found in tasks`,
                        type: 'error',
                        entityType: 'client'
                    });
                }
            });
        });

        // Skill-coverage matrix: every RequiredSkill maps to ≥1 worker
        const allWorkerSkills = new Set<string>();
        this.workers.forEach(worker => {
            // Ensure Skills is always an array
            const skills = Array.isArray(worker.Skills) ? worker.Skills : [];
            skills.forEach((skill: string) => allWorkerSkills.add(skill));
        });

        this.tasks.forEach((task, index) => {
            // Ensure RequiredSkills is always an array
            const requiredSkills = Array.isArray(task.RequiredSkills) ? task.RequiredSkills : [];
            requiredSkills.forEach((skill: string) => {
                if (!allWorkerSkills.has(skill)) {
                    errors.push({
                        row: index,
                        column: 'RequiredSkills',
                        message: `No worker has skill "${skill}"`,
                        type: 'warning',
                        entityType: 'task'
                    });
                }
            });
        });

        return errors;
    }

    private generateSummary(errors: ValidationError[]): ValidationSummary {
        const summary: ValidationSummary = {
            totalErrors: errors.filter(e => e.type === 'error').length,
            totalWarnings: errors.filter(e => e.type === 'warning').length,
            errorsByEntity: {},
            errorsByType: {}
        };

        errors.forEach(error => {
            summary.errorsByEntity[error.entityType] = (summary.errorsByEntity[error.entityType] || 0) + 1;
            summary.errorsByType[error.type] = (summary.errorsByType[error.type] || 0) + 1;
        });

        return summary;
    }
} 