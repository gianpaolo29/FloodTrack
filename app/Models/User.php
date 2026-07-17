<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, TwoFactorAuthenticatable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'contact_number',
        'avatar',
        'is_on_duty',
        'home_address',
        'home_latitude',
        'home_longitude',
    ];

    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected $appends = ['avatar_url'];

    public function getAvatarUrlAttribute(): ?string
    {
        if (!$this->avatar) {
            return null;
        }
        return asset('storage/' . $this->avatar);
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_on_duty' => 'boolean',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    public function reports()
    {
        return $this->hasMany(Report::class);
    }

    public function assignedReports()
    {
        return $this->hasMany(Report::class, 'assigned_to');
    }

    public function statusUpdates()
    {
        return $this->hasMany(ReportStatusUpdate::class);
    }

    public function alertReads()
    {
        return $this->hasMany(AlertRead::class);
    }

    public function deviceTokens()
    {
        return $this->hasMany(DeviceToken::class);
    }

    // ── Role helpers ────────────────────────────────────────────────────

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function isResponder(): bool
    {
        return $this->role === 'responder';
    }

    public function isResident(): bool
    {
        return $this->role === 'resident';
    }

    public function hasRole(string ...$roles): bool
    {
        return in_array($this->role, $roles);
    }

    /**
     * Return a permissions map based on the user's role.
     */
    public function permissions(): array
    {
        return match ($this->role) {
            'admin' => [
                'can_verify_reports'  => true,
                'can_assign_reports'  => true,
                'can_reject_reports'  => true,
                'can_manage_users'    => true,
                'can_create_alerts'   => true,
                'can_view_statistics' => true,
                'can_export_data'     => true,
                'can_update_status'   => true,
                'can_submit_reports'  => true,
            ],
            'responder' => [
                'can_verify_reports'  => false,
                'can_assign_reports'  => false,
                'can_reject_reports'  => false,
                'can_manage_users'    => false,
                'can_create_alerts'   => false,
                'can_view_statistics' => false,
                'can_export_data'     => false,
                'can_update_status'   => true,
                'can_submit_reports'  => true,
            ],
            'resident' => [
                'can_verify_reports'  => false,
                'can_assign_reports'  => false,
                'can_reject_reports'  => false,
                'can_manage_users'    => false,
                'can_create_alerts'   => false,
                'can_view_statistics' => false,
                'can_export_data'     => false,
                'can_update_status'   => false,
                'can_submit_reports'  => true,
            ],
        };
    }
}
