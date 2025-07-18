
import { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useDashboardStats } from '@/hooks/dashboard/useDashboardStats';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Users, Clock, CheckSquare, Edit, Eye, EyeOff, Trash2, User, Calendar as CalendarIcon, Building } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

interface ContractorWithTasks {
  id: string;
  full_name: string;
  openTaskCount: number;
}

export default function Dashboard() {
  const { employee, user } = useAuth();
  const { stats, tasks, completedTasks, employees, loading, updateTask, deleteTask, getDaysUntilDue } = useDashboardStats();
  const navigate = useNavigate();
  const [editingTask, setEditingTask] = useState<any>(null);
  const [taskToDelete, setTaskToDelete] = useState<any>(null);
  const [showContractors, setShowContractors] = useState(false);
  const [contractors, setContractors] = useState<ContractorWithTasks[]>([]);
  const [contractorsLoading, setContractorsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'in progress' as 'overdue' | 'in progress' | 'completed',
    due_date: undefined as Date | undefined
  });
  const [dayFilter, setDayFilter] = useState<string>('all');
  const [taskLoading, setTaskLoading] = useState(false);

  // Check if current user can edit/delete a task
  const canEditTask = (task: any) => {
    return task.created_by === user?.id;
  };

  const fetchMyContractors = async () => {
    if (!employee?.id) {
      console.log('No employee ID found, cannot fetch contractors');
      return;
    }
    
    try {
      setContractorsLoading(true);
      console.log('Fetching contractors for employee ID:', employee.id);
      
      // Get contractors assigned to the current employee through contractor_internal_link table
      const { data: linkData, error: linkError } = await supabase
        .from('contractor_internal_link')
        .select('contractor_id')
        .eq('internal_employee_id', employee.id);

      console.log('Contractor link query result:', { linkData, linkError });

      if (linkError) throw linkError;

      if (!linkData || linkData.length === 0) {
        console.log('No contractors found for this employee');
        setContractors([]);
        return;
      }
      
      // Extract contractor IDs from the link table
      const assignedContractorIds = linkData.map(link => link.contractor_id);
      
      // Get the actual contractor data
      const { data: contractorData, error: contractorError } = await supabase
        .from('contractor')
        .select('id, full_name')
        .in('id', assignedContractorIds);
        
      console.log('Contractor query result:', { contractorData, contractorError });

      if (contractorError) throw contractorError;

      if (!contractorData || contractorData.length === 0) {
        console.log('No contractors found for this employee');
        setContractors([]);
        return;
      }

      // Get open task counts for each contractor
      const contractorIds = contractorData.map(c => c.id);
      console.log('Fetching task counts for contractor IDs:', contractorIds);
      
      const { data: taskCounts, error: taskError } = await supabase
        .from('contractor_task')
        .select('contractor_id')
        .in('contractor_id', contractorIds)
        .in('status', ['in progress', 'overdue']);

      console.log('Task counts query result:', { taskCounts, taskError });

      if (taskError) throw taskError;

      // Count tasks per contractor
      const taskCountMap = (taskCounts || []).reduce((acc, task) => {
        acc[task.contractor_id] = (acc[task.contractor_id] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('Task count map:', taskCountMap);

      // Combine contractor data with task counts
      const contractorsWithTasks: ContractorWithTasks[] = contractorData.map(contractor => ({
        id: contractor.id,
        full_name: contractor.full_name || 'Unknown',
        openTaskCount: taskCountMap[contractor.id] || 0
      }));

      console.log('Final contractors with tasks:', contractorsWithTasks);
      setContractors(contractorsWithTasks);
    } catch (error) {
      console.error('Error fetching contractors:', error);
    } finally {
      setContractorsLoading(false);
    }
  };

  const handleViewContractors = async () => {
    await fetchMyContractors();
    setShowContractors(true);
  };

  const handleViewContractorProfile = (contractorId: string) => {
    console.log('Dashboard: Navigating to contractor profile:', contractorId);
    // Navigate directly to the contractor profile page with return path in state
    navigate(`/contractors/profile/${contractorId}`, { 
      state: { 
        returnPath: '/dashboard',  // Return to dashboard when closed
        source: 'dashboard' // Track the source of navigation
      } 
    });
  };

  const handleUpdateTask = async () => {
    if (!editingTask) return;
    
    try {
      setTaskLoading(true);
      
      // Auto-update to overdue if due date is today or past and status is not completed
      let finalStatus = formData.status;
      if (formData.due_date && formData.status !== 'completed') {
        const daysUntil = getDaysUntilDue(formData.due_date.toISOString());
        if (daysUntil !== null && daysUntil <= 0) {
          finalStatus = 'overdue';
        }
      }
      
      await updateTask(editingTask.id, { 
        title: formData.title,
        description: formData.description,
        status: finalStatus,
        due_date: formData.due_date ? formData.due_date.toISOString() : null
      });
      setEditingTask(null);
      resetForm();
    } catch (error) {
      console.error('Error updating task:', error);
    } finally {
      setTaskLoading(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      setTaskLoading(true);
      await deleteTask(taskToDelete.id);
      setTaskToDelete(null);
    } catch (error) {
      console.error('Error deleting task:', error);
    } finally {
      setTaskLoading(false);
    }
  };

  const handleToggleVisibility = async (task: any) => {
    if (!canEditTask(task)) return;
    
    try {
      await updateTask(task.id, { is_public: !task.is_public });
    } catch (error) {
      console.error('Error updating task visibility:', error);
    }
  };

  const openEditDialog = (task: any) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      due_date: task.due_date ? new Date(task.due_date) : undefined
    });
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      status: 'in progress',
      due_date: undefined
    });
  };

  const openContractorProfile = (contractorId: string) => {
    console.log('Dashboard: Opening contractor profile from task card:', contractorId);
    // Navigate directly to the contractor profile page with return path in state
    navigate(`/contractors/profile/${contractorId}`, { 
      state: { 
        returnPath: '/dashboard',  // Return to dashboard when closed
        source: 'dashboard-task' // Track the source as a task in dashboard
      } 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFilteredTasks = () => {
    if (dayFilter === 'all') return tasks;
    if (dayFilter === 'overdue') return tasks.filter(task => task.status === 'overdue');
    
    const days = parseInt(dayFilter);
    return tasks.filter(task => {
      if (!task.due_date) return dayFilter === 'no-due-date';
      const daysUntil = getDaysUntilDue(task.due_date);
      return daysUntil !== null && daysUntil <= days && daysUntil >= -days;
    });
  };

  const filteredTasks = getFilteredTasks();

  const statsData = [
    { 
      label: 'Total Contractors', 
      value: loading ? '...' : stats.totalContractors.toString(), 
      icon: Users 
    },
    { 
      label: 'Active Contractors', 
      value: loading ? '...' : stats.activeContractors.toString(), 
      icon: Clock 
    },
  ];

  const renderTaskCard = (task: any) => {
    const daysUntil = getDaysUntilDue(task.due_date);
    const isOwner = canEditTask(task);
    
    return (
      <div key={task.id} className="border rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h4 className="font-medium">{task.title}</h4>
            <Badge className={getStatusColor(task.status)}>
              {task.status}
            </Badge>
            {!task.is_public && (
              <Badge variant="outline">Private</Badge>
            )}
            {task.due_date && task.status !== 'completed' && (
              <Badge variant="outline">
                {daysUntil !== null && daysUntil > 0 
                  ? `${daysUntil} days left`
                  : daysUntil === 0 
                  ? 'Due today'
                  : `${Math.abs(daysUntil!)} days overdue`
                }
              </Badge>
            )}
          </div>
          <div className="flex gap-1">
            {isOwner && (
              <>
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
                  onClick={() => setTaskToDelete(task)}
                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openContractorProfile(task.contractor_id)}
              className="h-8 w-8 p-0"
              title="Open Contractor Profile"
            >
              <User className="h-4 w-4" />
            </Button>
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleVisibility(task)}
                className="h-8 w-8 p-0"
              >
                {task.is_public ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
        
        {task.description && (
          <p className="text-sm text-gray-600">{task.description}</p>
        )}
        
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>For: {task.contractor_name}</span>
          <span>By: {task.creator_name}</span>
          <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy')}</span>
          {task.due_date && (
            <span>Due: {format(new Date(task.due_date), 'MMM d, yyyy')}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg p-6 border border-primary/10">
        <h1 className="text-3xl font-bold text-primary mb-2">
          Welcome back, {employee?.full_name || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="text-gray-600">
          Manage your contractor relationships and track tasks from here.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {statsData.map((stat, index) => (
          <Card key={index} className="shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-primary">{stat.value}</p>
                </div>
                <div className="bg-primary/10 p-3 rounded-lg">
                  <stat.icon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* My Contractors Section */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building className="h-5 w-5" />
                My Contractors
              </CardTitle>
              <CardDescription>
                View all contractors that belong to you and their open task counts
              </CardDescription>
            </div>
            <Button onClick={handleViewContractors} disabled={contractorsLoading}>
              <Users className="h-4 w-4 mr-2" />
              {contractorsLoading ? 'Loading...' : 'View My Contractors'}
            </Button>
          </div>
        </CardHeader>
        {showContractors && (
          <CardContent>
            {contractorsLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600">Loading contractors...</p>
              </div>
            ) : contractors.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">
                  You don't have any contractors assigned to you yet.
                </p>
                <p className="text-sm text-gray-400">
                  Employee ID: {employee?.id || 'Not found'}
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {contractors.map((contractor) => (
                  <div key={contractor.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-4">
                      <div>
                        <h4 className="font-medium">{contractor.full_name}</h4>
                        <p className="text-sm text-gray-600">
                          {contractor.openTaskCount} open task{contractor.openTaskCount !== 1 ? 's' : ''}
                        </p>
                      </div>
                      {contractor.openTaskCount > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {contractor.openTaskCount} open
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewContractorProfile(contractor.id)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      View Profile
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Active Tasks Section */}
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5" />
                Active Task Management
              </CardTitle>
              <CardDescription>
                Track and manage active contractor tasks across all your projects
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={dayFilter} onValueChange={setDayFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by due date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tasks</SelectItem>
                  <SelectItem value="overdue">Overdue Tasks</SelectItem>
                  <SelectItem value="1">Due within 1 day</SelectItem>
                  <SelectItem value="3">Due within 3 days</SelectItem>
                  <SelectItem value="7">Due within 1 week</SelectItem>
                  <SelectItem value="14">Due within 2 weeks</SelectItem>
                  <SelectItem value="30">Due within 1 month</SelectItem>
                  <SelectItem value="no-due-date">No due date</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading tasks...</p>
            </div>
          ) : filteredTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No active tasks found. Create tasks in contractor profiles to see them here.
            </p>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {filteredTasks.map(renderTaskCard)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Tasks Section */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-green-600" />
            Completed Tasks
          </CardTitle>
          <CardDescription>
            View all completed contractor tasks
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600">Loading completed tasks...</p>
            </div>
          ) : completedTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No completed tasks yet.
            </p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {completedTasks.map(renderTaskCard)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Task Dialog */}
      <Dialog open={!!editingTask} onOpenChange={() => {
        setEditingTask(null);
        resetForm();
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
            <DialogDescription>
              Update task details for "{editingTask?.title}"
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
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(value: 'overdue' | 'in progress' | 'completed') => 
                setFormData(prev => ({ ...prev, status: value }))
              }>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setEditingTask(null);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateTask} disabled={taskLoading || !formData.title.trim()}>
              Update Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Task Dialog */}
      <Dialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{taskToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTaskToDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTask} disabled={taskLoading}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
