
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload, X } from 'lucide-react';

interface ResumeUploadSectionProps {
  resumeFile: File | null;
  resumeUrl: string;
  onFileSelect: (file: File | null) => void;
  onUrlChange: (url: string) => void;
  isUploading: boolean;
}

export function ResumeUploadSection({
  resumeFile,
  resumeUrl,
  onFileSelect,
  onUrlChange,
  isUploading
}: ResumeUploadSectionProps) {
  const [uploadMethod, setUploadMethod] = useState<'file' | 'url'>('file');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check if file is PDF
      if (file.type !== 'application/pdf') {
        alert('Please select a PDF file only.');
        return;
      }
      onFileSelect(file);
    }
  };

  const clearFile = () => {
    onFileSelect(null);
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
            <div className="flex items-center gap-3">
              <Label htmlFor="resume-upload" className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-md hover:border-gray-400 transition-colors">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">Click to upload PDF</span>
                </div>
              </Label>
              <Input
                id="resume-upload"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                disabled={isUploading}
              />
            </div>
            
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
            
            {isUploading && (
              <div className="text-sm text-gray-600">
                Uploading resume...
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
