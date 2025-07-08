
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Edit, Trash2, CheckSquare, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'overdue' | 'in progress' | 'completed';
  due_date: string | null;
  is_public: boolean;
  created_by: string;
  created_at: string;
  creator_name?: string;
}

interface ContractorTasksProps {
  contractorId: string;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'created_at' | 'created_by'>) => Promise<void>;
  onUpdateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
}

export function ContractorTasks({ 
  contractorId, 
  tasks, 
  onAddTask, 
  onUpdateTask, 
  onDeleteTask 
}: ContractorTasksProps) {
  const { user } = useAuth();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    due_date: undefined as Date | undefined,
    is_public: false
  });
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      due_date: undefined,
      is_public: false
    });
  };

  const getStatusFromDueDate = (dueDate: Date | undefined): Task['status'] => {
    if (!dueDate) return 'in progress';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < now ? 'overdue' : 'in progress';
  };

  const handleAddTask = async () => {
    if (!formData.title.trim()) return;
    
    try {
      setLoading(true);
      const status = getStatusFromDueDate(formData.due_date);
      await onAddTask({
        title: formData.title,
        description: formData.description || null,
        status,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        is_public: formData.is_public
      });
      resetForm();
      setShowAddDialog(false);
    } catch (error) {
      console.error('Error adding task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!editingTask || !formData.title.trim()) return;
    
    try {
      setLoading(true);
      await onUpdateTask(editingTask.id, {
        title: formData.title,
        description: formData.description || null,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        is_public: formData.is_public
      });
      setEditingTask(null);
      resetForm();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTask) return;
    
    try {
      setLoading(true);
      await onDeleteTask(deleteTask.id);
      setDeleteTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      due_date: task.due_date ? new Date(task.due_date) : undefined,
      is_public: task.is_public
    });
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Filter tasks based on visibility
  const visibleTasks = tasks.filter(task => 
    task.is_public || task.created_by === user?.id
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5" />
            Tasks
          </CardTitle>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {visibleTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No tasks yet. Add the first task to start tracking work.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleTasks.map((task) => (
              <div key={task.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge className={getStatusColor(task.status)}>
                      {task.status}
                    </Badge>
                    {!task.is_public && (
                      <Badge variant="outline">Private</Badge>
                    )}
                  </div>
                  {task.created_by === user?.id && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(task)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTask(task)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
                
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
                
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Created by {task.creator_name || 'Unknown'}</span>
                  <span>on {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
                  {task.due_date && (
                    <span>
                      Due {format(new Date(task.due_date), 'MMM d, yyyy')} 
                      ({getDaysUntilDue(task.due_date) > 0 
                        ? `${getDaysUntilDue(task.due_date)} days left`
                        : getDaysUntilDue(task.due_date) === 0 
                        ? 'Due today'
                        : `${Math.abs(getDaysUntilDue(task.due_date))} days overdue`
                      })
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Task Dialog */}
      <Dialog open={showAddDialog || !!editingTask} onOpenChange={() => {
        setShowAddDialog(false);
        setEditingTask(null);
        resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTask ? 'Edit Task' : 'Add Task'}</DialogTitle>
            <DialogDescription>
              {editingTask ? 'Update task details.' : 'Create a new task for this contractor.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Task title"
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Task description (optional)"
                rows={3}
              />
            </div>
            
            <div>
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date ? format(formData.due_date, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(date) => setFormData(prev => ({ ...prev, due_date: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-sm text-gray-500 mt-1">
                Status will be set automatically based on due date
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_public"
                checked={formData.is_public}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, is_public: !!checked }))
                }
              />
              <Label htmlFor="is_public">Make this task public (visible to all users)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowAddDialog(false);
              setEditingTask(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={editingTask ? handleUpdateTask : handleAddTask} 
              disabled={loading || !formData.title.trim()}
            >
              {editingTask ? 'Update Task' : 'Add Task'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTask} onOpenChange={() => setDeleteTask(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteTask?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTask(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={loading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
