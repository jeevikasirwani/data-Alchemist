import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import { FaFileCsv, FaFileExcel, FaFileUpload } from "react-icons/fa";

interface FileUploadProps {
  onFilesUploaded: (files: File[]) => void;
  isProcessing?: boolean;
}

export default function FileUpload({ onFilesUploaded, isProcessing = false }: FileUploadProps) {
  // const [dragactive, setDragactive] = useState(false);
  const [uploadedFiles, setuploadedfiles] = useState<File[]>([]);

  const onDrop = (acceptedFiles: File[]) => {
    if (!isProcessing) {
      onFilesUploaded(acceptedFiles);
      setuploadedfiles(acceptedFiles);
    }
  };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`dropzone border-2 border-dashed bg-white text-gray-500 rounded-lg p-4 text-center transition ease-in-out ${
        isProcessing 
          ? "border-gray-200 bg-gray-100 cursor-not-allowed" 
          : isDragActive
          ? "drag-active border-blue-500 bg-blue-50"
          : "border-gray-300 hover:bg-gray-50 hover:border-blue-500"
      }`}
    >
      <input className="input-zone" {...getInputProps()} disabled={isProcessing} />

      {isProcessing ? (
        <div className="flex items-center justify-center mb-2">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <FaFileUpload size={48} color="#666" />
      )}
      <h3 className="text-lg font-semibold">
        {isProcessing 
          ? "Processing files..." 
          : isDragActive 
          ? "Drop files here" 
          : "Drag and drop files here"}
      </h3>
      <p className="text-sm text-gray-500 mt-2">
        {isProcessing ? "Please wait while files are being processed" : "Or click to select files"}
      </p>
      <div className="text-sm text-gray-500 mt-2">
        Supported formats: CSV, XLSX, XLS
      </div>
      {uploadedFiles.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>Uploaded Files:</h4>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {uploadedFiles.map((file: File, index: number) => (
              <li
                key={index}
                style={{
                  padding: "8px",
                  margin: "4px 0",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "4px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                {file.name.endsWith(".csv") ? <FaFileCsv /> : <FaFileExcel />}
                {file.name} - {(file.size / 1024).toFixed(1)} KB
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
