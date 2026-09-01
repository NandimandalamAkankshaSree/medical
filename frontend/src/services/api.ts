import {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  PatientProfile,
  MedicalDocumentSummary,
  MedicalDocumentDetail,
  PrescriptionRecord,
  DietPlanResponse,
  USDAFoodItem,
  HospitalDirectoryItem,
  ChatMessageItem,
  ReportComparisonResult,
  PatientHealthTrendsResponse
} from '../types';

export const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : (import.meta.env.PROD ? '/api' : 'http://127.0.0.1:8000/api');

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('mediassist_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export const api = {
  // Authentication & Session
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Invalid username or password');
    }
    const data: LoginResponse = await res.json();
    if (data.access_token) {
      localStorage.setItem('mediassist_token', data.access_token);
      localStorage.setItem('mediassist_user', JSON.stringify(data.user));
    }
    return data;
  },

  async register(req: RegisterRequest): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req)
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || 'Registration failed');
    }
    const data: LoginResponse = await res.json();
    if (data.access_token) {
      localStorage.setItem('mediassist_token', data.access_token);
      localStorage.setItem('mediassist_user', JSON.stringify(data.user));
    }
    return data;
  },

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  logout() {
    localStorage.removeItem('mediassist_token');
    localStorage.removeItem('mediassist_user');
  },

  // Patients & Personal Profile
  async getMyProfile(patientId?: string): Promise<PatientProfile> {
    const url = patientId ? `${API_BASE}/patients/${patientId}` : `${API_BASE}/patients/me`;
    const res = await fetch(url, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load personal health profile');
    return res.json();
  },

  async getPatientDetails(patientId: string): Promise<PatientProfile> {
    const res = await fetch(`${API_BASE}/patients/${patientId}`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error(`Failed to load profile for ${patientId}`);
    return res.json();
  },

  async updatePatientProfile(patientId: string, profileData: Partial<PatientProfile>) {
    const res = await fetch(`${API_BASE}/patients/${patientId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData)
    });
    if (!res.ok) throw new Error('Failed to update profile');
    return res.json();
  },

  async getPatients(query = '', page = 1, perPage = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    });
    if (query) params.append('q', query);
    const res = await fetch(`${API_BASE}/patients?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load patients');
    return res.json();
  },

  async reindexPatients(limit?: number) {
    const url = limit ? `${API_BASE}/patients/reindex?limit=${limit}` : `${API_BASE}/patients/reindex`;
    const res = await fetch(url, { method: 'POST' });
    return res.json();
  },

  // Documents
  async getPatientDocuments(patientId: string): Promise<MedicalDocumentSummary[]> {
    const res = await fetch(`${API_BASE}/documents/patient/${patientId}`);
    if (!res.ok) throw new Error('Failed to load documents');
    return res.json();
  },

  async getDocumentDetails(documentId: number): Promise<MedicalDocumentDetail> {
    const res = await fetch(`${API_BASE}/documents/${documentId}`);
    if (!res.ok) throw new Error('Failed to load document details');
    return res.json();
  },

  async uploadDocument(
    file: File,
    patientId: string,
    documentType = 'Medical Report',
    reportDate?: string,
    reportTag?: string,
    doctorName?: string,
    hospitalName?: string
  ) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('patient_id', patientId);
    formData.append('document_type', documentType);
    if (reportDate) formData.append('report_date', reportDate);
    if (reportTag) formData.append('report_tag', reportTag);
    if (doctorName) formData.append('doctor_name', doctorName);
    if (hospitalName) formData.append('hospital_name', hospitalName);

    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      let msg = 'Failed to upload and process document';
      try {
        const errJson = await res.json();
        if (errJson && errJson.detail) {
          msg = errJson.detail;
        }
      } catch (e) {}
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteDocument(documentId: number) {
    const res = await fetch(`${API_BASE}/documents/${documentId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete document');
    return res.json();
  },

  async deleteAllPatientDocuments(patientId: string) {
    const res = await fetch(`${API_BASE}/documents/patient/${patientId}/all`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete all documents');
    return res.json();
  },

  // Prescriptions
  async getPatientPrescriptions(patientId: string): Promise<PrescriptionRecord[]> {
    const res = await fetch(`${API_BASE}/prescriptions/patient/${patientId}`);
    if (!res.ok) throw new Error('Failed to load prescriptions');
    return res.json();
  },

  async normalizeMedicine(rawMedicineName: string, ocrConfidence = 0.90) {
    const res = await fetch(`${API_BASE}/prescriptions/normalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_medicine_name: rawMedicineName, ocr_confidence: ocrConfidence })
    });
    return res.json();
  },

  // Diet & Nutrition
  async generateDietPlan(patientId: string, documentId?: number, condition?: string): Promise<DietPlanResponse> {
    const res = await fetch(`${API_BASE}/diet/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient_id: patientId, document_id: documentId, condition })
    });
    if (!res.ok) throw new Error('Failed to generate diet plan');
    return res.json();
  },

  async searchFoods(query = '', category = '', limit = 50): Promise<USDAFoodItem[]> {
    const params = new URLSearchParams({ limit: limit.toString() });
    if (query) params.append('q', query);
    if (category) params.append('category', category);
    const res = await fetch(`${API_BASE}/diet/foods?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to search food database');
    return res.json();
  },

  async getNIDDKGuidelines(condition = 'Diabetes') {
    const res = await fetch(`${API_BASE}/diet/niddk-guidelines?condition=${encodeURIComponent(condition)}`);
    return res.json();
  },

  // Visualization & Trends
  async getDocumentVisualization(documentId: number) {
    const res = await fetch(`${API_BASE}/visualization/document/${documentId}`);
    if (!res.ok) throw new Error('Failed to load visualization data');
    return res.json();
  },

  async getPatientTrends(patientId: string, parameter?: string): Promise<PatientHealthTrendsResponse> {
    const params = new URLSearchParams();
    if (parameter) params.append('parameter', parameter);
    const res = await fetch(`${API_BASE}/visualization/trends/${patientId}?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to load trend data');
    return res.json();
  },

  // Comparison
  async compareReports(patientId: string, currentDocId: number, previousDocId: number): Promise<ReportComparisonResult> {
    const res = await fetch(`${API_BASE}/comparison`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        current_document_id: currentDocId,
        previous_document_id: previousDocId
      })
    });
    if (!res.ok) throw new Error('Failed to compare reports');
    return res.json();
  },

  // Hospital & Doctor Discovery
  async searchHospitals(query = '', department = '', city = '', page = 1, perPage = 20) {
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString()
    });
    if (query) params.append('q', query);
    if (department) params.append('department', department);
    if (city) params.append('city', city);
    const res = await fetch(`${API_BASE}/discovery/hospitals?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to search hospital directory');
    return res.json();
  },

  // AI Assistant Chat
  async sendChatMessage(
    patientId: string,
    message: string,
    documentId?: number,
    conversationId?: number
  ): Promise<ChatMessageItem> {
    const res = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patient_id: patientId,
        document_id: documentId,
        message: message,
        conversation_id: conversationId
      })
    });
    if (!res.ok) throw new Error('Failed to send message to AI Assistant');
    return res.json();
  },

  async getChatHistory(patientId: string, documentId?: number) {
    const params = documentId ? `?document_id=${documentId}` : '';
    const res = await fetch(`${API_BASE}/chat/history/${patientId}${params}`);
    if (!res.ok) return [];
    return res.json();
  },

  async createConversation(patientId: string, title?: string, documentId?: number) {
    const params = new URLSearchParams({ patient_id: patientId });
    if (documentId) params.append('document_id', String(documentId));
    if (title) params.append('title', title);
    const res = await fetch(`${API_BASE}/chat/conversations?${params.toString()}`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Failed to create new conversation');
    return res.json();
  },

  async deleteConversation(conversationId: number) {
    const res = await fetch(`${API_BASE}/chat/conversations/${conversationId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete conversation');
    return res.json();
  },

  async clearChatHistory(patientId: string) {
    try {
      await fetch(`${API_BASE}/chat/history/${patientId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  }
};
