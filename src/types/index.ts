export interface Client {
  id: string;
  name: string;
  subdomain: string;
  token: string;
  createdAt: string;
  stageNames?: Record<string, string>;
}

export interface Lead {
  id: number;
  name: string;
  price: number;
  status_id: number;
  pipeline_id: number;
  responsible_user_id: number;
  created_at: number;
  updated_at: number;
  closed_at: number | null;
  loss_reason_id: number | null;
  custom_fields_values: CustomFieldValue[] | null;
}

export interface CustomFieldValue {
  field_id: number;
  field_name: string;
  field_code: string;
  field_type: string;
  values: Array<{
    value: string | number | boolean;
    enum_id?: number;
    enum_code?: string;
  }>;
}

export interface Status {
  id: number;
  name: string;
  sort: number;
  color: string;
  type: number; // 0=normal, 142=won, 143=lost
  pipeline_id: number;
}

export interface Pipeline {
  id: number;
  name: string;
  sort: number;
  is_main: boolean;
  is_archive: boolean;
  _embedded: { statuses: Status[] };
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: number;
}

export interface CustomField {
  id: number;
  name: string;
  code: string;
  sort: number;
  type: string;
  entity_type: string;
  is_system: boolean;
  enums?: Array<{ id: number; value: string; sort: number; color?: string }>;
}

export interface LossReason {
  id: number;
  name: string;
  sort: number;
}

export interface LossReasonStat {
  id: number | null;
  name: string;
  count: number;
  percentage: number;
}

export interface CumulativeTrendPoint {
  month: string;
  total: number;
  won: number;
  lost: number;
  revenue: number;
  cumTotal: number;
  cumWon: number;
  cumLost: number;
  cumRevenue: number;
}

export interface KommoData {
  leads: Lead[];
  pipelines: Pipeline[];
  users: User[];
  customFields: { leads: CustomField[] };
  account?: { name: string; currency: string; currency_symbol: string };
  lossReasons: LossReason[];
  syntheticPipelines?: boolean;
  lastSync: string;
}

export interface StageTimeMetric {
  id: number;
  name: string;
  count: number;
  avgAgeDays: number;
  staleCount: number; // not updated in 30+ days
  criticalCount: number; // not updated in 60+ days
  type: number;
}

export interface LeadTrendPoint {
  month: string;
  total: number;
  won: number;
  lost: number;
  revenue: number;
}

export interface Insight {
  type: 'critical' | 'warning' | 'success' | 'info';
  title: string;
  description: string;
  metric?: string;
}

export interface KPIData {
  totalLeads: number;
  activeLeads: number;
  wonLeads: number;
  lostLeads: number;
  conversionRate: number;
  totalRevenue: number;
  averageDealValue: number;
  avgDaysToClose: number;
}

export interface StageMetric {
  id: number;
  name: string;
  count: number;
  value: number;
  percentage: number;
  color: string;
  type: number;
  sort: number;
}

export interface UserMetric {
  id: number;
  name: string;
  assigned: number;
  won: number;
  lost: number;
  active: number;
  conversionRate: number;
  totalRevenue: number;
  avgTicket: number;
  avgDaysToClose: number;
  avgActiveDays: number; // avg age of active leads — proxy for responsiveness
}
