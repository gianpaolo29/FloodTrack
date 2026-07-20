// ─── Shared admin domain types ────────────────────────────────────────────────

export type Severity   = 'low' | 'moderate' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'verified' | 'assigned' | 'resolved' | 'rejected';
export type AlertType  = 'advisory' | 'update' | 'critical';
export type UserRole   = 'resident' | 'responder';

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    contact_number: string | null;
    home_address: string | null;
    home_latitude: number | null;
    home_longitude: number | null;
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
    user: { id: number; name: string; role: string } | null;
    created_at: string;
}

export interface Report {
    id: number;
    reference_number: string;
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
    ai_flagged: boolean;
    ai_flag_reason: string | null;
    ai_image_verified: boolean | null;
    ai_image_notes: string | null;
    ai_exif_status: 'pass' | 'fail' | 'no_data' | null;
    ai_exif_notes: string | null;
    potential_duplicate_of: number | null;
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

// ─── Premium color tokens ────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<Severity, string> = {
    low:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    moderate: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    high:     'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10',
    critical: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
    pending:  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    verified: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    assigned: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
    resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    rejected: 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-500/10',
};

/* ─── Evacuation Center Management ─── */

export type EvacuationCenterType = 'gymnasium' | 'school' | 'barangay_hall' | 'church' | 'community_center';

export interface EvacuationCenter {
    id: number;
    name: string;
    address: string;
    type: EvacuationCenterType;
    capacity: number;
    current_occupancy: number;
    latitude: number;
    longitude: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export const EVACUATION_CENTER_TYPE_LABELS: Record<EvacuationCenterType, string> = {
    gymnasium:        'Gymnasium',
    school:           'School',
    barangay_hall:    'Barangay Hall',
    church:           'Church',
    community_center: 'Community Center',
};

/* ─── Hazard Management ─── */

export type HazardCategory = 'flood' | 'road';

export interface Hazard {
    id: number;
    category: HazardCategory;
    type: string;
    severity: Severity;
    title: string;
    description: string | null;
    latitude: number;
    longitude: number;
    address: string | null;
    active: boolean;
    created_by: number;
    creator?: { id: number; name: string };
    created_at: string;
    updated_at: string;
}

export const HAZARD_CATEGORY_LABELS: Record<HazardCategory, string> = {
    flood: 'Flood Hazard',
    road:  'Road Hazard',
};

export const HAZARD_TYPE_OPTIONS: Record<HazardCategory, { value: string; label: string }[]> = {
    flood: [
        { value: 'flash_flood',   label: 'Flash Flood' },
        { value: 'river_flood',   label: 'River Overflow' },
        { value: 'coastal_flood', label: 'Coastal / Storm Surge' },
        { value: 'urban_flood',   label: 'Urban Flood' },
    ],
    road: [
        { value: 'closed_road',  label: 'Road Closed' },
        { value: 'debris',       label: 'Debris / Obstruction' },
        { value: 'landslide',    label: 'Landslide' },
        { value: 'flooded_road', label: 'Flooded Road' },
        { value: 'slow_zone',    label: 'Slow Down Zone' },
    ],
};
