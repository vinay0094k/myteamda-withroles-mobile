export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  max_days_per_year?: number;
  is_active: boolean;
  created_at: string;
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employee_id?: string;
  position?: string;
  role: string;
}

export interface LeaveApplication {
  id: string;
  user_id: string;
  user?: User;
  leave_type_id: string;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approver?: User;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  // New field for formatted date range
  date_range: string;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  user?: User;
  leave_type_id: string;
  leave_type?: LeaveType;
  year: number;
  allocated_days: number;
  used_days: number;
  remaining_days: number;
  created_at: string;
  updated_at: string;
}

export interface CreateLeaveRequest {
  leave_type_id: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  reason?: string;
  description?: string;
}

export interface UpdateLeaveRequest {
  start_date?: string;
  end_date?: string;
  is_half_day?: boolean;
  reason?: string;
  description?: string;
}

export interface LeaveApiResponse {
  success: boolean;
  message: string;
  data: {
    leaves: LeaveApplication[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
  request_id: string;
}

export interface DashboardStats {
  leaves_pending: number;
  leaves_approved: number;
  employees_out_today: number;
  avg_days_per_employee: number;
  selected_date: string;
  total_leave_days: number;
  total_employees: number;
}
