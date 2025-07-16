
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2, Star, Phone, Mail, MapPin, User, DollarSign, FileText, X, Tags, Upload, Plus, UserPlus, Check } from 'lucide-react';
import { US_STATES } from '@/lib/schemas/contractorSchema';
import { useContractorData } from '@/hooks/contractors/useContractorData';
import { useContractorSearch } from '@/hooks/contractors/useContractorSearch';
import { useContractorAssignments } from '@/hooks/contractors/useContractorAssignments';
import { ContractorHistory } from './ContractorHistory';
import { ContractorTasks } from './ContractorTasks';
import { ProfileKeywordsSection } from './ProfileKeywordsSection';
import type { Tables } from '@/integrations/supabase/types';
import { toast } from 'sonner';

type Contractor = Tables<'contractor'>;

interface ContractorProfileProps {
  contractorId: string;
  onClose: () => void;
  /**
   * Optional path to navigate to when closing the profile
   * If provided, navigates to this path instead of using onClose
   */
  returnToPath?: string;
}

export function ContractorProfile({ contractorId, onClose, returnToPath }: ContractorProfileProps) {
  const navigate = useNavigate();
  const {
    contractor: localContractor,
    history,
    tasks,
    keywords,
    loading: dataLoading,
    updateContractor,
    addHistoryEntry,
    updateHistoryEntry,
    deleteHistoryEntry,
    addTask,
    updateTask,
    deleteTask,
    updateKeywords
  } = useContractorData(contractorId);

  const { deleteContractor } = useContractorSearch();

  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string | number | boolean | null>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showResumeUploadDialog, setShowResumeUploadDialog] = useState(false);
  const [showAssigneeDialog, setShowAssigneeDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [allEmployees, setAllEmployees] = useState<Tables<'internal_employee'>[]>([]);
  
  // Use the contractor assignments hook
  const { 
    assignees, 
    loading: assigneesLoading, 
    assignEmployeeToContractor,
    unassignEmployeeFromContractor
  } = useContractorAssignments(contractorId);
  
  // Fetch all employees for assignment
  useEffect(() => {
    const fetchAllEmployees = async () => {
      try {
        const { data, error } = await supabase
          .from('internal_employee')
          .select('*')
          .order('full_name');

        if (error) throw error;
        setAllEmployees(data || []);
      } catch (error) {
        console.error('Error fetching employees:', error);
      }
    };

    fetchAllEmployees();
  }, []);

  if (dataLoading || !localContractor) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading contractor profile...</p>
        </div>
      </div>
    );
  }

  const handleEdit = (field: string, currentValue: string | number | boolean | null) => {
    setEditField(field);
    setEditValue(currentValue);
  };

  const canSave = () => {
    // Special validation for travel_anywhere field
    if (editField === 'travel_anywhere' && !editValue) {
      // If unchecking travel_anywhere, require travel_radius_miles
      return localContractor.travel_radius_miles !== null && localContractor.travel_radius_miles !== undefined;
    }
    
    // Special validation for travel_radius_miles when travel_anywhere is false
    if (editField === 'travel_radius_miles' && !localContractor.travel_anywhere) {
      return editValue !== null && editValue !== undefined && editValue !== '';
    }
    
    return true;
  };

  const handleSave = async () => {
    if (!editField || !canSave()) return;
    
    try {
      setLoading(true);
      await updateContractor({ [editField]: editValue });
      setEditField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating contractor:', error);
      alert('Failed to update contractor');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    console.log('Closing contractor profile');
    onClose();
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      console.log('Attempting to delete contractor:', localContractor.id);
      
      await deleteContractor(localContractor.id);
      
      console.log('Contractor deleted successfully');
      
      toast.success('Contractor deleted successfully');
      
      // Close the dialog first
      setShowDeleteDialog(false);
      
      // Use our handleClose method to ensure proper navigation
      handleClose();
      
    } catch (error) {
      console.error('Error deleting contractor:', error);
      toast.error('Failed to delete contractor');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeView = async () => {
    if (localContractor.resume_url) {
      try {
        // Extract the file path from the existing URL
        // The URL format is like: .../storage/v1/object/sign/resumes/[filename]?token=...
        const urlParts = localContractor.resume_url.split('/');
        const filePathWithQuery = urlParts[urlParts.length - 1];
        const filePath = filePathWithQuery.split('?')[0];
        
        // Generate a new signed URL that's valid for 30 minutes
        const { data, error } = await supabase.storage
          .from('resumes')
          .createSignedUrl(filePath, 60 * 30); // 30 minutes
        
        if (error || !data) {
          throw new Error('Failed to generate signed URL');
        }
        
        // Open the new signed URL
        window.open(data.signedUrl, '_blank');
      } catch (error) {
        console.error('Error generating signed URL:', error);
        toast.error('Failed to open resume. Please try again.');
        
        // Fallback to the stored URL if we can't generate a new one
        window.open(localContractor.resume_url, '_blank');
      }
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) return;

    try {
      setLoading(true);
      setUploadProgress(0);

      // Generate unique filename
      const fileExt = resumeFile.name.split('.').pop();
      const fileName = `${localContractor.id}_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(fileName, resumeFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(fileName);

      // Update contractor record
      await updateContractor({ resume_url: publicUrl });

      toast.success('Resume uploaded successfully');
      setShowResumeUploadDialog(false);
      setResumeFile(null);
      setUploadProgress(0);
    } catch (error) {
      console.error('Error uploading resume:', error);
      toast.error('Failed to upload resume');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeDelete = async () => {
    try {
      setLoading(true);
      
      // Delete from storage if exists
      if (localContractor.resume_url) {
        const urlParts = localContractor.resume_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        
        await supabase.storage
          .from('resumes')
          .remove([fileName]);
      }

      // Update contractor record
      await updateContractor({ resume_url: null });

      toast.success('Resume deleted successfully');
    } catch (error) {
      console.error('Error deleting resume:', error);
      toast.error('Failed to delete resume');
    } finally {
      setLoading(false);
    }
  };

  const renderEditableField = (field: string, label: string, value: string | number | boolean | null, type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' = 'text', options?: string[]) => {
    if (editField === field) {
      return (
        <div>
          <div className="flex items-center justify-between mb-1">
            <Label>{label}</Label>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 px-2 text-xs" 
                onClick={() => setEditField(null)}
              >
                Cancel
              </Button>
              <Button 
                size="sm" 
                variant="default" 
                className="h-7 px-2 text-xs" 
                onClick={handleSave} 
                disabled={!canSave()}
              >
                Save
              </Button>
            </div>
          </div>
          
          {type === 'select' && options && (
            <Select 
              value={typeof editValue === 'string' ? editValue : ''} 
              onValueChange={(value: string) => setEditValue(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                {options.map(option => (
                  <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          
          {type === 'textarea' && (
            <Textarea 
              value={typeof editValue === 'string' ? editValue : ''}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full"
            />
          )}
          
          {type === 'checkbox' && (
            <div className="flex items-center space-x-2">
              <Checkbox 
                checked={typeof editValue === 'boolean' ? editValue : false} 
                onCheckedChange={(checked: boolean) => setEditValue(checked)} 
              />
              <Label>{label}</Label>
            </div>
          )}
          
          {['text', 'number', 'email', 'tel'].includes(type) && (
            <Input 
              type={type} 
              value={typeof editValue === 'string' || typeof editValue === 'number' ? editValue : ''}
              onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            />
          )}
          
          {/* Show validation message for travel_radius_miles */}
          {editField === 'travel_radius_miles' && !localContractor.travel_anywhere && (editValue === null || editValue === undefined || editValue === '') && (
            <p className="text-sm text-red-600">
              Travel radius is required when not willing to travel anywhere
            </p>
          )}
          
          <div className="flex gap-2 mt-4">
            <Button 
              size="sm" 
              onClick={handleSave} 
              disabled={loading || !canSave()}
            >
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditField(null)}>
              Cancel
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="font-medium text-gray-700">{label}</Label>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(field, value)}
            className="h-8 w-8 p-0 hover:bg-gray-100"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-[32px] p-2 bg-gray-50 rounded-md border text-sm">
          {type === 'checkbox' ? (
            <span>{value ? 'Yes' : 'No'}</span>
          ) : value === null || value === '' ? (
            <span className="text-gray-400 italic">Not provided</span>
          ) : (
            <span>{String(value)}</span>
          )}
        </div>
      </div>
    );
  };

  const handleKeywordsSave = async (newKeywords: typeof keywords) => {
    try {
      await updateKeywords(newKeywords);
    } catch (error) {
      console.error('Error saving keywords:', error);
      throw error;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{localContractor.full_name}</h1>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant={localContractor.available ? 'default' : 'secondary'}>
                  {localContractor.available ? 'Available' : 'Unavailable'}
                </Badge>
                <Badge variant="outline">{localContractor.pay_type}</Badge>
                {assignees && assignees.length > 0 && (
                  <Badge variant="outline" className="bg-blue-50 text-blue-800">
                    Assigned: {assignees.length}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <Button variant="outline" onClick={handleClose}>
            <X className="mr-2 h-4 w-4" />
            Close
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5 text-primary" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('full_name', 'Full Name', localContractor.full_name)}
            {renderEditableField('email', 'Email', localContractor.email, 'email')}
            {renderEditableField('phone', 'Phone', localContractor.phone, 'tel')}
            {renderEditableField('preferred_contact', 'Preferred Contact', localContractor.preferred_contact, 'select', ['email', 'phone', 'text'])}
          </CardContent>
        </Card>

        {/* Location & Travel */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5 text-primary" />
              Location & Travel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('street_address', 'Street Address', localContractor.street_address)}
            {renderEditableField('city', 'City', localContractor.city)}
            {renderEditableField('state', 'State', localContractor.state, 'select', US_STATES)}
            {renderEditableField('zip_code', 'Zip Code', localContractor.zip_code)}
            {renderEditableField('country', 'Country', localContractor.country)}
            {renderEditableField('travel_anywhere', 'Willing to Travel Anywhere', localContractor.travel_anywhere, 'checkbox')}
            {!localContractor.travel_anywhere && renderEditableField('travel_radius_miles', 'Travel Radius (miles)', localContractor.travel_radius_miles, 'number')}
          </CardContent>
        </Card>

        {/* Pay Information */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <DollarSign className="h-5 w-5 text-primary" />
              Pay Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('pay_type', 'Pay Type', localContractor.pay_type, 'select', ['W2', '1099'])}
            {renderEditableField('prefers_hourly', 'Prefers Hourly', localContractor.prefers_hourly, 'checkbox')}
            {localContractor.prefers_hourly ? (
              <>
                {renderEditableField('hourly_rate', 'Hourly Rate ($)', localContractor.hourly_rate, 'number')}
                {localContractor.pay_rate_upper && (
                  <div className="space-y-2">
                    <Label className="font-medium text-gray-700">Upper Hourly Rate</Label>
                    <div className="min-h-[32px] p-2 bg-gray-50 rounded-md border text-sm">
                      ${localContractor.pay_rate_upper}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                {renderEditableField('salary_lower', 'Minimum Salary ($)', localContractor.salary_lower, 'number')}
                {renderEditableField('salary_higher', 'Maximum Salary ($)', localContractor.salary_higher, 'number')}
              </>
            )}
          </CardContent>
        </Card>

        {/* Status & Flags */}
        <Card className="shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-primary" />
              Status & Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('star_candidate', 'Star Candidate', localContractor.star_candidate, 'checkbox')}
            {renderEditableField('available', 'Available', localContractor.available, 'checkbox')}
          </CardContent>
        </Card>

        {/* Notes & Summary */}
        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-primary" />
              Notes & Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {renderEditableField('notes', 'Goals / Interests', localContractor.notes, 'textarea')}
            {renderEditableField('summary', 'Candidate Summary', localContractor.summary, 'textarea')}
            
            {/* Resume Section */}
            <div className="space-y-2">
              <Label className="font-medium text-gray-700">Resume</Label>
              <div className="p-2 bg-gray-50 rounded-md border">
                {localContractor.resume_url ? (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={handleResumeView}>
                      <FileText className="mr-2 h-4 w-4" />
                      View Resume
                    </Button>
                    <Button variant="outline" onClick={() => setShowResumeUploadDialog(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Replace Resume
                    </Button>
                    <Button variant="outline" onClick={handleResumeDelete}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Resume
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowResumeUploadDialog(true)}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Resume
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Keywords Section */}
      <ProfileKeywordsSection 
        keywords={keywords}
        onSave={handleKeywordsSave}
      />

      {/* History Section */}
      <ContractorHistory
        contractorId={contractorId}
        entries={history}
        onAddEntry={addHistoryEntry}
        onUpdateEntry={updateHistoryEntry}
        onDeleteEntry={deleteHistoryEntry}
      />

      {/* Tasks Section */}
      <ContractorTasks
        contractorId={contractorId}
        tasks={tasks}
        onAddTask={addTask}
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />

      {/* Actions Section */}
      <Card className="shadow-sm border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Danger Zone</CardTitle>
          <CardDescription>
            These actions cannot be undone. Please be careful.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Contractor
          </Button>
        </CardContent>
      </Card>

      {/* Resume Upload Dialog */}
      <Dialog open={showResumeUploadDialog} onOpenChange={setShowResumeUploadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Resume</DialogTitle>
            <DialogDescription>
              Upload a new resume file (PDF format recommended)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
            />
            {uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResumeUploadDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleResumeUpload} disabled={!resumeFile || loading}>
              {loading ? 'Uploading...' : 'Upload Resume'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contractor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {localContractor.full_name}? This action cannot be undone and will remove all associated history and tasks.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={loading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete Contractor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Employee Assignments Dialog */}
      <Dialog open={showAssigneeDialog} onOpenChange={setShowAssigneeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Internal Employee Assignments</DialogTitle>
            <DialogDescription>
              Select which internal employees should be assigned to this contractor.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {assignees && (
              <div className="mb-4">
                <Label className="text-sm font-medium">Current Assignments</Label>
                {assignees.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {assignees.map(item => (
                      <Badge key={item.employee?.id} variant="secondary" className="gap-1">
                        {item.employee?.full_name}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-4 w-4 rounded-full p-0 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                          onClick={async () => {
                            await unassignEmployeeFromContractor(contractorId, item.internal_employee_id);
                          }}
                        >
                          <X className="h-2 w-2" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground mt-1">No employees currently assigned</div>
                )}
              </div>
            )}
            
            <Label className="text-sm font-medium">Available Employees</Label>
            <ScrollArea className="h-60 mt-2 border rounded-md p-2">
              <div className="space-y-2">
                {allEmployees
                  .filter(employee => !assignees?.some(assignee => assignee.internal_employee_id === employee.id))
                  .map(employee => (
                    <div 
                      key={employee.id} 
                      className="flex items-center justify-between rounded-md p-2 hover:bg-muted cursor-pointer"
                      onClick={async () => {
                        await assignEmployeeToContractor(contractorId, employee.id);
                      }}
                    >
                      <span>{employee.full_name}</span>
                      <Button size="sm" variant="ghost" className="p-0 h-6 w-6">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                {allEmployees.filter(employee => !assignees?.some(assignee => assignee.internal_employee_id === employee.id)).length === 0 && (
                  <div className="text-center py-4 text-sm text-muted-foreground">
                    All employees are already assigned
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="sm:justify-end">
            <Button variant="outline" onClick={() => setShowAssigneeDialog(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
