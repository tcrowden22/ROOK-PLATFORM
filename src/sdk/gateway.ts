/**
 * Gateway API Client
 */
import { get, post, del } from './client.js';

export interface RegistrationCode {
  id: string;
  code: string;
  created_by_user_id: string;
  created_by_email?: string;
  created_by_name?: string;
  expires_at: string;
  used_at?: string | null;
  used_by_agent_id?: string | null;
  used_by_agent_identifier?: string | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
  created_at: string;
  updated_at: string;
}

export interface GenerateCodeResponse {
  id: string;
  code: string;
  expires_at: string;
  created_at: string;
  expires_in_hours: number;
}

export const gateway = {
  registrationCodes: {
    /**
     * Generate a new registration code
     */
    generate: (expiresInHours?: number): Promise<GenerateCodeResponse> => 
      post('/api/gateway/registration-codes', { expires_in_hours: expiresInHours }),

    /**
     * List all registration codes (admin sees all, agent sees own)
     */
    list: (): Promise<RegistrationCode[]> => 
      get('/api/gateway/registration-codes'),

    /**
     * Revoke a registration code
     */
    revoke: (codeId: string): Promise<{ message: string }> => 
      del(`/api/gateway/registration-codes/${codeId}`),
  },
};





