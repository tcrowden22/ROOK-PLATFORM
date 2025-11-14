import { useEffect, useState } from 'react';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { auth } from '../lib/auth';
import { Ticket, Comment, User } from '../lib/types';

interface TicketDetailProps {
  ticketId: string;
  onNavigate: (page: string) => void;
}

export function TicketDetail({ ticketId, onNavigate }: TicketDetailProps) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    loadData();
  }, [ticketId]);

  const loadData = async () => {
    try {
      const [ticketData, commentsData, usersData] = await Promise.all([
        api.tickets.get(ticketId),
        api.tickets.getComments(ticketId),
        api.users.list(),
      ]);
      setTicket(ticketData);
      setComments(commentsData);
      setUsers(usersData);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load ticket:', error);
      setLoading(false);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newComment.trim()) return;

    try {
      await api.tickets.addComment(ticketId, currentUser.id, newComment);
      setNewComment('');
      setSuccessMessage('Comment added successfully');
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.tickets.update(ticketId, { status: newStatus as any });
      setSuccessMessage('Ticket status updated');
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to update ticket:', error);
    }
  };

  const handleAssign = async (assigneeId: string) => {
    try {
      await api.tickets.update(ticketId, { assignee_user_id: assigneeId });
      setSuccessMessage('Ticket assigned successfully');
      loadData();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Failed to assign ticket:', error);
    }
  };

  const getUserName = (userId: string) => {
    return users.find((u) => u.id === userId)?.name || 'Unknown';
  };

  const isSLABreached = () => {
    if (!ticket?.breach_at) return false;
    return new Date(ticket.breach_at) < new Date();
  };

  if (loading || !ticket) {
    return <div className="flex items-center justify-center h-64">Loading ticket...</div>;
  }

  return (
    <div>
      <button
        onClick={() => onNavigate('tickets')}
        className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-6"
      >
        <ArrowLeft size={20} />
        <span>Back to Tickets</span>
      </button>

      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">{ticket.title}</h1>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ticket.type === 'incident' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {ticket.type}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ticket.priority === 'high' ? 'bg-red-100 text-red-800' :
                    ticket.priority === 'medium' ? 'bg-orange-100 text-orange-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {ticket.priority} priority
                  </span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    ticket.status === 'new' ? 'bg-blue-100 text-blue-800' :
                    ticket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                    ticket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {isSLABreached() && (
                <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600" size={16} />
                  <span className="text-xs font-medium text-red-600">SLA Breached</span>
                </div>
              )}
            </div>

            <div className="prose max-w-none">
              <p className="text-slate-600">{ticket.description}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Comments</h2>
            <div className="space-y-4 mb-6">
              {comments.length === 0 ? (
                <p className="text-slate-500 text-center py-8">No comments yet</p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-l-4 border-blue-500 pl-4 py-2">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-slate-800">
                        {getUserName(comment.author_user_id)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-600">{comment.body}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="border-t border-slate-200 pt-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-2"
              />
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Send size={16} />
                <span>Add Comment</span>
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Requester</p>
                <p className="text-sm font-medium text-slate-800">
                  {getUserName(ticket.requester_user_id)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Assignee</p>
                <select
                  value={ticket.assignee_user_id || ''}
                  onChange={(e) => handleAssign(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Unassigned</option>
                  {users
                    .filter((u) => u.role === 'admin' || u.role === 'agent')
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(ticket.created_at).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Last Updated</p>
                <p className="text-sm font-medium text-slate-800">
                  {new Date(ticket.updated_at).toLocaleString()}
                </p>
              </div>
              {ticket.breach_at && (
                <div>
                  <p className="text-xs text-slate-500 mb-1">SLA Breach Time</p>
                  <p className="text-sm font-medium text-slate-800">
                    {new Date(ticket.breach_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Actions</h3>
            <div className="space-y-2">
              {ticket.status === 'new' && (
                <button
                  onClick={() => handleStatusChange('in_progress')}
                  className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  Start Progress
                </button>
              )}
              {ticket.status === 'in_progress' && (
                <button
                  onClick={() => handleStatusChange('resolved')}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Mark as Resolved
                </button>
              )}
              {ticket.status === 'resolved' && (
                <button
                  onClick={() => handleStatusChange('closed')}
                  className="w-full px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Close Ticket
                </button>
              )}
              {ticket.device_id && (
                <button
                  onClick={() => onNavigate('device-detail')}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  View Device
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
