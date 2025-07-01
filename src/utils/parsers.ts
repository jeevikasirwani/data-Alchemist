import Papa from "papaparse";
import readXlsxFile from "read-excel-file";

// Type definitions
type WorkerData = {
  WorkerID: string;
  WorkerName: string;
  Skills: string[];
  AvailableSlots: number[];
  MaxLoadPerPhase: number;
  WorkerGroup: string;
  QualificationLevel: number;
};

type Client = {
  ClientId: string;
  ClientName: string;
  PriorityLevel: number;
  RequestedTaskIDs: string[];
  GroupTag: string;
  AttributesJSON: string;
};

type Task = {
  TaskID: string;
  TaskName: string;
  Category: string;
  Duration: number;
  RequiredSkills: string[];
  PreferredPhases: number[];
  MaxConcurrent: number;
};

// Raw data types for parsing
type RawClientData = {
  ClientID?: string;
  ClientId?: string;
  ClientName?: string;
  PriorityLevel?: string | number;
  RequestedTaskIDs?: string | string[];
  GroupTag?: string;
  AttributesJSON?: string;
};

type RawWorkerData = {
  WorkerID?: string;
  WorkerName?: string;
  Skills?: string | string[];
  AvailableSlots?: string | number[] | number;
  MaxLoadPerPhase?: string | number;
  WorkerGroup?: string;
  QualificationLevel?: string | number;
};

type RawTaskData = {
  TaskID?: string;
  TaskName?: string;
  Category?: string;
  Duration?: string | number;
  RequiredSkills?: string | string[];
  PreferredPhases?: string | number[] | number;
  MaxConcurrent?: string | number;
};

// Generic type for unknown CSV/Excel data
type UnknownRecord = Record<string, unknown>;

export const parseCSV = (file: File): Promise<UnknownRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        console.log("CSV parse results:", results.data);
        resolve(results.data as UnknownRecord[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};

export const parseExcel = async (file: File): Promise<UnknownRecord[]> => {
  try {
    const data = await readXlsxFile(file);

    if (data.length === 0) return [];

    // First row contains headers
    const headers = data[0].map((header) => String(header));
    const dataRows = data.slice(1);

    return dataRows.map((row) => {
      const obj: UnknownRecord = {};
      headers.forEach((header, index) => {
        // Safely access row values and handle different types
        const cellValue = row[index];
        obj[header] = cellValue;
      });
      return obj;
    });
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error}`);
  }
};

// Validation schema for client (keeping for reference but not used in current implementation)
const clientSchema = {
  ClientID: {
    prop: "ClientId",
    type: String,
    required: true,
  },
  ClientName: {
    prop: "ClientName",
    type: String,
    required: true,
  },
  PriorityLevel: {
    prop: "PriorityLevel",
    type: Number,
    required: true,
    validate: (value: number) => {
      if (value < 1 || value > 5) {
        throw new Error("PriorityLevel must be between 1 and 5");
      }
    },
  },
  RequestedTaskIDs: {
    prop: "RequestedTaskIDs",
    type: String,
    required: false,
  },
  GroupTag: {
    prop: "GroupTag",
    type: String,
    required: true,
  },
  AttributesJSON: {
    prop: "AttributesJSON",
    type: String,
    required: false,
  },
};

// Transform raw data to Client interface
export const transformClientData = (rawData: UnknownRecord[]): Client[] => {
  return rawData.map((row: UnknownRecord) => {
    const clientRow = row as RawClientData;
    return {
      ClientId: String(clientRow.ClientID || clientRow.ClientId || ""),
      ClientName: String(clientRow.ClientName || ""),
      PriorityLevel:
        typeof clientRow.PriorityLevel === "number"
          ? clientRow.PriorityLevel
          : parseInt(String(clientRow.PriorityLevel || "0")) || 0,
      RequestedTaskIDs: transformToStringArray(clientRow.RequestedTaskIDs),
      GroupTag: String(clientRow.GroupTag || ""),
      AttributesJSON: String(clientRow.AttributesJSON || ""),
    };
  });
};

// Transform raw data to Worker interface
export const transformWorkerData = (rawData: UnknownRecord[]): WorkerData[] => {
  return rawData.map((row: UnknownRecord) => {
    const workerRow = row as RawWorkerData;
    return {
      WorkerID: String(workerRow.WorkerID || ""),
      WorkerName: String(workerRow.WorkerName || ""),
      Skills: transformToStringArray(workerRow.Skills),
      AvailableSlots: parseAvailableSlots(workerRow.AvailableSlots),
      MaxLoadPerPhase:
        typeof workerRow.MaxLoadPerPhase === "number"
          ? workerRow.MaxLoadPerPhase
          : parseInt(String(workerRow.MaxLoadPerPhase || "0")) || 0,
      WorkerGroup: String(workerRow.WorkerGroup || ""),
      QualificationLevel:
        typeof workerRow.QualificationLevel === "number"
          ? workerRow.QualificationLevel
          : parseInt(String(workerRow.QualificationLevel || "0")) || 0,
    };
  });
};

// Transform raw data to Task interface
export const transformTaskData = (rawData: UnknownRecord[]): Task[] => {
  return rawData.map((row: UnknownRecord) => {
    const taskRow = row as RawTaskData;
    return {
      TaskID: String(taskRow.TaskID || ""),
      TaskName: String(taskRow.TaskName || ""),
      Category: String(taskRow.Category || ""),
      Duration:
        typeof taskRow.Duration === "number"
          ? taskRow.Duration
          : parseInt(String(taskRow.Duration || "0")) || 0,
      RequiredSkills: transformToStringArray(taskRow.RequiredSkills),
      PreferredPhases: parsePreferredPhases(taskRow.PreferredPhases),
      MaxConcurrent:
        typeof taskRow.MaxConcurrent === "number"
          ? taskRow.MaxConcurrent
          : parseInt(String(taskRow.MaxConcurrent || "0")) || 0,
    };
  });
};

// // Helper function to parse AvailableSlots
// const parseAvailableSlots = (slots: unknown): number[] => {
//     if (!slots) return [];

//     try {
//         // If it's already an array, convert to numbers
//         if (Array.isArray(slots)) {
//             return slots.map((slot: unknown) => {
//                 const num = typeof slot === 'number' ? slot : parseInt(String(slot));
//                 return isNaN(num) ? 0 : num;
//             }).filter(slot => !isNaN(slot));
//         }

//         // If it's a string
//         if (typeof slots === 'string') {
//             // Handle array format like "[1,2,3,4,5]"
//             if (slots.startsWith('[') && slots.endsWith(']')) {
//                 const parsed = JSON.parse(slots);
//                 if (Array.isArray(parsed)) {
//                     return parsed.map((item: unknown) => {
//                         const num = typeof item === 'number' ? item : parseInt(String(item));
//                         return isNaN(num) ? 0 : num;
//                     });
//                 }
//             }
//             // Handle comma-separated format
//             return slots.split(',').map(s => parseInt(s.trim())).filter(slot => !isNaN(slot));
//         }

//         // For any other type, try to convert to number
//         const num = typeof slots === 'number' ? slots : parseInt(String(slots));
//         return isNaN(num) ? [] : [num];
//     } catch {
//         return [];
//     }
// };

// // Helper function to parse PreferredPhases
// const parsePreferredPhases = (phases: unknown): number[] => {
//     if (!phases) return [];

//     try {
//         // If it's already an array, convert to numbers
//         if (Array.isArray(phases)) {
//             return phases.map((phase: unknown) => {
//                 const num = typeof phase === 'number' ? phase : parseInt(String(phase));
//                 return isNaN(num) ? 0 : num;
//             }).filter(phase => !isNaN(phase));
//         }

//         // If it's a string
//         if (typeof phases === 'string') {
//             // Handle array format like "[1,2,3]"
//             if (phases.startsWith('[') && phases.endsWith(']')) {
//                 const parsed = JSON.parse(phases);
//                 if (Array.isArray(parsed)) {
//                     return parsed.map((item: unknown) => {
//                         const num = typeof item === 'number' ? item : parseInt(String(item));
//                         return isNaN(num) ? 0 : num;
//                     });
//                 }
//             }
//             // Handle range format like "1-3"
//             if (phases.includes('-')) {
//                 const parts = phases.split('-');
//                 if (parts.length === 2) {
//                     const start = parseInt(parts[0].trim());
//                     const end = parseInt(parts[1].trim());
//                     if (!isNaN(start) && !isNaN(end) && start <= end) {
//                         return Array.from({ length: end - start + 1 }, (_, i) => start + i);
//                     }
//                 }
//             }
//             // Handle comma-separated format
//             return phases.split(',').map(s => parseInt(s.trim())).filter(phase => !isNaN(phase));
//         }

//         // For any other type, try to convert to number
//         const num = typeof phases === 'number' ? phases : parseInt(String(phases));
//         return isNaN(num) ? [] : [num];
//     } catch {
//         return [];
//     }
// };

// // Helper function to transform various input types to string array
// const transformToStringArray = (input: unknown): string[] => {
//     if (!input) return [];

//     // If it's already an array, convert all elements to strings
//     if (Array.isArray(input)) {
//         return input.map((item: unknown) => String(item).trim()).filter(item => item);
//     }

//     // If it's a string, split by comma and trim
//     if (typeof input === 'string') {
//         return input.split(',').map((item: string) => item.trim()).filter(item => item);
//     }

//     // For any other type, convert to string and return as single-item array
//     const stringValue = String(input).trim();
//     return stringValue ? [stringValue] : [];
// };

const parseAvailableSlots = (input: unknown): number[] => {
  if (input === null || input === undefined || input === "") return [];

  // 1) Array
  if (Array.isArray(input)) {
    return input.map((item) => Number(item)).filter((n) => !isNaN(n));
  }

  // 2) String
  if (typeof input === "string") {
    // 2a) JSON parse
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((n) => !isNaN(n));
      }
      if (typeof parsed === "number") {
        return [parsed];
      }
    } catch {
      // not JSON, continue
    }

    // 2b) Fallback: strip brackets, split on commas
    const cleaned = input.replace(/^[\[\]]+|[\[\]]+$/g, "");
    return cleaned
      .split(/[,;]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));
  }

  // 3) Other → single value to number
  const num = Number(input);
  return isNaN(num) ? [] : [num];
};

// helper 2
const parsePreferredPhases = (input: unknown): number[] => {
  if (input === null || input === undefined || input === "") return [];

  // 1) Array
  if (Array.isArray(input)) {
    return input.map((item) => Number(item)).filter((n) => !isNaN(n));
  }

  // 2) String
  if (typeof input === "string") {
    // 2a) JSON parse
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((n) => !isNaN(n));
      }
      if (typeof parsed === "number") {
        return [parsed];
      }
    } catch {
      // not JSON
    }

    // 2b) Range "start-end"
    const rangeMatch = input.match(/^(\d+)\s*-\s*(\d+)$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start <= end) {
        return Array.from({ length: end - start + 1 }, (_, i) => start + i);
      }
    }

    // 2c) Comma-separated
    return input
      .split(/[,;]+/)
      .map((s) => Number(s.trim()))
      .filter((n) => !isNaN(n));
  }

  // 3) Other → single value
  const single = Number(input);
  return isNaN(single) ? [] : [single];
};




// helper 3 - Simple function to always return an array of strings
const transformToStringArray = (input: unknown): string[] => {
  // If it's null, undefined, or empty, return empty array
  if (!input || input === "") return [];

  // If it's already an array, clean it up
  if (Array.isArray(input)) {
    return input
      .map(item => String(item).trim())  // Convert each item to string and trim
      .filter(item => item !== "");      // Remove empty strings
  }

  // If it's a string, split by commas
  if (typeof input === "string") {
    return input
      .split(",")                       // Split by commas
      .map(item => item.trim())         // Trim each piece
      .filter(item => item !== "");     // Remove empty pieces
  }

  // For anything else, convert to string and return as single-item array
  const stringValue = String(input).trim();
  return stringValue ? [stringValue] : [];
};

export { parseAvailableSlots, parsePreferredPhases, transformToStringArray };
