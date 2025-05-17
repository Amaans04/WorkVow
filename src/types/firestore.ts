import { Timestamp } from 'firebase/firestore';

export type UserRole = 'employee' | 'manager' | 'admin';
export type ZoneStatus = 'safe' | 'attention' | 'critical';
export type MeetingType = 'initial' | 'followup' | 'closing' | 'other';
export type MeetingOutcome = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
export type FollowupStatus = 'pending' | 'completed' | 'cancelled';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  manager_id?: string;
  zone_status: ZoneStatus;
  created_at: Timestamp;
}

export interface Commitment {
  id: string;
  user_id: string;
  date: Timestamp;
  calls_committed: number;
  prospects_expected: number;
  meetings_expected: number;
  closures_expected: number;
  expected_revenue: number;
}

export interface DailyReport {
  id: string;
  user_id: string;
  date: Timestamp;
  calls_made: number;
  prospects_generated: number;
  meetings_done: number;
  closures_achieved: number;
  revenue_generated: number;
  challenges_faced: string;
}

export interface Prospect {
  id: string;
  user_id: string;
  name: string;
  contact_info: string;
  source: string;
  date_generated: Timestamp;
  status: string;
  notes: string;
}

export interface Meeting {
  id: string;
  prospect_id: string;
  user_id: string;
  date: Timestamp;
  type: MeetingType;
  product: string;
  expected_revenue: number;
  outcome: MeetingOutcome;
  rescheduled_date?: Timestamp;
}

export interface Closure {
  id: string;
  prospect_id: string;
  user_id: string;
  product: string;
  amount: number;
  date_closed: Timestamp;
}

export interface Followup {
  id: string;
  prospect_id: string;
  user_id: string;
  follow_up_date: Timestamp;
  status: FollowupStatus;
  notes: string;
}

export interface PerformanceScore {
  id: string;
  user_id: string;
  period: string; // Format: "YYYY-MM"
  score: number;
}

export interface Target {
  id: string;
  user_id?: string; // Nullable for global targets
  month: string; // Format: "YYYY-MM"
  target_calls: number;
  target_revenue: number;
} 