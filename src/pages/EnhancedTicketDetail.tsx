import { useEffect, useState } from 'react';
import { X, Send, Clock, Monitor, Paperclip } from 'lucide-react';
import { auth } from '../lib/auth';
import type {
  TicketHistory,
  TicketComment,
  Attachment,
  User,
  Device,
  Incident,
  ServiceRequest,
  Problem,
  Change,
} from '../lib/types';
import type { TicketType as TicketResource } from '../sdk/sigurd';

type IncidentDetail = Incident & { type: 'incident' };
type ServiceRequestDetail = ServiceRequest & { type: 'request' };
type ProblemDetail = Problem & { type: 'problem' };
type ChangeDetail = Change & { type: 'change' };

type TicketDetail = IncidentDetail | ServiceRequestDetail | ProblemDetail | ChangeDetail;

type TabId = 'details' | 'comments' | 'attachments' | 'device' | 'history';

interface Props {
  ticketId: string;
  ticketType: TicketResource;
  onClose: () => void;
}

const STATUS_OPTIONS: Record<TicketResource, string[]> = {
  incidents: ['new', 'in_progress', 'waiting', 'resolved', 'closed'],
  'service-requests': ['new', 'in_progress', 'waiting', 'resolved', 'closed'],
  problems: ['new', 'in_progress', 'waiting', 'resolved', 'closed'],
  changes: ['draft', 'pending_approval', 'approved', 'scheduled', 'in_progress', 'completed', 'failed', 'cancelled'],
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  return new Date(value).toLocaleString();
};

const formatList = (items?: string[] | null) => {
  if (!items || items.length === 0) return '—';
  return items.join(', ');
};

export function EnhancedTicketDetail({ ticketId, ticketType, onClose }: Props) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<TicketHistory[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentUser = auth.getCurrentUser();

  useEffect(() => {
    setActiveTab('details');
    loadTicket();
  }, [ticketId, ticketType]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadTicket = async () => {
    setLoading(true);
    setError(null);

    try {
      const { sigurd } = await import('../sdk');
      let detail: TicketDetail;

      switch (ticketType) {
        case 'incidents': {
          const incident = await sigurd.incidents.get(ticketId);
          detail = { ...incident, type: 'incident' } as IncidentDetail;
          break;
        }
        case 'service-requests': {
          const serviceRequest = await sigurd.serviceRequests.get(ticketId);
          detail = { ...serviceRequest, type: 'request' } as ServiceRequestDetail;
          break;
        }
        case 'problems': {
          const problem = await sigurd.problems.get(ticketId);
          detail = { ...problem, type: 'problem' } as ProblemDetail;
          break;
        }
        case 'changes': {
          const change = await sigurd.changes.get(ticketId);
          detail = { ...change, type: 'change' } as ChangeDetail;
          break;
        }
        default:
          throw new Error(`Unsupported ticket type: ${ticketType}`);
      }

      setTicket(detail);

      if ('device_id' in detail && detail.device_id) {
        await loadDevice(detail.device_id);
      } else {
        setDevice(null);
      }

      await Promise.all([
        loadComments(ticketType),
        loadAttachments(ticketType),
        loadHistory(ticketType),
      ]);
    } catch (loadError) {
      console.error('Failed to load ticket:', loadError);
      setError('Unable to load ticket details.');
      setComments([]);
      setAttachments([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { muninn } = await import('../sdk');
      const usersData = await muninn.users.list().catch(() => []);
      setUsers(usersData);
    } catch (usersError) {
      console.error('Failed to load users:', usersError);
    }
  };

  const loadDevice = async (deviceId: string) => {
    try {
      const { huginn } = await import('../sdk');
      const deviceData = await huginn.devices.get(deviceId).catch(() => null);
      setDevice(deviceData);
    } catch (deviceError) {
      console.error('Failed to load device:', deviceError);
    }
  };

  const loadComments = async (resource: TicketResource) => {
    try {
      const { sigurd } = await import('../sdk');
      const data = await sigurd.comments.list(resource, ticketId);
      setComments(data);
    } catch (commentError) {
      console.error('Failed to load comments:', commentError);
      setComments([]);
    }
  };

  const loadAttachments = async (resource: TicketResource) => {
    try {
      const { sigurd } = await import('../sdk');
      const items = await sigurd.attachments.list(resource, ticketId);
      setAttachments(items);
    } catch (attachmentError) {
      console.error('Failed to load attachments:', attachmentError);
      setAttachments([]);
    }
  };

  const loadHistory = async (resource: TicketResource) => {
    try {
      const { sigurd } = await import('../sdk');
      const data = await sigurd.history.list(resource, ticketId);
      setHistory(data);
    } catch (historyError) {
      console.error('Failed to load history:', historyError);
      setHistory([]);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const { sigurd } = await import('../sdk');

      switch (ticketType) {
        case 'incidents':
          await sigurd.incidents.update(ticketId, {
            status: newStatus as any,
            resolvedAt: newStatus === 'resolved' ? new Date().toISOString() : undefined,
          });
          break;
        case 'service-requests':
          await sigurd.serviceRequests.update(ticketId, {
            status: newStatus as any,
            completedAt: ['resolved', 'closed'].includes(newStatus) ? new Date().toISOString() : undefined,
          });
          break;
        case 'problems':
          await sigurd.problems.update(ticketId, {
            status: newStatus as any,
          });
          break;
        case 'changes':
          await sigurd.changes.update(ticketId, {
            status: newStatus as any,
            completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
          });
          break;
      }

      await loadTicket();
    } catch (updateError) {
      console.error('Failed to update ticket status:', updateError);
    }
  };

  const handleAssigneeChange = async (newAssignee: string) => {
    try {
      const { sigurd } = await import('../sdk');

      switch (ticketType) {
        case 'incidents':
          await sigurd.incidents.update(ticketId, {
            assigneeUserId: newAssignee || null,
          });
          break;
        case 'service-requests':
          await sigurd.serviceRequests.update(ticketId, {
            assigneeUserId: newAssignee || null,
          });
          break;
        case 'problems':
          await sigurd.problems.update(ticketId, {
            assignedUserId: newAssignee || null,
          });
          break;
        case 'changes':
          await sigurd.changes.update(ticketId, {
            assignedUserId: newAssignee || null,
          });
          break;
      }

      await loadTicket();
    } catch (assigneeError) {
      console.error('Failed to update assignee:', assigneeError);
    }
  };

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newComment.trim() || !currentUser) return;

    try {
      const { sigurd } = await import('../sdk');
      await sigurd.comments.create(ticketType, ticketId, {
        body: newComment.trim(),
      });
      setNewComment('');
      await loadComments(ticketType);
    } catch (commentError) {
      console.error('Failed to add comment:', commentError);
    }
  };

  const handleDownloadAttachment = async (attachmentId: string, fileName: string) => {
    try {
      const { sigurd } = await import('../sdk');
      const blob = await sigurd.attachments.download(ticketType, ticketId, attachmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Failed to download attachment:', downloadError);
    }
  };

  const getUserName = (userId?: string | null) => {
    if (!userId) return 'Unassigned';
    return users.find((user) => user.id === userId)?.name || 'Unknown';
  };

  const getAssigneeId = () => {
    if (!ticket) return '';
    if ('assignee_user_id' in ticket) {
      return ticket.assignee_user_id || '';
    }
    if ('assigned_user_id' in ticket) {
      return ticket.assigned_user_id || '';
    }
    return '';
  };

  const getRequesterId = () => {
    if (!ticket) return undefined;
    if ('requester_user_id' in ticket) {
      return ticket.requester_user_id;
    }
    return undefined;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      new: 'status-badge status-info',
      in_progress: 'status-badge status-pending',
      waiting: 'status-badge status-info',
      resolved: 'status-badge status-active',
      closed: 'status-badge status-info',
      draft: 'status-badge status-info',
      pending_approval: 'status-badge status-pending',
      approved: 'status-badge status-active',
      scheduled: 'status-badge status-info',
      completed: 'status-badge status-active',
      failed: 'status-badge status-locked',
      cancelled: 'status-badge status-info',
    };

    const label = status.replace('_', ' ');
    const style = styles[status] || 'status-badge status-info';
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>{label}</span>;
  };

  const getPriorityBadge = (priority?: string) => {
    if (!priority) return null;
    const styles: Record<string, string> = {
      low: 'status-badge status-info',
      medium: 'status-badge status-pending',
      high: 'status-badge status-locked',
      critical: 'status-badge bg-red-600 text-white',
    };
    const style = styles[priority] || 'status-badge status-info';
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${style}`}>{priority}</span>;
  };

  const getRiskBadge = (risk?: Change['risk']) => {
    if (!risk) return null;
    const styles: Record<Change['risk'], string> = {
      low: 'status-badge status-info',
      medium: 'status-badge status-pending',
      high: 'status-badge status-locked',
    };
    return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[risk]}`}>risk: {risk}</span>;
  };

  const getTypeBadge = (type: TicketDetail['type']) => {
    const styles: Record<TicketDetail['type'], string> = {
      incident: 'status-badge status-locked',
      request: 'status-badge status-info',
      problem: 'status-badge status-pending',
      change: 'status-badge status-info',
    };
    return <span className={`px-3 py-1 rounded text-xs font-medium ${styles[type]}`}>{type}</span>;
  };

  const renderTypeSpecificDetails = () => {
    if (!ticket) return null;

    switch (ticket.type) {
      case 'incident':
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-400">Impact:</span> <span className="font-medium">{ticket.impact || '—'}</span></div>
            <div><span className="text-slate-400">Urgency:</span> <span className="font-medium">{ticket.urgency || '—'}</span></div>
            <div><span className="text-slate-400">SLA Breach:</span> <span className="font-medium">{formatDateTime(ticket.breach_at)}</span></div>
            <div><span className="text-slate-400">Resolved:</span> <span className="font-medium">{formatDateTime(ticket.resolved_at)}</span></div>
          </div>
        );
      case 'request':
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><span className="text-slate-400">Catalog Item:</span> <span className="font-medium">{ticket.catalog_item_id || '—'}</span></div>
            <div><span className="text-slate-400">Fulfillment Notes:</span> <span className="font-medium">{ticket.fulfillment_notes || '—'}</span></div>
            <div><span className="text-slate-400">Approved By:</span> <span className="font-medium">{getUserName(ticket.approved_by)}</span></div>
            <div><span className="text-slate-400">Approved At:</span> <span className="font-medium">{formatDateTime(ticket.approved_at)}</span></div>
            <div><span className="text-slate-400">Completed:</span> <span className="font-medium">{formatDateTime(ticket.completed_at)}</span></div>
          </div>
        );
      case 'problem':
        return (
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div><span className="text-slate-400">Root Cause:</span> <span className="font-medium">{ticket.root_cause || '—'}</span></div>
            <div><span className="text-slate-400">Workaround:</span> <span className="font-medium">{ticket.workaround || '—'}</span></div>
            <div><span className="text-slate-400">Resolution:</span> <span className="font-medium">{ticket.resolution || '—'}</span></div>
            <div><span className="text-slate-400">Related Incidents:</span> <span className="font-medium">{formatList(ticket.related_incidents)}</span></div>
          </div>
        );
      case 'change':
        return (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2"><span className="text-slate-400">Reason:</span> <span className="font-medium">{ticket.reason}</span></div>
            <div className="col-span-2"><span className="text-slate-400">Impact Analysis:</span> <span className="font-medium">{ticket.impact_analysis || '—'}</span></div>
            <div className="col-span-2"><span className="text-slate-400">Rollback Plan:</span> <span className="font-medium">{ticket.rollback_plan || '—'}</span></div>
            <div><span className="text-slate-400">Approved By:</span> <span className="font-medium">{getUserName(ticket.approved_by)}</span></div>
            <div><span className="text-slate-400">Approved At:</span> <span className="font-medium">{formatDateTime(ticket.approved_at)}</span></div>
            <div><span className="text-slate-400">Scheduled Start:</span> <span className="font-medium">{formatDateTime(ticket.scheduled_start)}</span></div>
            <div><span className="text-slate-400">Scheduled End:</span> <span className="font-medium">{formatDateTime(ticket.scheduled_end)}</span></div>
            <div><span className="text-slate-400">Completed:</span> <span className="font-medium">{formatDateTime(ticket.completed_at)}</span></div>
          </div>
        );
      default:
        return null;
    }
  };

  const tabs: TabId[] = ['details', 'comments', 'attachments', 'device', 'history'];

  if (loading) {
    return <div className="p-8 text-center">Loading ticket...</div>;
  }

  if (error || !ticket) {
    return (
      <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
        <div className="glass-panel w-full max-w-lg mx-4 p-8 text-center space-y-4">
          <p className="text-slate-300 font-medium">{error || 'Ticket unavailable.'}</p>
          <button onClick={onClose} className="px-4 py-2 gradient-button text-white rounded-lg">Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
      <div className="glass-panel w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        <div className="p-6 border-b border-slate-800/30 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {getTypeBadge(ticket.type)}
              {ticket.type !== 'change' && 'priority' in ticket && getPriorityBadge((ticket as IncidentDetail | ServiceRequestDetail | ProblemDetail).priority)}
              {ticket.type === 'change' && 'risk' in ticket && getRiskBadge((ticket as ChangeDetail).risk)}
              {getStatusBadge((ticket as any).status)}
            </div>
            <h1 className="text-2xl font-bold text-slate-200">{ticket.title}</h1>
            <p className="text-sm text-slate-400 mt-1">#{ticket.id.slice(0, 8)}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 border-b border-slate-800/30">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
              <select
                value={(ticket as any).status}
                onChange={(event) => handleStatusChange(event.target.value)}
                className="w-full select-field text-sm"
              >
                {STATUS_OPTIONS[ticketType].map((status) => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Assignee</label>
              <select
                value={getAssigneeId()}
                onChange={(event) => handleAssigneeChange(event.target.value)}
                className="w-full select-field text-sm"
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Requester</label>
              <div className="px-3 py-2 glass-card text-sm">{getUserName(getRequesterId())}</div>
            </div>
          </div>
        </div>

        <div className="border-b border-slate-800/30">
          <div className="flex gap-1 px-6">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                  activeTab === tab ? 'border-blue-400 text-blue-400' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Description</h3>
                <p className="text-slate-400 whitespace-pre-wrap">{ticket.description}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Timeline</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-slate-400">Created:</span> <span className="font-medium">{formatDateTime(ticket.created_at)}</span></div>
                  <div><span className="text-slate-400">Updated:</span> <span className="font-medium">{formatDateTime(ticket.updated_at)}</span></div>
                  {'resolved_at' in ticket && (ticket as IncidentDetail).resolved_at && (
                    <div><span className="text-slate-400">Resolved:</span> <span className="font-medium">{formatDateTime((ticket as IncidentDetail).resolved_at)}</span></div>
                  )}
                  {'closed_at' in ticket && (ticket as any).closed_at && (
                    <div><span className="text-slate-400">Closed:</span> <span className="font-medium">{formatDateTime((ticket as any).closed_at)}</span></div>
                  )}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-2">Details</h3>
                {renderTypeSpecificDetails()}
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 p-4 glass-card">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm flex-shrink-0">
                    {getUserName(comment.author_user_id).charAt(0)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{getUserName(comment.author_user_id)}</span>
                      <span className="text-xs text-slate-500">{formatDateTime(comment.created_at)}</span>
                    </div>
                    <p className="text-sm text-slate-300">{comment.body}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(event) => setNewComment(event.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 input-field text-sm"
                />
                <button type="submit" className="px-4 py-2 gradient-button text-white rounded-lg flex items-center gap-2">
                  <Send size={16} />
                  Send
                </button>
              </form>
            </div>
          )}

          {activeTab === 'attachments' && (
            <div className="space-y-3">
              {attachments.length === 0 && (
                <p className="text-slate-500 text-center py-8">No attachments uploaded.</p>
              )}
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between p-3 glass-card">
                  <div className="flex items-center gap-3">
                    <Paperclip size={16} className="text-slate-400" />
                    <div>
                      <p className="text-sm font-medium text-slate-200">{attachment.file_name}</p>
                      <p className="text-xs text-slate-500">Uploaded {formatDateTime(attachment.created_at)} · {Math.max(1, Math.round(Number(attachment.file_size) / 1024))} KB</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                    className="text-xs font-medium text-blue-400 hover:text-blue-300"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'device' && (
            <div>
              {device ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-4 glass-card">
                    <Monitor size={24} className="text-slate-400" />
                    <div>
                      <h3 className="font-semibold text-slate-200">{device.hostname}</h3>
                      <p className="text-sm text-slate-400">{device.os}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-400">Status:</span> <span className="font-medium">{device.status}</span></div>
                    <div><span className="text-slate-400">Compliance:</span> <span className="font-medium">{device.compliance ? 'Compliant' : 'Non-compliant'}</span></div>
                    <div><span className="text-slate-400">Last Seen:</span> <span className="font-medium">{formatDateTime(device.last_seen_at)}</span></div>
                    <div><span className="text-slate-400">Enrolled:</span> <span className="font-medium">{formatDateTime(device.enrolled_at)}</span></div>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500 text-center py-8">No associated device for this ticket.</p>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              {history.map((entry) => (
                <div key={entry.id} className="flex gap-3 p-3 border-l-2 border-blue-500/30 hover:bg-slate-800/30">
                  <Clock size={16} className="text-slate-400 mt-1 flex-shrink-0" />
                  <div className="flex-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{getUserName(entry.user_id)}</span>
                      <span className="text-slate-400">{entry.action}</span>
                      {entry.field_name && (
                        <span className="text-slate-500">
                          {entry.old_value && `${entry.old_value} → `}{entry.new_value}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{formatDateTime(entry.created_at)}</span>
                  </div>
                </div>
              ))}
              {history.length === 0 && <p className="text-slate-500 text-center py-8">No history available</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
