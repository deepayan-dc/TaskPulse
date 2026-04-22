import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '../context/TaskContext';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { TaskTimer } from '../components/tasks/TaskTimer';
import { User as UserIcon, Calendar, ArrowLeft, Send, Play, Pause, CheckCircle2 } from 'lucide-react';
import { Task, TaskComment } from '../types/task';
import { taskService } from '../services/taskService';

const TaskDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { updateStatus, addComment, startTimer, pauseTimer, stopTimer } = useTasks();
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [commentText, setCommentText] = useState('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');

  const fetchTaskDetails = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await taskService.getTaskById(id);
      setTask(data.task);
      setComments(data.comments);
    } catch (err: any) {
      setError(err.message || 'Task not found');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [id]);

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!task || !user) return;
    try {
      await updateStatus(task.id, newStatus);
      setTask({ ...task, status: newStatus });

      if (newStatus === 'In Progress') {
        addNotification(task.createdBy.id, `${user.name} started work on: ${task.title}`, task.id);
      } else if (newStatus === 'Completed') {
        addNotification(task.createdBy.id, `${user.name} completed: ${task.title}`, task.id);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReturn = async () => {
    if (!task || !user || !returnReason.trim()) return;
    try {
      await updateStatus(task.id, 'Returned');
      const newComment = await addComment(task.id, `Task returned: ${returnReason}`, { id: user.id, name: user.name, role: user.role });
      
      addNotification(task.assignee.id, `Task returned by ${user.name}: ${task.title}`, task.id);
      
      setTask({ ...task, status: 'Returned' });
      setComments(prev => [...prev, newComment]);
      setIsReturnModalOpen(false);
      setReturnReason('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !user || !commentText.trim()) return;
    
    try {
      const newComment = await addComment(task.id, commentText, { id: user.id, name: user.name, role: user.role });
      setComments(prev => [...prev, newComment]);
      setCommentText('');
      
      const targetId = user.role === 'MANAGER' ? task.assignee.id : task.createdBy.id;
      addNotification(targetId, `New comment from ${user.name}: ${task.title}`, task.id);
    } catch (err) {
      console.error(err);
    }
  };

  if (isLoading) return <div className="text-white p-8">Loading task details...</div>;
  if (error || !task) return <div className="text-red-400 p-8">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <button 
        onClick={() => navigate('/tasks')}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Tasks</span>
      </button>

      <div className="glass-panel p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-4">{task.title}</h1>
            <div className="flex flex-wrap items-center gap-3">
              <Badge type="status" value={task.status} />
              <Badge type="priority" value={task.priority} />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            {/* EMPLOYEE CONTROLS */}
            {user?.role === 'EMPLOYEE' && task.status === 'Pending' && (
              <button 
                onClick={async () => {
                  await handleStatusChange('In Progress');
                  await startTimer(task.id);
                  setTask(prev => prev ? { ...prev, timerData: { ...prev.timerData, isRunning: true, startTime: Date.now() } } : prev);
                }} 
                className="btn-primary py-2 text-sm flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Start Task
              </button>
            )}

            {user?.role === 'EMPLOYEE' && task.status === 'In Progress' && (
              <>
                {task.timerData.isRunning ? (
                  <button 
                    onClick={async () => {
                      await pauseTimer(task.id);
                      fetchTaskDetails(); // Refresh to get exact math from service
                    }} 
                    className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg text-sm flex items-center gap-2"
                  >
                    <Pause className="w-4 h-4" /> Pause
                  </button>
                ) : (
                  <button 
                    onClick={async () => {
                      await startTimer(task.id);
                      setTask(prev => prev ? { ...prev, timerData: { ...prev.timerData, isRunning: true, startTime: Date.now() } } : prev);
                    }} 
                    className="bg-primary-500 hover:bg-primary-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg text-sm flex items-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Resume
                  </button>
                )}
                
                <button 
                  onClick={async () => {
                    await stopTimer(task.id);
                    await handleStatusChange('Completed');
                    fetchTaskDetails();
                  }} 
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg text-sm flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Mark Complete
                </button>
              </>
            )}

            {user?.role === 'EMPLOYEE' && task.status === 'Returned' && (
              <button 
                onClick={async () => {
                  await handleStatusChange('In Progress');
                  await startTimer(task.id);
                  setTask(prev => prev ? { ...prev, timerData: { ...prev.timerData, isRunning: true, startTime: Date.now() } } : prev);
                }} 
                className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg text-sm flex items-center gap-2"
              >
                <Play className="w-4 h-4" /> Restart Task
              </button>
            )}

            {/* MANAGER CONTROLS */}
            {user?.role === 'MANAGER' && task.status === 'Completed' && (
              <>
                <button onClick={() => setIsReturnModalOpen(true)} className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg text-sm">Return</button>
                <button onClick={() => handleStatusChange('Approved')} className="bg-purple-500 hover:bg-purple-600 text-white font-medium py-2 px-6 rounded-xl transition-all shadow-lg text-sm">Approve</button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Activity & Comments</h3>
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <p className="text-gray-500 italic text-sm">No comments yet.</p>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-4">
                      <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${comment.author.name}`} className="w-10 h-10 rounded-full bg-gray-800 border-2 border-white/10" alt="" />
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-200">{comment.author.name}</span>
                            {comment.author.role && (
                              <span className="text-[10px] uppercase tracking-wider bg-white/10 px-1.5 py-0.5 rounded text-gray-400">{comment.author.role}</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{comment.text}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <form onSubmit={handleAddComment} className="mt-6 flex gap-3">
                <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name}`} className="w-10 h-10 rounded-full bg-gray-800 border-2 border-primary-500/50" alt="" />
                <div className="relative flex-1">
                  <input 
                    type="text" 
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="w-full glass-input pr-12 rounded-full"
                  />
                  <button type="submit" disabled={!commentText.trim()} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-primary-400 hover:text-primary-300 disabled:opacity-50 transition-colors">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="space-y-6">
            <TaskTimer task={task} />
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-1">Assignee</span>
                <div className="flex items-center gap-3">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${task.assignee.name}`} className="w-8 h-8 rounded-full bg-gray-800" alt="" />
                  <span className="text-gray-200 font-medium">{task.assignee.name}</span>
                </div>
              </div>
              
              <div className="h-px bg-white/10" />

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-1">Due Date</span>
                <div className="flex items-center gap-2 text-gray-300">
                  <Calendar className="w-4 h-4 text-primary-400" />
                  <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              <div>
                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold block mb-1">Created By</span>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <UserIcon className="w-4 h-4" />
                  <span>{task.createdBy.name}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} title="Return Task">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Please provide a reason for returning this task to the assignee.</p>
          <textarea 
            value={returnReason}
            onChange={e => setReturnReason(e.target.value)}
            className="w-full glass-input min-h-[100px]"
            placeholder="Needs more work because..."
          />
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setIsReturnModalOpen(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
            <button onClick={handleReturn} disabled={!returnReason.trim()} className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-6 rounded-xl disabled:opacity-50">Return Task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskDetail;
