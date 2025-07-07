
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, X } from 'lucide-react';

interface ResumeUploadSectionProps {
  resumeFile: File | null;
  uploadProgress: number;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: () => void;
}

export function ResumeUploadSection({ 
  resumeFile, 
  uploadProgress, 
  onFileChange, 
  onRemoveFile 
}: ResumeUploadSectionProps) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle>Resume</CardTitle>
        <CardDescription>Upload the contractor's resume (PDF or Word document)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <Label htmlFor="resume" className="cursor-pointer">
            <span className="text-primary hover:text-primary/80 font-medium">
              Click to upload
            </span>
            {' or drag and drop'}
          </Label>
          <input
            id="resume"
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx"
            onChange={onFileChange}
          />
          <p className="text-sm text-gray-500 mt-2">
            PDF, DOC, or DOCX up to 5MB
          </p>
          {resumeFile && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm text-primary">
                <span>✓ {resumeFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRemoveFile}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <Progress value={uploadProgress} className="w-full" />
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
