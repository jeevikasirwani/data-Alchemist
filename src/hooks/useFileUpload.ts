import { useState } from 'react';
import { parseCSV, parseExcel, transformClientData, transformWorkerData, transformTaskData } from '../utils/parsers';
import { AIHeaderMapper, MappingResult } from '../utils/ai-header-mapper';

type EntityType = 'client' | 'worker' | 'task';

interface AppData {
    clients: any[];
    workers: any[];
    tasks: any[];
}

export const useFileUpload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [headerMappings, setHeaderMappings] = useState<MappingResult[]>([]);
    
    const aiHeaderMapper = new AIHeaderMapper();

    const detectEntityType = (headers: string[]): EntityType => {
        const headerStr = headers.join(' ').toLowerCase();
        if (headerStr.includes('clientid') || headerStr.includes('client_name')) return 'client';
        if (headerStr.includes('workerid') || headerStr.includes('worker_name')) return 'worker';
        if (headerStr.includes('taskid') || headerStr.includes('task_name')) return 'task';
        return 'client'; // default
    };

    const processFiles = async (files: File[], currentData: AppData): Promise<AppData> => {
        setIsProcessing(true);
        const newData = { ...currentData };
        const newMappings: MappingResult[] = [];

        try {
            // Process all files in parallel for better performance
            const fileProcessingPromises = files.map(async (file) => {
                try {
                    let rawData: any[];

                    if (file.name.endsWith('.csv')) {
                        rawData = await parseCSV(file);
                    } else {
                        rawData = await parseExcel(file);
                    }

                    if (rawData.length > 0) {
                        const headers = Object.keys(rawData[0]);

                        // AI Header Mapping (optimized)
                        const entityDetection = await aiHeaderMapper.detectEntityType(headers);
                        const mappingResult = await aiHeaderMapper.mapHeaders(headers, entityDetection.entityType);

                        console.log(`AI detected entity type: ${entityDetection.entityType} (confidence: ${entityDetection.confidence.toFixed(2)})`);
                        console.log(`AI mapped ${Object.keys(mappingResult.mappings).length} headers with confidence: ${mappingResult.confidence.toFixed(2)}`);

                        // Apply AI mappings to data
                        const mappedData = rawData.map(row => {
                            const mappedRow: any = {};
                            Object.keys(row).forEach(header => {
                                const mapping = mappingResult.mappings[header];
                                if (mapping) {
                                    mappedRow[mapping.expectedHeader] = row[header];
                                } else {
                                    mappedRow[header] = row[header]; // Keep original if not mapped
                                }
                            });
                            return mappedRow;
                        });

                        let transformedData: any[];
                        switch (entityDetection.entityType) {
                            case 'client':
                                transformedData = transformClientData(mappedData);
                                break;
                            case 'worker':
                                transformedData = transformWorkerData(mappedData);
                                break;
                            case 'task':
                                transformedData = transformTaskData(mappedData);
                                break;
                            default:
                                transformedData = [];
                        }

                        return {
                            entityType: entityDetection.entityType,
                            data: transformedData,
                            mapping: mappingResult
                        };
                    }
                    return null;
                } catch (error) {
                    console.error(`Error processing file ${file.name}:`, error);
                    return null;
                }
            });

            // Wait for all files to be processed
            const results = await Promise.all(fileProcessingPromises);

            // Merge results into newData
            results.forEach(result => {
                if (result) {
                    newMappings.push(result.mapping);
                    switch (result.entityType) {
                        case 'client':
                            newData.clients = [...newData.clients, ...result.data];
                            break;
                        case 'worker':
                            newData.workers = [...newData.workers, ...result.data];
                            break;
                        case 'task':
                            newData.tasks = [...newData.tasks, ...result.data];
                            break;
                    }
                }
            });

        } catch (error) {
            console.error('Error processing files:', error);
        }

        setHeaderMappings(newMappings);
        setIsProcessing(false);
        return newData;
    };

    return {
        isProcessing,
        headerMappings,
        processFiles
    };
}; 