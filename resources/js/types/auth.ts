export interface User {
    id: number;
    name: string;
    email: string;
    role: 'resident' | 'responder' | 'admin';
    contact_number: string | null;
    home_address: string | null;
    avatar?: string;
    avatar_url?: string | null;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
}

export interface Auth {
    user: User;
}

export interface TwoFactorSetupData {
    svg: string;
    url: string;
}

export interface TwoFactorSecretKey {
    secretKey: string;
}
