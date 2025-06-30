import { useState } from 'react';
import { parseCSV, parseExcel, transformClientData, transformWorkerData, transformTaskData } from '../utils/parsers';
import { SimpleHeaderMapper, MappingResult } from '../utils/simple-header-mapper';
import { Client, Worker, Task, EntityType, AppData } from '../types';

interface FileUploadState {
    clients: Client[];
    workers: Worker[];
    tasks: Task[];
    isProcessing: boolean;
    uploadProgress: number;
}

export const useFileUpload = () => {
    const [uploadState, setUploadState] = useState<FileUploadState>({
        clients: [],
        workers: [],
        tasks: [],
        isProcessing: false,
        uploadProgress: 0
    });

    const mapper = new SimpleHeaderMapper();

    const handleFileUpload = async (
        file: File, 
        entityType: EntityType,
        onDataUpdate: (entityType: EntityType, data: Client[] | Worker[] | Task[]) => void
    ) => {
        setUploadState(prev => ({ ...prev, isProcessing: true, uploadProgress: 0 }));
        
        try {
            console.log(`📁 Processing ${entityType} file:`, file.name);
            
            // Parse the file
            let rawData: Record<string, unknown>[];
            if (file.name.toLowerCase().endsWith('.csv')) {
                rawData = await parseCSV(file);
            } else {
                rawData = await parseExcel(file);
            }
            
            setUploadState(prev => ({ ...prev, uploadProgress: 30 }));
            
            // Map headers using smart pattern matching for better accuracy
            const headers = Object.keys(rawData[0] || {});
            const mappingResult: MappingResult = await mapper.mapHeaders(headers, entityType);
            
            setUploadState(prev => ({ ...prev, uploadProgress: 60 }));
            
            // Transform data based on entity type
            let transformedData: Client[] | Worker[] | Task[];
            
            switch (entityType) {
                case 'client':
                    transformedData = transformClientData(rawData);
                    break;
                case 'worker':
                    transformedData = transformWorkerData(rawData);
                    break;
                case 'task':
                    transformedData = transformTaskData(rawData);
                    break;
                default:
                    throw new Error(`Unknown entity type: ${entityType}`);
            }
            
            setUploadState(prev => ({ ...prev, uploadProgress: 90 }));
            
            // Update state and notify parent
            setUploadState(prev => ({
                ...prev,
                [entityType === 'client' ? 'clients' : entityType === 'worker' ? 'workers' : 'tasks']: transformedData,
                uploadProgress: 100,
                isProcessing: false
            }));
            
            onDataUpdate(entityType, transformedData);
            
            console.log(`✅ Successfully processed ${transformedData.length} ${entityType} records`);
            
        } catch (error) {
            console.error(`Error processing ${entityType} file:`, error);
            setUploadState(prev => ({ ...prev, isProcessing: false, uploadProgress: 0 }));
        }
    };

    const getAppData = (): AppData => ({
        clients: uploadState.clients,
        workers: uploadState.workers,
        tasks: uploadState.tasks
    });

    return {
        uploadState,
        handleFileUpload,
        getAppData
    };
}; 