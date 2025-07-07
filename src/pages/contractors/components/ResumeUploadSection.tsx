
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, X } from 'lucide-react';

interface ResumeUploadSectionProps {
  resumeFile: File | null;
  resumeUrl?: string;
  uploadProgress?: number;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onUrlChange?: (url: string) => void;
  isUploading?: boolean;
}

export function ResumeUploadSection({
  resumeFile,
  resumeUrl = '',
  uploadProgress = 0,
  onFileChange,
  onRemoveFile,
  onUrlChange = () => {},
  isUploading = false
}: ResumeUploadSectionProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (file: File | null) => {
    if (file) {
      // Check if file is PDF
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file only.');
        return;
      }
      // Create a synthetic event for the file
      const syntheticEvent = {
        target: {
          files: file ? [file] : null
        }
      } as React.ChangeEvent<HTMLInputElement>;
      onFileChange(syntheticEvent);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      handleFileSelect(file);
    }
  };

  const clearFile = () => {
    onRemoveFile();
    // Reset the input
    const input = document.getElementById('resume-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume
        </CardTitle>
        <CardDescription>
          Upload a PDF resume or provide a URL to an existing resume
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={uploadMethod === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMethod('file')}
          >
            Upload PDF
          </Button>
          <Button
            type="button"
            variant={uploadMethod === 'url' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMethod('url')}
          >
            Resume URL
          </Button>
        </div>

        {uploadMethod === 'file' && (
          <div className="space-y-3">
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('resume-upload')?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-1">
                Drag and drop your PDF resume here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Only PDF files are accepted
              </p>
            </div>
            
            <Input
              id="resume-upload"
              type="file"
              accept=".pdf,application/pdf"
              onChange={onFileChange}
              className="hidden"
              disabled={isUploading}
            />
            
            {resumeFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{resumeFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(resumeFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                {!isUploading && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearFile}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
            
            {isUploading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-gray-600">
                  Uploading resume... {uploadProgress}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        )}

        {uploadMethod === 'url' && (
          <div className="space-y-2">
            <Label htmlFor="resume-url">Resume URL</Label>
            <Input
              id="resume-url"
              type="url"
              placeholder="https://example.com/resume.pdf"
              value={resumeUrl}
              onChange={(e) => onUrlChange(e.target.value)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
