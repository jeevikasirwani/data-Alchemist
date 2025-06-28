import Papa from 'papaparse'
import readXlsxFile from 'read-excel-file'

// Type definitions to avoid conflicts
type WorkerData = {
    WorkerID: string;
    WorkerName: string;
    Skills: string[];
    AvailableSlots: number[];
    MaxLoadPerPhase: number;
    WorkerGroup: string;
    QualificationLevel: number;
}

type Client = {
    ClientId: string;
    ClientName: string;
    PriorityLevel: number;
    RequestedTaskIDs: string[];
    GroupTag: string;
    AttributesJSON: string;
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

export const parseCSV = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true, 
            complete: (results) => {
                console.log(results.data);
                resolve(results.data as any[]);
            }, 
            error: (error) => {
                reject(error);
            }
        });
    });
}

export const parseExcel = async (file: File): Promise<any[]> => {

    try {
        const data = await readXlsxFile(file);

        if (data.length === 0) return [];

        const headers = data[0] as string[];
        const dataRows = data.slice(1);

        return dataRows.map((row: any[]) => {
            const obj: any = {};
            headers.forEach((headers, index) => {
                obj[headers] = row[index];
            });
            return obj;
        })
    } catch (error) {
        throw new Error(`Failed to parse Excel file: ${error}`);
    }
};

// validation schema for client
const clientSchema = {
    'ClientID': {
        prop: 'ClientId',
        type: String,
        required: true
    },
    'ClientName': {
        prop: 'ClientName',
        type: String,
        required: true
    },
    'PriorityLevel': {
        prop: 'PriorityLevel',
        type: Number,
        required: true,
        validate: (value: number) => {
            if (value < 1 || value > 5) {
                throw new Error('PriorityLevel must be between 1 and 5');
            }
        }
    },
    'RequestedTaskIDs': {
        prop: 'RequestedTaskIDs',
        type: String,
        required: false
    },
    'GroupTag': {
        prop: 'GroupTag',
        type: String,
        required: true
    },
    'AttributesJSON': {
        prop: 'AttributesJSON',
        type: String,
        required: false
    }
}



// Transform raw data to Client interface
export const transformClientData = (rawData: any[]): Client[] => {
        return rawData.map((row: any) => ({
            ClientId: row.ClientID || row.ClientId,
            ClientName: row.ClientName,
            PriorityLevel: parseInt(row.PriorityLevel) || 0,
            RequestedTaskIDs: transformToStringArray(row.RequestedTaskIDs),
            GroupTag: row.GroupTag,
            AttributesJSON: row.AttributesJSON
        }));
    };

    // Transform raw data to Worker interface
    export const transformWorkerData = (rawData: any[]): WorkerData[] => {
        return rawData.map((row: any) => ({
            WorkerID: row.WorkerID,
            WorkerName: row.WorkerName,
            Skills: transformToStringArray(row.Skills),
            AvailableSlots: parseAvailableSlots(row.AvailableSlots),
            MaxLoadPerPhase: parseInt(row.MaxLoadPerPhase) || 0,
            WorkerGroup: row.WorkerGroup,
            QualificationLevel: parseInt(row.QualificationLevel) || 0
        }));
    };

    // Transform raw data to Task interface
    export const transformTaskData = (rawData: any[]): Task[] => {
        return rawData.map((row: any) => ({
            TaskID: row.TaskID,
            TaskName: row.TaskName,
            Category: row.Category,
            Duration: parseInt(row.Duration) || 0,
            RequiredSkills: transformToStringArray(row.RequiredSkills),
            PreferredPhases: parsePreferredPhases(row.PreferredPhases),
            MaxConcurrent: parseInt(row.MaxConcurrent) || 0
        }));
    };

    // Helper function to parse AvailableSlots
    const parseAvailableSlots = (slots: any): number[] => {
        if (!slots) return [];
        
        try {
            // If it's already an array, convert to numbers
            if (Array.isArray(slots)) {
                return slots.map((slot: any) => parseInt(slot)).filter(slot => !isNaN(slot));
            }
            
            // If it's a string
            if (typeof slots === 'string') {
                // Handle array format like "[1,2,3,4,5]"
                if (slots.startsWith('[') && slots.endsWith(']')) {
                    return JSON.parse(slots);
                }
                // Handle comma-separated format
                return slots.split(',').map(s => parseInt(s.trim())).filter(slot => !isNaN(slot));
            }
            
            // For any other type, try to convert to number
            const num = parseInt(slots);
            return isNaN(num) ? [] : [num];
        } catch {
            return [];
        }
    };

    // Helper function to parse PreferredPhases
    const parsePreferredPhases = (phases: any): number[] => {
        if (!phases) return [];
        
        try {
            // If it's already an array, convert to numbers
            if (Array.isArray(phases)) {
                return phases.map((phase: any) => parseInt(phase)).filter(phase => !isNaN(phase));
            }
            
            // If it's a string
            if (typeof phases === 'string') {
                // Handle array format like "[1,2,3]"
                if (phases.startsWith('[') && phases.endsWith(']')) {
                    return JSON.parse(phases);
                }
                // Handle range format like "1-3"
                if (phases.includes('-')) {
                    const [start, end] = phases.split('-').map(s => parseInt(s.trim()));
                    if (!isNaN(start) && !isNaN(end)) {
                        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
                    }
                }
                // Handle comma-separated format
                return phases.split(',').map(s => parseInt(s.trim())).filter(phase => !isNaN(phase));
            }
            
            // For any other type, try to convert to number
            const num = parseInt(phases);
            return isNaN(num) ? [] : [num];
        } catch {
            return [];
        }
    };

    // Helper function to transform various input types to string array
    const transformToStringArray = (input: any): string[] => {
        if (!input) return [];
        
        // If it's already an array, convert all elements to strings
        if (Array.isArray(input)) {
            return input.map((item: any) => String(item).trim()).filter(item => item);
        }
        
        // If it's a string, split by comma and trim
        if (typeof input === 'string') {
            return input.split(',').map((item: string) => item.trim()).filter(item => item);
        }
        
        // For any other type, convert to string and return as single-item array
        return [String(input).trim()].filter(item => item);
    };

// Functions to parse CSV and Excel files
// Convert raw data to our TypeScript interfaces
// Handle data transformation (strings to arrays, etc.)
