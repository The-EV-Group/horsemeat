
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/auth/useAuth';

interface HistoryEntry {
  id: string;
  note: string;
  inserted_at: string;
  created_by: string;
  creator_name?: string;
}

interface ContractorHistoryProps {
  contractorId: string;
  entries: HistoryEntry[];
  onAddEntry: (note: string) => Promise<void>;
  onUpdateEntry: (id: string, note: string) => Promise<void>;
  onDeleteEntry: (id: string) => Promise<void>;
}

export function ContractorHistory({ 
  contractorId, 
  entries, 
  onAddEntry, 
  onUpdateEntry, 
  onDeleteEntry 
}: ContractorHistoryProps) {
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<HistoryEntry | null>(null);
  const [deleteEntry, setDeleteEntry] = useState<HistoryEntry | null>(null);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddEntry = async () => {
    if (!newNote.trim()) return;
    
    try {
      setLoading(true);
      await onAddEntry(newNote);
      setNewNote('');
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding history entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEntry = async () => {
    if (!editingEntry || !newNote.trim()) return;
    
    try {
      setLoading(true);
      await onUpdateEntry(editingEntry.id, newNote);
      setEditingEntry(null);
      setNewNote('');
    } catch (error) {
      console.error('Error updating history entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!deleteEntry) return;
    
    try {
      setLoading(true);
      await onDeleteEntry(deleteEntry.id);
      setDeleteEntry(null);
    } catch (error) {
      console.error('Error deleting history entry:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (entry: HistoryEntry) => {
    setEditingEntry(entry);
    setNewNote(entry.note);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            History
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Entry
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No history entries yet. Add the first entry to track interactions.
          </p>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {format(new Date(entry.inserted_at), 'MMM d, yyyy')}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      by {entry.creator_name || 'Unknown'}
                    </span>
                  </div>
                  {entry.created_by === user?.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(entry)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteEntry(entry)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <p className="text-sm">{entry.note}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Entry Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add History Entry</DialogTitle>
            <DialogDescription>
              Add a note to track interactions with this contractor.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEntry} disabled={loading || !newNote.trim()}>
              Add Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Entry Dialog */}
      <Dialog open={!!editingEntry} onOpenChange={() => setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit History Entry</DialogTitle>
            <DialogDescription>
              Update this history entry.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter your note..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateEntry} disabled={loading || !newNote.trim()}>
              Update Entry
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteEntry} onOpenChange={() => setDeleteEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete History Entry</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this history entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteEntry(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteEntry} disabled={loading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
