// ─── Shared admin domain types ────────────────────────────────────────────────

export type Severity   = 'low' | 'moderate' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'verified' | 'assigned' | 'resolved' | 'rejected';
export type HazardType = 'flood' | 'road_damage' | 'debris' | 'drainage' | 'other';
export type AlertType  = 'advisory' | 'update' | 'critical';
export type UserRole   = 'resident' | 'responder';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    contact_number: string | null;
    reports_count: number;
    active_assignments: number;
    created_at: string;
}

export interface ReportMedia {
    id: number;
    file_path: string;
    file_type: 'image' | 'video';
    url: string;
}

export interface StatusUpdate {
    id: number;
    status: string;
    notes: string | null;
    user: { id: number; name: string; role: string };
    created_at: string;
}

export interface Report {
    id: number;
    reference_number: string;
    hazard_type: HazardType;
    severity: Severity;
    status: ReportStatus;
    description: string | null;
    latitude: number;
    longitude: number;
    address: string | null;
    user?: { id: number; name: string; email: string; contact_number: string | null };
    assigned_responder?: { id: number; name: string; contact_number: string | null } | null;
    verifier?: { id: number; name: string } | null;
    media?: ReportMedia[];
    status_updates?: StatusUpdate[];
    created_at: string;
    verified_at: string | null;
    resolved_at: string | null;
}

export interface Alert {
    id: number;
    title: string;
    body: string;
    type: AlertType;
    is_critical: boolean;
    expires_at: string | null;
    creator?: { id: number; name: string };
    created_at: string;
}

export interface Responder {
    id: number;
    name: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<Severity, string> = {
    low:      'bg-green-100 text-green-800',
    moderate: 'bg-yellow-100 text-yellow-800',
    high:     'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
    pending:  'bg-amber-100 text-amber-800',
    verified: 'bg-blue-100 text-blue-800',
    assigned: 'bg-teal-100 text-teal-800',
    resolved: 'bg-green-100 text-green-800',
    rejected: 'bg-gray-100 text-gray-600',
};

export const HAZARD_LABELS: Record<HazardType, string> = {
    flood:       'Flood',
    road_damage: 'Road damage',
    debris:      'Debris',
    drainage:    'Drainage',
    other:       'Other',
};
