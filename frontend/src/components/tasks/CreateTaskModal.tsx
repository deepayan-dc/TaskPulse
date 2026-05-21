import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useTasks } from '../../context/TaskContext';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { authService } from '../../services/auth.service';
import { TaskPriority } from '../../types/task';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateTaskModal = ({ isOpen, onClose }: Props) => {
  const { createTask } = useTasks();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [assignees, setAssignees] = useState<Array<{ id: string; name: string }>>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch employees dynamically when the modal is opened
  useEffect(() => {
    if (isOpen) {
      const loadEmployees = async () => {
        try {
          const list = await authService.getEmployees();
          setAssignees(list);
          if (list.length > 0) {
            setAssigneeId(list[0].id);
          }
        } catch (err) {
          console.error('Failed to load employees for task creation dropdown', err);
        }
      };
      loadEmployees();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      const assignee = assignees.find(a => a.id === assigneeId);
      if (!assignee) {
        console.error('No assignee selected or loaded');
        setIsSubmitting(false);
        return;
      }
      
      const createdTask = await createTask({
        title,
        description,
        priority,
        dueDate: new Date(dueDate).toISOString(),
        assignee,
        createdBy: { id: user.id, name: user.name }
      });
      
      addNotification(assignee.id, `You have been assigned a new task: ${title}`, createdTask.id);
      
      // Reset and close
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('Medium');
      onClose();
    } catch (err) {
      console.error('Failed to create task', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
          <input 
            type="text" 
            required 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            className="w-full glass-input" 
            placeholder="E.g. Fix login bug"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
          <textarea 
            required 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="w-full glass-input min-h-[100px]" 
            placeholder="Detailed description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Assignee</label>
            <select 
              value={assigneeId} 
              onChange={e => setAssigneeId(e.target.value)} 
              className="w-full glass-input appearance-none bg-gray-900"
            >
              {assignees.length === 0 ? (
                <option value="" className="bg-gray-900" disabled>No employees loaded</option>
              ) : (
                assignees.map(a => (
                  <option key={a.id} value={a.id} className="bg-gray-900">{a.name}</option>
                ))
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Priority</label>
            <select 
              value={priority} 
              onChange={e => setPriority(e.target.value as TaskPriority)} 
              className="w-full glass-input appearance-none bg-gray-900"
            >
              <option value="Low" className="bg-gray-900">Low</option>
              <option value="Medium" className="bg-gray-900">Medium</option>
              <option value="High" className="bg-gray-900">High</option>
              <option value="Critical" className="bg-gray-900">Critical</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">Due Date</label>
          <input 
            type="date" 
            required 
            value={dueDate} 
            onChange={e => setDueDate(e.target.value)} 
            className="w-full glass-input appearance-none"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting || assignees.length === 0}
            className="btn-primary py-2 px-6 disabled:opacity-70"
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
