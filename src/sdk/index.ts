/**
 * Frontend SDK - Main Export
 * 
 * Replaces Supabase client usage throughout the application
 */

export * from './client.js';
export * from './types.js';
export { sigurd } from './sigurd.js';
export { huginn } from './huginn.js';
export { muninn } from './muninn.js';
export { skuld } from './skuld.js';
export { yggdrasil } from './yggdrasil.js';
export { gateway } from './gateway.js';

// Convenience export for dashboard metrics
export async function getMetrics(): Promise<any> {
  // TODO: Implement metrics endpoint
  // For now, aggregate from multiple endpoints
  const [users, tickets, devices] = await Promise.all([
    import('./muninn.js').then(m => m.muninn.users.list()),
    import('./sigurd.js').then(s => s.sigurd.tickets.list()),
    import('./huginn.js').then(h => h.huginn.devices.list()),
  ]);

  return {
    usersTotal: users.length,
    ticketsTotal: tickets.length,
    ticketsOpen: tickets.filter(t => t.status === 'new' || t.status === 'in_progress').length,
    ticketsClosed: tickets.filter(t => t.status === 'closed' || t.status === 'resolved').length,
    devicesTotal: devices.length,
    devicesCompliant: devices.filter(d => d.compliance).length,
    devicesNonCompliant: devices.filter(d => !d.compliance).length,
  };
}

