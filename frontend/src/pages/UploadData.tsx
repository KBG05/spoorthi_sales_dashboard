import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  LinearProgress,
  Alert,
  Chip,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import { apiClient } from '../api/client';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.xlsm', '.xlsb'];

const UploadData: React.FC = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = (f: File): string | null => {
    const parts = f.name.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : '';
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type "${ext || '(none)'}". Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`;
    }
    return null;
  };

  const handleFileSelect = (f: File) => {
    const error = validateFile(f);
    if (error) {
      setResult({ success: false, message: error });
      setFile(null);
    } else {
      setFile(f);
      setResult(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
    // Reset so the same file can be re-selected after clearing
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await apiClient.post('/upload/file', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });
      setResult({ success: true, message: 'File uploaded and forwarded successfully.' });
      setFile(null);
    } catch (error: any) {
      const msg =
        error?.response?.data?.detail ||
        error?.message ||
        'Upload failed. Please try again.';
      setResult({ success: false, message: String(msg) });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', boxSizing: 'border-box' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 1, fontWeight: 600 }}>
        Upload Data File
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Upload an Excel or CSV file to forward to the data processor. Supported formats:{' '}
        {ALLOWED_EXTENSIONS.join(', ')}.
      </Typography>

      {/* Drop Zone */}
      <Paper
        elevation={1}
        sx={{
          maxWidth: 560,
          p: 5,
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 3,
          textAlign: 'center',
          cursor: 'pointer',
          transition: 'border-color 200ms ease, background-color 200ms ease',
          backgroundColor: dragOver ? 'action.hover' : 'background.paper',
          userSelect: 'none',
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXTENSIONS.join(',')}
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />
        <CloudUploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 1.5 }} />
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
          Drag &amp; drop a file here, or click to browse
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {ALLOWED_EXTENSIONS.join('  ·  ')}
        </Typography>
      </Paper>

      {/* Selected file chip + upload button */}
      {file && (
        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Chip
            icon={<FileIcon />}
            label={file.name}
            onDelete={() => { setFile(null); setResult(null); }}
            variant="outlined"
            sx={{ maxWidth: 400, fontWeight: 500 }}
          />
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={uploading}
            sx={{ fontWeight: 600 }}
          >
            Upload
          </Button>
        </Box>
      )}

      {/* Progress bar */}
      {uploading && (
        <Box sx={{ mt: 2, maxWidth: 560 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Uploading and forwarding file…
          </Typography>
        </Box>
      )}

      {/* Success / error result */}
      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mt: 3, maxWidth: 560 }}>
          {result.message}
        </Alert>
      )}
    </Box>
  );
};

export default UploadData;
