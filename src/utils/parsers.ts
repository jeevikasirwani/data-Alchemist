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
  ClientID: string;
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

// Helper function to detect if first row contains headers
const detectHeaders = (firstRow: any[], secondRow?: any[]): boolean => {
  if (!firstRow || firstRow.length === 0) return false;
  if (!secondRow || secondRow.length === 0) return true; // Assume headers if only one row
  
  // Check if first row contains mostly strings and second row contains different types
  const firstRowTypes = firstRow.map(val => typeof val);
  const secondRowTypes = secondRow.map(val => typeof val);
  
  // If first row has more strings and second row has more numbers, likely headers
  const firstRowStrings = firstRowTypes.filter(t => t === 'string').length;
  const firstRowNumbers = firstRowTypes.filter(t => t === 'number').length;
  const secondRowNumbers = secondRowTypes.filter(t => t === 'number').length;
  
  // Heuristic: headers if first row is mostly strings and second row has numbers
  return firstRowStrings > firstRowNumbers && secondRowNumbers > 0;
};

// Helper function to generate default headers for columns
const generateDefaultHeaders = (columnCount: number): string[] => {
  const defaultHeaders = [
    'ClientID', 'ClientName', 'PriorityLevel', 'RequestedTaskIDs', 
    'GroupTag', 'AttributesJSON', 'Column7', 'Column8', 'Column9', 'Column10'
  ];
  
  const headers: string[] = [];
  for (let i = 0; i < columnCount; i++) {
    if (i < defaultHeaders.length) {
      headers.push(defaultHeaders[i]);
    } else {
      headers.push(`Column${i + 1}`);
    }
  }
  return headers;
};

export const parseCSV = (file: File): Promise<UnknownRecord[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false, // Parse without headers first to detect structure
      dynamicTyping: true,
      skipEmptyLines: false, // Keep empty lines to process all data
      complete: (results) => {
        console.log("Raw CSV parse results:", results.data);
        
        const rawData = results.data as any[][];
        if (rawData.length === 0) {
          resolve([]);
          return;
        }

        // Check if first row looks like headers (contains strings vs numbers/data)
        const firstRow = rawData[0];
        const hasHeaders = detectHeaders(firstRow, rawData[1]);
        
        let headers: string[];
        let dataRows: any[][];
        
        if (hasHeaders) {
          headers = firstRow.map(h => String(h || '').trim());
          dataRows = rawData.slice(1);
          console.log("✅ Headers detected:", headers);
        } else {
          // Generate default headers based on data structure and inspect actual data
          headers = generateDefaultHeaders(firstRow.length);
          dataRows = rawData;
          console.log("🔧 Generated default headers:", headers);
          console.log("🔍 First few data rows for inspection:", dataRows.slice(0, 3));
        }

        // Convert to object format, including empty rows
        const objectData = dataRows.map((row, index) => {
          const obj: UnknownRecord = {};
          headers.forEach((header, colIndex) => {
            const cellValue = row[colIndex];
            // Keep all values, even empty ones
            obj[header] = cellValue === undefined || cellValue === null ? '' : cellValue;
          });
          return obj;
        });

        console.log("📊 Final processed data:", objectData);
        resolve(objectData);
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
  return rawData.map((row: UnknownRecord, index: number) => {
    const clientRow = row as RawClientData;
    
    // Handle ClientName specifically - if empty, don't set to empty string
    let clientName = String(clientRow.ClientName || "").trim();
    if (!clientName || clientName === "null" || clientName === "undefined") {
      clientName = ""; // Will be caught by validation and corrected
    }
    
    return {
      ClientID: String(clientRow.ClientID || clientRow.ClientId || ""), // Use ClientID consistently
      ClientName: clientName,
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
  if (input === null || input === undefined || input === "") return [];

  // If it's already an array, clean it up
  if (Array.isArray(input)) {
    return input
      .map(item => String(item).trim())  // Convert each item to string and trim
      .filter(item => item !== "");      // Remove empty strings
  }

  // If it's a string, attempt to parse JSON-like list first
  if (typeof input === "string") {
    const trimmed = input.trim();
    // Detect brackets [] and try JSON.parse after replacing single quotes with double quotes
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const jsonReady = trimmed.replace(/'/g, '"');
        const parsed = JSON.parse(jsonReady);
        if (Array.isArray(parsed)) {
          return parsed.map(item => String(item).trim()).filter(Boolean);
        }
      } catch {
        // fall through to comma split
      }
    }
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
