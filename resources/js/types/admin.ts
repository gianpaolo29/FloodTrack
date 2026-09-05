// ─── Shared admin domain types ────────────────────────────────────────────────

export type Severity        = 'low' | 'moderate' | 'high' | 'critical';
export type ReportStatus    = 'pending' | 'verified' | 'acknowledged' | 'assigned' | 'resolved' | 'rejected';
export type ResponderStatus = 'pending' | 'en_route' | 'on_scene' | 'resolved';
export type AlertType       = 'advisory' | 'update' | 'critical';
export type UserRole        = 'resident' | 'responder';

export interface TeamMember {
    id: number;
    name: string;
    avatar_url: string | null;
    is_leader: boolean;
    member_status?: ResponderStatus;
}

export interface Team {
    id: number;
    name: string;
    leader_id: number;
    members: TeamMember[];
    active_assignments?: number;
}

export interface MemberStatus {
    user_id: number;
    user_name: string;
    avatar_url: string | null;
    status: ResponderStatus;
    updated_at: string;
}

export const RESPONDER_STATUS_COLORS: Record<ResponderStatus, string> = {
    pending:  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    en_route: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    on_scene: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
    resolved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
};

export const RESPONDER_STATUS_LABELS: Record<ResponderStatus, string> = {
    pending:  'Pending',
    en_route: 'En Route',
    on_scene: 'On Scene',
    resolved: 'Resolved',
};

export interface AdminUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    contact_number: string | null;
    home_address: string | null;
    home_latitude: number | null;
    home_longitude: number | null;
    avatar_url: string | null;
    email_verified_at: string | null;
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
    assigned_team?: { id: number; name: string } | null;
    team_members?: TeamMember[];
    member_statuses?: MemberStatus[];
    verifier?: { id: number; name: string } | null;
    media?: ReportMedia[];
    status_updates?: StatusUpdate[];
    sla_status?: SlaStatus | null;
    sla_tracking?: SlaTracking[];
    created_at: string;
    verified_at: string | null;
    assigned_at?: string | null;
    resolved_at: string | null;
    ai_flagged: boolean;
    ai_flag_reason: string | null;
    ai_image_verified: boolean | null;
    ai_image_notes: string | null;
    ai_exif_status: 'pass' | 'fail' | 'no_data' | null;
    ai_exif_notes: string | null;
    potential_duplicate_of: number | null;
    advisory?: {
        nearby_centers: Array<{
            id: number; name: string; address: string; type: string;
            distance_km: number; capacity: number; current_occupancy: number; occupancy_pct: number;
        }>;
        safety_tips: Array<{ tip: string; steps: string[] }>;
        suggested_actions: string[];
        generated_at: string;
    } | null;
}

export interface FieldReport {
    id: number;
    report_id: number;
    user_id: number;
    user?: { id: number; name: string; role: string };
    actions_taken: string;
    resources_used: string | null;
    people_assisted: number | null;
    damage_assessment: string | null;
    checklist: string[] | null;
    created_at: string;
    updated_at: string;
}

export interface Alert {
    id: number;
    title: string;
    body: string;
    type: AlertType;
    target_barangays: string[] | null;
    creator?: { id: number; name: string };
    created_at: string;
}

export interface Responder {
    id: number;
    name: string;
    email?: string;
    contact_number?: string | null;
    avatar_url?: string | null;
    home_address?: string | null;
    team_id?: number | null;
    team_name?: string | null;
    is_leader?: boolean;
    total_assigned?: number;
    active_assignments?: number;
    resolved_count?: number;
    created_at?: string;
}

// ─── Premium color tokens ────────────────────────────────────────────────────

export const SEVERITY_COLORS: Record<Severity, string> = {
    low:      'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    moderate: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    high:     'bg-orange-50 text-orange-700 ring-1 ring-orange-600/10',
    critical: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
};

/* ─── SLA Types ─── */

export type SlaStage  = 'pending_to_verified' | 'verified_to_assigned' | 'assigned_to_resolved';
export type SlaStatus = 'on_track' | 'at_risk' | 'breached' | 'met';

export interface SlaTracking {
    id: number;
    report_id: number;
    stage: SlaStage;
    started_at: string;
    threshold_minutes: number;
    completed_at: string | null;
    elapsed_minutes: number | null;
    sla_status: SlaStatus;
    escalation_level: number;
    escalated_at: string | null;
}

export interface SlaConfig {
    id: number;
    severity: Severity;
    stage: SlaStage;
    threshold_minutes: number;
    warning_pct: number;
    critical_pct: number;
}

export const SLA_STATUS_COLORS: Record<SlaStatus, string> = {
    on_track: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    at_risk:  'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    breached: 'bg-red-50 text-red-700 ring-1 ring-red-600/10',
    met:      'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
};

export const SLA_STATUS_LABELS: Record<SlaStatus, string> = {
    on_track: 'On Track',
    at_risk:  'At Risk',
    breached: 'Breached',
    met:      'Met',
};

export const SLA_STAGE_LABELS: Record<SlaStage, string> = {
    pending_to_verified:  'Time to Verify',
    verified_to_assigned: 'Time to Assign',
    assigned_to_resolved: 'Time to Resolve',
};

export const STATUS_COLORS: Record<ReportStatus, string> = {
    pending:      'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10',
    verified:     'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10',
    acknowledged: 'bg-teal-50 text-teal-700 ring-1 ring-teal-600/10',
    assigned:     'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-600/10',
    resolved:     'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10',
    rejected:     'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-500/10',
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
    occupancy_pct?: number;
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
