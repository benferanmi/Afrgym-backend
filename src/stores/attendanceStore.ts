import { create } from 'zustand';
import api from '@/lib/api';

export interface AttendanceRecord {
  user_id: number;
  gym_identifier: string;
  visit_date: string;
  visit_count: number;
  first_checkin: string;
  last_checkin: string;
  sources: string;
  user_name: string;
  user_email: string;
}

export interface Pagination {
  current_page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
}

interface AttendanceState {
  records: AttendanceRecord[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
  fetchAttendance: (params?: { page?: number; per_page?: number; date_from?: string; date_to?: string; gym_identifier?: string }) => Promise<void>;
  exportAttendance: (params?: { date_from?: string; date_to?: string; gym_identifier?: string }) => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  records: [],
  pagination: null,
  loading: false,
  error: null,

  fetchAttendance: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/gym-admin/v1/attendance', { params });
      set({ 
        records: response.data.data, 
        pagination: response.data.pagination,
        loading: false 
      });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to fetch attendance',
        loading: false 
      });
    }
  },

  exportAttendance: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/gym-admin/v1/attendance', { 
        params: { ...params, export: true } 
      });
      const data = response.data.data as AttendanceRecord[];
      
      // Convert to CSV
      const headers = ['Member Name', 'Email', 'Gym', 'Visit Date', 'Visit Count', 'First Check-in', 'Last Check-in', 'Sources'];
      const csvRows = [headers.join(',')];
      
      data.forEach(row => {
        const values = [
          `"${row.user_name}"`,
          `"${row.user_email}"`,
          `"${row.gym_identifier}"`,
          `"${row.visit_date}"`,
          row.visit_count,
          `"${row.first_checkin}"`,
          `"${row.last_checkin}"`,
          `"${row.sources}"`
        ];
        csvRows.push(values.join(','));
      });
      
      const csvString = csvRows.join('\n');
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_export_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      set({ loading: false });
    } catch (error: any) {
      set({ 
        error: error.response?.data?.message || 'Failed to export attendance',
        loading: false 
      });
    }
  }
}));
