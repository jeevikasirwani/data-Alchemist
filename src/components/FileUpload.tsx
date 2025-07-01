import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaFileCsv, FaFileExcel, FaFileUpload } from "react-icons/fa";
import { parseCSV, parseExcel, transformClientData, transformWorkerData, transformTaskData } from '../utils/parsers';
import { mapHeaders } from '../utils/simple-header-mapper';
import { EntityType, Client, Worker, Task } from '../types';

interface FileUploadProps {
  onDataProcessed: (entityType: EntityType, data: Client[] | Worker[] | Task[]) => void;
}

export default function FileUpload({ onDataProcessed }: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mappingInfo, setMappingInfo] = useState<string | null>(null);

  const processFile = async (file: File) => {
    try {
      console.log(`Processing file: ${file.name}`);
      setMappingInfo('Analyzing headers with AI...');

      // Parse file first to get headers
      let rawData: Record<string, unknown>[];
      if (file.name.toLowerCase().endsWith('.csv')) {
        rawData = await parseCSV(file);
      } else {
        rawData = await parseExcel(file);
      }

      if (!rawData || rawData.length === 0) {
        throw new Error('File appears to be empty or invalid');
      }

      // Get headers from the data
      const headers = Object.keys(rawData[0]);
      console.log('Original headers:', headers);

      // Use AI to map headers and detect entity type
      setMappingInfo('AI is mapping headers...');
      const mappingResult = await mapHeaders(headers);
      console.log('AI mapping result:', mappingResult);

      // Use AI-detected entity type (fallback to filename detection)
      let entityType = mappingResult.entityType;
      const filename = file.name.toLowerCase();
      if (filename.includes('client')) entityType = 'client';
      else if (filename.includes('worker')) entityType = 'worker';
      else if (filename.includes('task')) entityType = 'task';

      // Apply header mappings to transform data
      let mappedData = rawData;
      if (Object.keys(mappingResult.mappings).length > 0) {
        setMappingInfo('Applying header mappings...');
        mappedData = rawData.map(row => {
          const newRow: Record<string, unknown> = {};
          Object.entries(row).forEach(([key, value]) => {
            const mappedKey = mappingResult.mappings[key] || key;
            newRow[mappedKey] = value;
          });
          return newRow;
        });
        console.log('🔄 Applied header mappings');
      }

      // Transform data based on entity type
      setMappingInfo('Transforming data...');
      let transformedData: Client[] | Worker[] | Task[];
      switch (entityType) {
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
          throw new Error(`Unknown entity type: ${entityType}`);
      }

      onDataProcessed(entityType, transformedData);
      console.log(`✅ Successfully processed ${transformedData.length} ${entityType} records`);

      // Show success message with mapping info
      if (mappingResult.unmapped.length > 0) {
        setMappingInfo(`✅ Processed successfully! Unmapped headers: ${mappingResult.unmapped.join(', ')}`);
      } else {
        setMappingInfo('✅ All headers mapped successfully!');
      }

      // Clear success message after 3 seconds
      setTimeout(() => setMappingInfo(null), 3000);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'File processing failed';
      setError(errorMsg);
      setMappingInfo(null);
      console.error('❌ File processing failed:', errorMsg);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    if (isProcessing) return;

    setIsProcessing(true);
    setError(null);
    setMappingInfo(null);
    setUploadedFiles(acceptedFiles);

    try {
      for (const file of acceptedFiles) {
        await processFile(file);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  });

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 cursor-pointer bg-white text-gray-600
          ${isProcessing
            ? "border-gray-300 bg-gray-50 cursor-not-allowed"
            : isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:bg-gray-50 hover:border-blue-400"
          }`}
      >
        <input className="input-zone" {...getInputProps()} disabled={isProcessing} />

        {isProcessing ? (
          <div className="flex flex-col items-center justify-center mb-3">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mb-2"></div>
            <div className="text-blue-600 text-sm">Processing...</div>
          </div>
        ) : (
          <div className="mb-4">
            <FaFileUpload size={32} className="mx-auto text-gray-400 mb-2" />
          </div>
        )}

        <h3 className="text-lg font-medium text-gray-800 mb-2">
          {isProcessing
            ? "Processing files..."
            : isDragActive
              ? "Drop files here"
              : "Drag and drop files here"}
        </h3>

        <p className="text-gray-500 mb-3 text-sm">
          {isProcessing ? "AI is analyzing and mapping your data..." : "Or click to select files"}
        </p>

        <div className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded inline-block">
          Supported formats: CSV, XLSX, XLS • AI header mapping included
        </div>
      </div>

      {/* AI Mapping Status */}
      {mappingInfo && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-blue-700 text-sm">
          🤖 {mappingInfo}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded text-red-700">
          ❌ {error}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3 text-sm">Uploaded Files:</h4>
          <div className="space-y-2">
            {uploadedFiles.map((file: File, index: number) => (
              <div
                key={index}
                className="flex items-center gap-3 p-2 bg-white rounded border border-gray-200 text-sm"
              >
                <div className="text-blue-500">
                  {file.name.endsWith(".csv") ? <FaFileCsv size={16} /> : <FaFileExcel size={16} />}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-gray-800">{file.name}</div>
                  <div className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}