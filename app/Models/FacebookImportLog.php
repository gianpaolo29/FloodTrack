<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FacebookImportLog extends Model
{
    protected $table = 'facebook_import_log';

    protected $fillable = [
        'facebook_post_id',
        'imported',
        'report_id',
        'skipped_reason',
    ];

    protected function casts(): array
    {
        return [
            'imported' => 'boolean',
        ];
    }

    public function report()
    {
        return $this->belongsTo(Report::class);
    }
}
