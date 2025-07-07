
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Download, Trash2, Star, Phone, Mail, MapPin, User, DollarSign, FileText } from 'lucide-react';
import { US_STATES } from '../schemas/contractorSchema';
import type { Tables } from '@/integrations/supabase/types';

type Contractor = Tables<'contractor'>;

interface ContractorProfileProps {
  contractor: Contractor;
  onUpdate: (id: string, updates: Partial<Contractor>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

export function ContractorProfile({ contractor, onUpdate, onDelete, onClose }: ContractorProfileProps) {
  const [editField, setEditField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<any>('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [localContractor, setLocalContractor] = useState<Contractor>(contractor);

  const handleEdit = (field: string, currentValue: any) => {
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
      await onUpdate(localContractor.id, { [editField]: editValue });
      
      // Update local state immediately
      setLocalContractor(prev => ({ ...prev, [editField]: editValue }));
      
      setEditField(null);
      setEditValue('');
    } catch (error) {
      console.error('Error updating contractor:', error);
      alert('Failed to update contractor');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await onDelete(localContractor.id);
      onClose();
    } catch (error) {
      console.error('Error deleting contractor:', error);
      alert('Failed to delete contractor');
    } finally {
      setLoading(false);
    }
  };

  const downloadProfile = () => {
    const profileData = {
      ...localContractor,
      downloaded_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${localContractor.full_name || 'contractor'}_profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleResumeView = () => {
    if (localContractor.resume_url) {
      window.open(localContractor.resume_url, '_blank');
    }
  };

  const renderEditableField = (field: string, label: string, value: any, type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' = 'text', options?: string[]) => (
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
      {editField === field ? (
        <div className="space-y-3">
          {type === 'textarea' ? (
            <Textarea
              value={editValue || ''}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
              className="resize-none"
            />
          ) : type === 'select' ? (
            <Select value={editValue || ''} onValueChange={setEditValue}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : type === 'checkbox' ? (
            <div className="flex items-center space-x-2">
              <Checkbox
                checked={editValue}
                onCheckedChange={setEditValue}
              />
              <span className="text-sm">Yes</span>
            </div>
          ) : (
            <Input
              type={type}
              value={editValue || ''}
              onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
              className="w-full"
            />
          )}
          
          {/* Show validation message for travel_anywhere */}
          {editField === 'travel_anywhere' && !editValue && (localContractor.travel_radius_miles === null || localContractor.travel_radius_miles === undefined) && (
            <p className="text-sm text-red-600">
              Please set a travel radius before unchecking "willing to travel anywhere"
            </p>
          )}
          
          {/* Show validation message for travel_radius_miles */}
          {editField === 'travel_radius_miles' && !localContractor.travel_anywhere && (editValue === null || editValue === undefined || editValue === '') && (
            <p className="text-sm text-red-600">
              Travel radius is required when not willing to travel anywhere
            </p>
          )}
          
          <div className="flex gap-2">
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
      ) : (
        <div className="min-h-[32px] p-2 bg-gray-50 rounded-md border text-sm">
          {type === 'checkbox' ? (
            <span>{value ? 'Yes' : 'No'}</span>
          ) : (
            <span>{value || <span className="text-gray-400 italic">Not provided</span>}</span>
          )}
        </div>
      )}
    </div>
  );

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
                {localContractor.star_candidate && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <Star className="w-3 h-3 mr-1" />
                    Star Candidate
                  </Badge>
                )}
                <Badge variant={localContractor.available ? 'default' : 'secondary'}>
                  {localContractor.available ? 'Available' : 'Unavailable'}
                </Badge>
                <Badge variant="outline">{localContractor.pay_type}</Badge>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={downloadProfile}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
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
            {renderEditableField('city', 'City', localContractor.city)}
            {renderEditableField('state', 'State', localContractor.state, 'select', US_STATES)}
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
              renderEditableField('hourly_rate', 'Hourly Rate ($)', localContractor.hourly_rate, 'number')
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
            
            {localContractor.resume_url && (
              <div className="space-y-2">
                <Label className="font-medium text-gray-700">Resume</Label>
                <div className="p-2 bg-gray-50 rounded-md border">
                  <Button variant="outline" onClick={handleResumeView}>
                    <FileText className="mr-2 h-4 w-4" />
                    View Resume
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Contractor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {localContractor.full_name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
