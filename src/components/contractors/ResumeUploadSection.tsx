
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

interface ResumeUploadSectionProps {
  resumeFile: File | null;
  resumeUrl?: string;
  uploadProgress?: number;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
  onUrlChange?: (url: string) => void;
  isUploading?: boolean;
  isParsing?: boolean;
  parseSuccess?: boolean;
  parseError?: boolean;
  enableParsing?: boolean;
  onToggleParsing?: (enabled: boolean) => void;
}

export function ResumeUploadSection({
  resumeFile,
  resumeUrl = '',
  uploadProgress = 0,
  onFileChange,
  onRemoveFile,
  onUrlChange = () => {},
  isUploading = false,
  isParsing = false,
  parseSuccess = false,
  parseError = false,
  enableParsing = true,
  onToggleParsing = () => {}
}: ResumeUploadSectionProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');
  const [isDragging, setIsDragging] = useState(false);

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    const validExtensions = ['.pdf', '.docx', '.doc'];
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  };

  const handleFileSelect = (file: File) => {
    console.log('File selected:', file.name, 'Type:', file.type);
    
    // Check if file is PDF or DOCX
    if (!isValidFileType(file)) {
      alert('Please select a PDF or Word document (.pdf, .docx, .doc).');
      return;
    }
    
    // Create a proper synthetic event that matches ChangeEvent<HTMLInputElement>
    const input = document.getElementById('resume-upload') as HTMLInputElement;
    if (input) {
      // Create a new FileList-like object
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      
      // Create a synthetic React change event
      const syntheticEvent = {
        target: input,
        currentTarget: input,
        type: 'change',
        bubbles: true,
        cancelable: true,
        defaultPrevented: false,
        eventPhase: 2,
        isTrusted: true,
        nativeEvent: new Event('change'),
        timeStamp: Date.now(),
        preventDefault: () => {},
        stopPropagation: () => {},
        isDefaultPrevented: () => false,
        isPropagationStopped: () => false,
        persist: () => {}
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

  const getFileIcon = (fileName: string) => {
    if (fileName.toLowerCase().endsWith('.pdf')) {
      return <FileText className="h-4 w-4 text-red-600" />;
    } else if (fileName.toLowerCase().endsWith('.docx') || fileName.toLowerCase().endsWith('.doc')) {
      return <FileText className="h-4 w-4 text-blue-600" />;
    }
    return <FileText className="h-4 w-4 text-gray-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Resume
          {isParsing && (
            <Badge className="ml-2 bg-blue-100 text-blue-800 hover:bg-blue-200" variant="outline">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              Parsing
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Upload a resume file or provide a URL
        </CardDescription>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="enable-parsing" 
              checked={enableParsing}
              onCheckedChange={(checked) => onToggleParsing(!!checked)}
              disabled={isUploading || isParsing}
            />
            <Label htmlFor="enable-parsing" className="text-sm text-gray-600">
              Pre-parse resume to auto-fill fields
            </Label>
          </div>
          {enableParsing && (
            <div className="text-xs text-gray-500">
              Powered by Affinda
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={uploadMethod === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMethod('file')}
          >
            Upload File
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
              } ${isParsing || isUploading ? 'pointer-events-none opacity-50' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => !isParsing && !isUploading && document.getElementById('resume-upload')?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm text-gray-600 mb-1">
                Drag and drop your resume here, or click to browse
              </p>
              <p className="text-xs text-gray-500">
                Supports PDF and Word documents (.pdf, .docx, .doc)
              </p>
            </div>
            
            <Input
              id="resume-upload"
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword"
              onChange={onFileChange}
              className="hidden"
              disabled={isUploading || isParsing}
            />
            
            {resumeFile && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md border">
                <div className="flex items-center gap-2">
                  {getFileIcon(resumeFile.name)}
                  <span className="text-sm font-medium">{resumeFile.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(resumeFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                  {parseSuccess && (
                    <Badge className="ml-2 bg-green-100 text-green-800 hover:bg-green-200" variant="outline">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Parsed
                    </Badge>
                  )}
                  {parseError && (
                    <Badge className="ml-2 bg-red-100 text-red-800 hover:bg-red-200" variant="outline">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Parse failed – see console
                    </Badge>
                  )}
                </div>
                {!isUploading && !isParsing && (
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
            
            {/* Parsing indicator removed to avoid duplication */}
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
