
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
import { Edit, Download, Trash2, Star, Phone, Mail, MapPin } from 'lucide-react';
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

  const handleEdit = (field: string, currentValue: any) => {
    setEditField(field);
    setEditValue(currentValue);
  };

  const handleSave = async () => {
    if (!editField) return;
    
    try {
      setLoading(true);
      await onUpdate(contractor.id, { [editField]: editValue });
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
      await onDelete(contractor.id);
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
      ...contractor,
      downloaded_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contractor.full_name || 'contractor'}_profile.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const renderEditableField = (field: string, label: string, value: any, type: 'text' | 'number' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox' = 'text', options?: string[]) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="font-medium">{label}</Label>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleEdit(field, value)}
          className="h-8 w-8 p-0"
        >
          <Edit className="h-4 w-4" />
        </Button>
      </div>
      {editField === field ? (
        <div className="space-y-2">
          {type === 'textarea' ? (
            <Textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              rows={3}
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
              <span>Yes</span>
            </div>
          ) : (
            <Input
              type={type}
              value={editValue}
              onChange={(e) => setEditValue(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={loading}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditField(null)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="min-h-[20px] p-2 bg-gray-50 rounded">
          {type === 'checkbox' ? (
            value ? 'Yes' : 'No'
          ) : (
            value || <span className="text-gray-400">Not provided</span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{contractor.full_name}</h2>
          {contractor.star_candidate && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1" />
              Star Candidate
            </Badge>
          )}
          <Badge variant={contractor.available ? 'default' : 'secondary'}>
            {contractor.available ? 'Available' : 'Unavailable'}
          </Badge>
        </div>
        <div className="flex gap-2">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('full_name', 'Full Name', contractor.full_name)}
            {renderEditableField('email', 'Email', contractor.email, 'email')}
            {renderEditableField('phone', 'Phone', contractor.phone, 'tel')}
            {renderEditableField('preferred_contact', 'Preferred Contact', contractor.preferred_contact, 'select', ['email', 'phone', 'text'])}
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Location & Travel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('city', 'City', contractor.city)}
            {renderEditableField('state', 'State', contractor.state, 'select', US_STATES)}
            {renderEditableField('travel_anywhere', 'Willing to Travel Anywhere', contractor.travel_anywhere, 'checkbox')}
            {!contractor.travel_anywhere && renderEditableField('travel_radius_miles', 'Travel Radius (miles)', contractor.travel_radius_miles, 'number')}
          </CardContent>
        </Card>

        {/* Pay Information */}
        <Card>
          <CardHeader>
            <CardTitle>Pay Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('pay_type', 'Pay Type', contractor.pay_type, 'select', ['W2', '1099'])}
            {renderEditableField('prefers_hourly', 'Prefers Hourly', contractor.prefers_hourly, 'checkbox')}
            {contractor.prefers_hourly ? (
              renderEditableField('hourly_rate', 'Hourly Rate ($)', contractor.hourly_rate, 'number')
            ) : (
              <>
                {renderEditableField('salary_lower', 'Minimum Salary ($)', contractor.salary_lower, 'number')}
                {renderEditableField('salary_higher', 'Maximum Salary ($)', contractor.salary_higher, 'number')}
              </>
            )}
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {renderEditableField('star_candidate', 'Star Candidate', contractor.star_candidate, 'checkbox')}
            {renderEditableField('available', 'Available', contractor.available, 'checkbox')}
            {renderEditableField('notes', 'Notes', contractor.notes, 'textarea')}
            {contractor.resume_url && (
              <div className="space-y-2">
                <Label className="font-medium">Resume</Label>
                <Button variant="outline" asChild>
                  <a href={contractor.resume_url} target="_blank" rel="noopener noreferrer">
                    View Resume
                  </a>
                </Button>
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
              Are you sure you want to delete {contractor.full_name}? This action cannot be undone.
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
