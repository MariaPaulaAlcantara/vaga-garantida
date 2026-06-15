const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message =
      Array.isArray(body.message)
        ? body.message.join(', ')
        : body.message ?? 'Erro na requisição';
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
}

export const api = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    phone: string;
    registerAs?: 'participant' | 'organizer';
  }) =>
    request<{ accessToken: string; user: AuthUser }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  loginOrganizer: (email: string, password: string) =>
    request<{ accessToken: string; user: AuthUser }>('/auth/login/organizer', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  requestOtp: (phone: string) =>
    request<{ message: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (
    phone: string,
    code: string,
    name?: string,
    registerAs?: 'participant' | 'organizer',
  ) =>
    request<{
      accessToken: string;
      user: AuthUser;
    }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, name, registerAs }),
    }),

  getEvents: (token?: string | null) =>
    request<Event[]>('/events', {}, token),

  getEvent: (id: string, token?: string | null) =>
    request<Event>(`/events/${id}`, {}, token),

  getMyRegistrations: (token: string) =>
    request<Registration[]>('/registrations/mine', {}, token),

  registerForEvent: (eventId: string, token: string) =>
    request<Registration>(`/registrations/events/${eventId}`, {
      method: 'POST',
    }, token),

  cancelRegistration: (id: string, token: string) =>
    request<{ message: string }>(`/registrations/${id}`, {
      method: 'DELETE',
    }, token),

  confirmRegistration: (id: string, token: string) =>
    request<Registration>(`/registrations/${id}/confirm`, {
      method: 'PATCH',
    }, token),

  getOrganizerEvents: (
    token: string,
    scope: 'upcoming' | 'completed' = 'upcoming',
  ) =>
    request<Event[]>(`/events/organizer/mine?scope=${scope}`, {}, token),

  cancelEvent: (eventId: string, token: string) =>
    request<{ message: string }>(`/events/${eventId}/cancel`, {
      method: 'PATCH',
    }, token),

  deleteEvent: (eventId: string, token: string) =>
    request<{ message: string }>(`/events/${eventId}`, {
      method: 'DELETE',
    }, token),

  createEvent: (token: string, data: CreateEventInput) =>
    request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }, token),

  getEventRegistrations: (eventId: string, token: string) =>
    request<GroupedRegistrations>(
      `/registrations/events/${eventId}/organizer`,
      {},
      token,
    ),

  markAttendance: (id: string, attended: boolean, token: string) =>
    request<Registration>(`/registrations/${id}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({ attended }),
    }, token),

  getHistory: (token: string) =>
    request<Registration[]>('/users/me/history', {}, token),
};

export interface Event {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  capacity: number;
  status: string;
  occupiedSpots: number;
  availableSpots: number;
  availabilityStatus: 'open' | 'full' | 'closed' | 'cancelled' | 'completed';
  policy?: {
    opensDaysBefore: number;
    closesAtTime: string;
    promotedConfirmHours: number;
  };
  confirmationWindow?: {
    opensAt: string;
    closesAt: string;
    isOpen: boolean;
  };
}

export interface Registration {
  id: string;
  eventId: string;
  userId: string;
  status: string;
  waitlistPosition: number | null;
  joinedAt: string;
  confirmedAt: string | null;
  confirmationDeadline: string | null;
  confirmationWindow?: {
    opensAt: string;
    closesAt: string;
    isOpen: boolean;
  };
  event?: Event;
  user?: { id: string; name: string; phone: string };
}

export interface GroupedRegistrations {
  confirmed: Registration[];
  reserved: Registration[];
  waitlist: Registration[];
  attended: Registration[];
  noShow: Registration[];
  cancelled: Registration[];
  summary: {
    confirmed: number;
    reserved: number;
    waitlist: number;
    attended: number;
    noShow: number;
    cancelled: number;
    total: number;
  };
}

export interface CreateEventInput {
  title: string;
  description: string;
  startsAt: string;
  location: string;
  capacity: number;
  opensDaysBefore?: number;
  closesAtTime?: string;
  promotedConfirmHours?: number;
  publish?: boolean;
}
