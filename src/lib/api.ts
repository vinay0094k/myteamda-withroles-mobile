// Get the API base URL from environment variables
// Falls back to port 8082 if not specified (matches backend default)
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8082/api/v1';

// Types for API responses
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  request_id?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Gallery types
export interface GalleryImage {
  id: string;
  title: string;
  description?: string;
  url: string; // This will be the pre-signed URL
}

// Auth types
export interface User {
  id: string;
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  department?: string;
  position?: string;
  manager_id?: string;
  manager?: User;
  hire_date?: string;
  employment_type: string;
  status: string;
  profile_image_url?: string;
  bio?: string;
  skills?: string;
  languages?: string;
  role: 'admin' | 'hr' | 'manager' | 'team-lead' | 'employee';
  approval_status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approver?: User;
  approved_at?: string;
  rejection_reason?: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserListItem {
  id: string;
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'hr' | 'manager' | 'team-lead' | 'employee';
}


export interface LoginRequest {
  employee_id: string;
  password: string;
}

export interface RegisterRequest {
  employee_id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

// Leave types
export interface LeaveApplication {
  id: string;
  user_id: string;
  leave_type_id: string;
  start_date: string;
  end_date: string;
  is_half_day: boolean;
  is_lop: boolean;           // Loss of Pay flag
  lop_days: number;          // Number of LOP days
  paid_days: number;         // Number of paid days from balance
  reason?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
  leave_type?: LeaveType;
}

export interface LeaveType {
  id: string;
  name: string;
  description?: string;
  max_days_per_year?: number;
  is_active: boolean;
}

export interface LeaveBalance {
  id: string;
  user_id: string;
  leave_type_id: string;
  year: number;
  allocated_days: number;
  used_days: number;  // Now supports float values for half-day leaves
  remaining_days: number; // Now supports float values
  leave_type?: LeaveType;
}

// Timesheet types
export interface TimesheetEntry {
  id: string;
  user_id: string;
  project_id: string;
  task_description: string;
  entry_date: string;
  start_time?: string;
  end_time?: string;
  duration_hours?: number;
  break_time_minutes: number;
  status: 'draft' | 'submitted' | 'approved';
  submitted_at?: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
  project?: Project;
  user?: {
    id: string;
    employee_id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  client_name?: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

// Event types
export interface Event {
  id: string;
  title: string;
  description?: string;
  event_type: 'birthday' | 'anniversary' | 'holiday' | 'meeting';
  event_date: string;
  user_id?: string;
  is_company_wide: boolean;
  user?: User;
}

// News types
export interface News {
  id: string;
  title: string;
  content: string;
  summary?: string;
  category?: string;
  type: 'news' | 'announcement';
  author_id?: string;
  is_featured: boolean;
  is_published: boolean;
  published_at: string;
  author?: User;
}

// RSS News types
export interface RSSFeed {
  id: string;
  name: string;
  url: string;
  category: string;
  is_active: boolean;
  last_fetched?: string;
}

export interface RSSNewsItem {
  id: string;
  feed_id: string;
  title: string;
  description: string;
  content: string;
  link: string;
  author?: string;
  category?: string;
  image_url?: string;
  published_at: string;
  guid: string;
  is_read: boolean;
  feed?: RSSFeed;
}

// Document types
export interface Document {
  id: string;
  user_id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  category?: string;
  description?: string;
  uploaded_at: string;
}

// Learning types
export interface LearningSession {
  id: string;
  title: string;
  description?: string;
  topic?: string;
  instructor?: string;
  session_date: string;
  duration_minutes?: number;
  max_participants?: number;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
  status: string;
}

// Sports types
export interface SportsEvent {
  id: string;
  title: string;
  description?: string;
  sport_type?: string;
  event_date: string;
  location?: string;
  max_participants?: number;
  registration_deadline?: string;
}

export interface SportsFacility {
  id: string;
  name: string;
  type?: string;
  description?: string;
  capacity?: number;
  is_available: boolean;
}

// Policy types
export interface Policy {
  id: string;
  title: string;
  description?: string;
  content: string;
  category?: string;
  version: string;
  effective_date?: string;
  is_active: boolean;
  created_by?: string;
  creator?: User;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    // Ensure we use the correct protocol and port for API
    const apiUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiUrl) {
      this.baseURL = apiUrl;
    } else {
      // Default to local backend when running on localhost, otherwise use your ngrok URL
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        this.baseURL = window.location.protocol === 'https:'
          ? 'https://localhost:8082/api/v1'
          : 'http://localhost:8082/api/v1';
      } else {
        //Ngrok URL
        this.baseURL = 'https://74740271769d.ngrok-free.app/api/v1';
      }
    }
    this.token = localStorage.getItem('auth_token');
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    // Add ngrok bypass header for ngrok free tier
    if (this.baseURL.includes('ngrok-free.app') || this.baseURL.includes('ngrok.io')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Add better error handling for network issues
    try {
      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers,
        },
      });

      // Check if response is actually JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (jsonError) {
          throw new Error(`Invalid JSON response: ${jsonError}`);
        }
      } else {
        // If not JSON, get text to see what we actually received
        const text = await response.text();
        throw new Error(`Expected JSON response but received: ${contentType || 'unknown content type'}. Response: ${text.substring(0, 200)}...`);
      }

      // Handle HTTP error status codes

      if (!response.ok) {
        throw new Error(data.error || data.message || 'API request failed');
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(`Network error: Unable to connect to API server at ${this.baseURL}. Please check if the backend server is running.`);
      }
      throw new Error(`API request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Auth APIs
  async login(credentials: LoginRequest): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // if (response.success && response.data?.token) {
    //   this.setToken(response.data.token);
    // }
    
    return response;
  }

  async logout(): Promise<ApiResponse> {
    const response = await this.request('/auth/logout', { method: 'POST' });
    this.setToken(null);
    return response;
  }

  async sendSignupOTP(email: string): Promise<ApiResponse> {
    return this.request('/auth/send-signup-otp', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifySignupOTP(email: string, otp: string): Promise<ApiResponse> {
    return this.request('/auth/verify-signup-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp }),
    });
  }

  async completeRegistration(registrationData: {
    email: string;
    otp: string;
    employee_id: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  }): Promise<ApiResponse<{ token: string; user: User }>> {
    const response = await this.request<{ token: string; user: User }>('/auth/complete-registration', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
    
    if (response.success && response.data?.token) {
      this.setToken(response.data.token);
    }
    
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<User>> {
    return this.request<User>('/auth/me');
  }

  // New admin methods for user management
  async getPendingUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>('/auth/pending-users');
  }

  async approveUser(userId: string, role: string): Promise<ApiResponse> {
    return this.request(`/auth/approve-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  async rejectUser(userId: string, reason: string): Promise<ApiResponse> {
    return this.request(`/auth/reject-user/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // User APIs
  async getUserProfile(): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile');
  }

  async getUsers(): Promise<ApiResponse<UserListItem[]>> {
  return this.request<UserListItem[]>('/users/');
}


  async updateProfile(profileData: Partial<User>): Promise<ApiResponse<User>> {
    return this.request<User>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }

  async changePassword(passwordData: { current_password: string; new_password: string }): Promise<ApiResponse> {
    return this.request('/users/password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  }

  // Leave APIs
  async getLeaves(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<{ leaves: LeaveApplication[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    
    return this.request<{ leaves: LeaveApplication[]; pagination: any }>(`/leaves/?${queryParams}`);
  }

  // Admin endpoint to get all leaves
  async getAdminLeaves(params?: { page?: number; limit?: number; status?: string; user_id?: string }): Promise<ApiResponse<{ leaves: LeaveApplication[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    
    return this.request<{ leaves: LeaveApplication[]; pagination: any }>(`/admin/leaves/?${queryParams}`);
  }

  // Admin endpoint to approve a leave application
  async approveLeave(leaveId: string): Promise<ApiResponse<LeaveApplication>> {
    return this.request<LeaveApplication>(`/admin/leaves/${leaveId}/approve`, {
      method: 'PUT',
    });
  }

  // Admin endpoint to reject a leave application
  async rejectLeave(leaveId: string, rejectionReason: string): Promise<ApiResponse<LeaveApplication>> {
    return this.request<LeaveApplication>(`/admin/leaves/${leaveId}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejection_reason: rejectionReason }),
    });
  }

  // Admin endpoint to get dashboard statistics
  async getDashboardStats(date?: string): Promise<ApiResponse<{
    leaves_pending: number;
    leaves_approved: number;
    employees_out_today: number;
    avg_days_per_employee: number;
    selected_date: string;
    total_leave_days: number;
    total_employees: number;
  }>> {
    const queryParams = new URLSearchParams();
    if (date) queryParams.append('date', date);
    
    return this.request(`/admin/leaves/dashboard-stats?${queryParams}`);
  }

  async createLeave(leaveData: {
    leave_type_id: string;
    start_date: string;
    end_date: string;
    is_half_day: boolean;
    reason?: string;
    description?: string;
  }): Promise<ApiResponse<LeaveApplication>> {
    return this.request<LeaveApplication>('/leaves/', {
      method: 'POST',
      body: JSON.stringify(leaveData),
    });
  }

  async getLeaveBalance(year?: number): Promise<ApiResponse<LeaveBalance[]>> {
    const queryParams = year ? `?year=${year}` : '';
    return this.request<LeaveBalance[]>(`/leaves/balance${queryParams}`);
  }

  async getTeamLeaveBalances(year?: number): Promise<ApiResponse<any[]>> {
    const queryParams = year ? `?year=${year}` : '';
    return this.request<any[]>(`/admin/leaves/team-balances${queryParams}`);
  }

  async getEmployeeLeaves(userId: string, params?: { status?: string; year?: number }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.year) queryParams.append('year', params.year.toString());
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
    return this.request<any[]>(`/admin/leaves/employee/${userId}${queryString}`);
  }

  async getLeaveTypes(): Promise<ApiResponse<LeaveType[]>> {
    return this.request<LeaveType[]>('/leaves/types');
  }

  // Timesheet APIs
  async getTimesheets(params?: {
    page?: number;
    limit?: number;
    status?: string;
    start_date?: string;
    end_date?: string;
    user_id?: string;
  }): Promise<ApiResponse<{ timesheets: TimesheetEntry[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.user_id) queryParams.append('user_id', params.user_id); // Append user_id if present

    
    return this.request<{ timesheets: TimesheetEntry[]; pagination: any }>(`/timesheets/?${queryParams}`);
  }

  async createTimesheet(timesheetData: {
    project_id: string;
    task_description: string;
    entry_date: string;
    start_time?: string;
    end_time?: string;
    duration_hours?: number;
    break_time_minutes?: number;
  }): Promise<ApiResponse<TimesheetEntry>> {
    return this.request<TimesheetEntry>('/timesheets/', {
      method: 'POST',
      body: JSON.stringify(timesheetData),
    });
  }

  // async getTimesheetSummary(startDate: string, endDate: string): Promise<ApiResponse<any>> {
  //   return this.request(`/timesheets/summary?start_date=${startDate}&end_date=${endDate}`);
  // }
  async getTimesheetSummary(startDate: string, endDate: string, userId?: string): Promise<ApiResponse<any>> {
    const queryParams = new URLSearchParams();
    queryParams.append('start_date', startDate);
    queryParams.append('end_date', endDate);
    if (userId) queryParams.append('user_id', userId);
    return this.request(`/timesheets/summary?${queryParams}`);
  }

  async updateTimesheet(id: string, timesheetData: {
    task_description?: string;
    start_time?: string;
    end_time?: string;
    duration_hours?: number;
    break_time_minutes?: number;
  }): Promise<ApiResponse<TimesheetEntry>> {
    return this.request<TimesheetEntry>(`/timesheets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(timesheetData),
    });
  }

  async submitTimesheet(startDate: string, endDate: string): Promise<ApiResponse<{ submitted_entries: number }>> {
    return this.request<{ submitted_entries: number }>(`/timesheets/submit?start_date=${startDate}&end_date=${endDate}`, {
      method: 'POST',
    });
  }

  async deleteTimesheet(id: string): Promise<ApiResponse> {
    return this.request(`/timesheets/${id}`, {
      method: 'DELETE',
    });
  }

  // Event APIs
  async getEvents(params?: {
    page?: number;
    limit?: number;
    type?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<ApiResponse<{ events: Event[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.type) queryParams.append('type', params.type);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    
    return this.request<{ events: Event[]; pagination: any }>(`/events/?${queryParams}`);
  }

  async getBirthdays(month?: number, year?: number): Promise<ApiResponse<Event[]>> {
    const queryParams = new URLSearchParams();
    if (month) queryParams.append('month', month.toString());
    if (year) queryParams.append('year', year.toString());
    
    return this.request<Event[]>(`/events/birthdays?${queryParams}`);
  }

  async getAnniversaries(month?: number, year?: number): Promise<ApiResponse<Event[]>> {
    const queryParams = new URLSearchParams();
    if (month) queryParams.append('month', month.toString());
    if (year) queryParams.append('year', year.toString());
    
    return this.request<Event[]>(`/events/anniversaries?${queryParams}`);
  }

  async getHolidays(year?: number, month?: number): Promise<ApiResponse<Event[]>> {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year.toString());
    if (month) queryParams.append('month', month.toString());
    
    return this.request<Event[]>(`/events/holidays?${queryParams}`);
  }

  async getHolidaysByYear(year?: number): Promise<ApiResponse<Event[]>> {
    const queryParams = new URLSearchParams();
    if (year) queryParams.append('year', year.toString());
    
    return this.request<Event[]>(`/holidays/year?${queryParams}`);
  }

  async getUpcomingHolidays(limit?: number): Promise<ApiResponse<Event[]>> {
    const queryParams = new URLSearchParams();
    if (limit) queryParams.append('limit', limit.toString());
    
    return this.request<Event[]>(`/holidays/upcoming?${queryParams}`);
  }

  // News APIs
  async getNews(params?: {
    page?: number;
    limit?: number;
    category?: string;
    featured?: boolean;
  }): Promise<ApiResponse<{ news: News[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    if (params?.featured) queryParams.append('featured', 'true');
    
    return this.request<{ news: News[]; pagination: any }>(`/news?${queryParams}`);
  }

  async getCompanyNews(params?: { page?: number; limit?: number }): Promise<ApiResponse<{ news: News[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    
    return this.request<{ news: News[]; pagination: any }>(`/news/company?${queryParams}`);
  }

  // RSS News APIs
  async getLatestRSSNews(params?: {
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<RSSNewsItem[]>> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    
    return this.request<RSSNewsItem[]>(`/rss/latest?${queryParams}`);
  }

  async getRSSNewsByCategory(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<{ news: RSSNewsItem[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    
    return this.request<{ news: RSSNewsItem[]; pagination: any }>(`/rss/news?${queryParams}`);
  }

  async getRSSCategories(): Promise<ApiResponse<string[]>> {
    return this.request<string[]>('/rss/categories');
  }

  async refreshRSSFeeds(): Promise<ApiResponse> {
    return this.request('/rss/refresh', { method: 'POST' });
  }

  // Document APIs
  async getDocuments(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<{ documents: Document[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    
    return this.request<{ documents: Document[]; pagination: any }>(`/documents?${queryParams}`);
  }

  async uploadDocument(file: File, category?: string, description?: string): Promise<ApiResponse<Document>> {
    const formData = new FormData();
    formData.append('file', file);
    if (category) formData.append('category', category);
    if (description) formData.append('description', description);

    const response = await fetch(`${this.baseURL}/documents/upload`, {
      method: 'POST',
      headers: {
        Authorization: this.token ? `Bearer ${this.token}` : '',
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || data.message || 'Upload failed');
    }

    return data;
  }

  // Learning APIs
  async getLearningSessions(params?: {
    page?: number;
    limit?: number;
    topic?: string;
    upcoming?: boolean;
  }): Promise<ApiResponse<{ sessions: LearningSession[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.topic) queryParams.append('topic', params.topic);
    if (params?.upcoming) queryParams.append('upcoming', 'true');
    
    return this.request<{ sessions: LearningSession[]; pagination: any }>(`/learning/sessions?${queryParams}`);
  }

  // Sports APIs
  async getSportsEvents(params?: {
    page?: number;
    limit?: number;
    sport_type?: string;
    upcoming?: boolean;
  }): Promise<ApiResponse<{ events: SportsEvent[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.sport_type) queryParams.append('sport_type', params.sport_type);
    if (params?.upcoming) queryParams.append('upcoming', 'true');
    
    return this.request<{ events: SportsEvent[]; pagination: any }>(`/sports/events?${queryParams}`);
  }

  async getSportsFacilities(params?: { type?: string; available?: boolean }): Promise<ApiResponse<SportsFacility[]>> {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.available) queryParams.append('available', 'true');
    
    return this.request<SportsFacility[]>(`/sports/facilities?${queryParams}`);
  }

  // Gallery APIs
  async getGalleryImages(): Promise<ApiResponse<GalleryImage[]>> {
    return this.request<GalleryImage[]>('/gallery/images');
  }

  // Project APIs
  async getProjects(): Promise<ApiResponse<Project[]>> {
    return this.request<Project[]>('/projects/');
  }

  // Policy APIs
  async getPolicies(params?: {
    page?: number;
    limit?: number;
    category?: string;
  }): Promise<ApiResponse<{ policies: Policy[]; pagination: any }>> {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.category) queryParams.append('category', params.category);
    
    return this.request<{ policies: Policy[]; pagination: any }>(`/policies/?${queryParams}`);
  }

  async getPolicy(id: string): Promise<ApiResponse<Policy>> {
    return this.request<Policy>(`/policies/${id}`);
  }

  // New download methods for admin timesheet functionality
  async downloadTimesheetEntry(id: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/timesheets/download/${id}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download timesheet entry');
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'timesheet_entry.csv';
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }

  async downloadTimesheetsBulk(params?: {
    user_id?: string;
    start_date?: string;
    end_date?: string;
    status?: string;
  }): Promise<void> {
    const queryParams = new URLSearchParams();
    if (params?.user_id) queryParams.append('user_id', params.user_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    if (params?.status) queryParams.append('status', params.status);

    const response = await fetch(`${this.baseURL}/timesheets/download-bulk?${queryParams}`, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error('Failed to download timesheets');
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') || 'timesheets_export.csv';
    a.download = filename;
    
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

// Create and export API client instance
export const apiClient = new ApiClient(API_BASE_URL);

// Export utility functions
export const isApiError = (error: any): error is Error => {
  return error instanceof Error;
};

export const getErrorMessage = (error: any): string => {
  if (isApiError(error)) {
    return error.message;
  }
  return 'An unexpected error occurred';
};
