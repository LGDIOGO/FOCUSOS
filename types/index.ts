export type HabitStatus = 'none' | 'done' | 'partial' | 'failed';
export type HabitType = 'positive' | 'negative';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'todo' | 'in_progress' | 'done' | 'cancelled' | 'partial' | 'failed';

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'specific_days';

export interface RecurrenceRule {
  frequency: RecurrenceFreq;
  interval?: number;     // 1 = toda semana/dia, 2 = quinzenal, etc
  days_of_week?: number[]; // [0, 1, 2, 3, 4, 5, 6] para Dom-Sab
}

export interface Habit {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  icon?: string;
  type: HabitType;
  status: HabitStatus;
  streak: number;
  last_completed_date?: string | null;
  is_archived: boolean;
  sort_order: number;
  recurrence?: RecurrenceRule;
  category_id?: string;
  time?: string;      // HH:mm
  start_date?: string; // ISO yyyy-MM-dd
  end_date?: string;   // ISO yyyy-MM-dd
  color?: string;      // Curated Apple hex or tailwind class
  emoji?: string;      // Optional emoji
  meta?: string;       // Goal metadata like "2L/dia"
  linked_goal_id?: string; // ID of the goal this habit contributes to
  goal_impact?: number;    // How much each completion adds to the goal (default: 1)
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  goal_id?: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  status: TaskStatus;
  due_date?: string;
  due_time?: string;
  due?: string; // Virtual/formatted string for UI
  completed_at?: string;
  emoji?: string;
  done: boolean;
}

export interface DailyScore {
  date: string;
  habits_done: number;
  habits_total: number;
  tasks_done: number;
  tasksTotal: number;
  score_pct: number;
}

export interface UserSettings {
  id: string;
  user_id: string;
  timezone: string;
  dateFormat: 'BR' | 'US';
  timeFormat: '24h' | '12h';
  notifications: {
    enabled: boolean;
    habits: boolean;
    agenda: boolean;
    drafts: boolean;
    leadTimeMinutes: number; // ex: 5, 15, 30
    sound: 'focus' | 'none';
  };
  updated_at: string;
  theme: 'light' | 'dark';
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  emoji?: string;
  color?: string;
  category_id?: string;
  priority: TaskPriority;
  status: 'active' | 'completed' | 'archived';
  
  // Progress & Values
  current_value: number;
  target_value: number;
  initial_value: number;
  progress_pct: number; // 0-100
  unit?: string; // e.g., "vezes", "kg", "R$"
  
  // AI Derived Milestones
  min_goal_value?: number;
  elite_goal_value?: number;
  
  // Dates
  start_date: string; // ISO yyyy-MM-dd
  end_date: string;   // ISO yyyy-MM-dd
  term: 'annual' | 'custom';
  
  created_at: string;
  updated_at: string;
}

export type EventType = 'meeting' | 'birthday' | 'event' | 'task' | 'other';

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  date: string; // ISO yyyy-MM-dd
  time?: string; // HH:mm
  type: EventType;
  status: 'todo' | 'done' | 'partial' | 'failed' | 'none';
  isOverdue?: boolean;
  recurrence?: RecurrenceRule;
  category_id?: string;
  color?: string;      // Curated Apple hex or tailwind class
  emoji?: string;      // Optional emoji
  created_at: string;
}

export interface FinanceTransaction {
  id: string;
  user_id: string;
  amount: number;
  title: string;
  type: 'income' | 'expense';
  category?: 'variable' | 'fixed' | 'investment' | 'extra';
  date: string; // ISO yyyy-MM-dd
  created_at: string;
}

export interface FinanceRecurringCost {
  id: string;
  user_id: string;
  amount: number;
  title: string;
  category: 'assinatura' | 'divida' | 'basico' | 'seguro' | 'conhecimento' | 'outro';
  billing_cycle: 'monthly' | 'yearly';
  created_at: string;
}

export interface FinancePote {
  id: string;
  user_id: string;
  title: string;
  percentage_goal: number; // e.g. 40 for 40%
  current_amount: number;
  color_theme: string; // tailwind gradient classes
  icon_name: string; // string key for lucide icons
  created_at: string;
}

export interface FinanceRoadmap {
  id: string;
  user_id: string;
  updated_at: string;
  plan_json: string; // stringified JSON from AI
}
