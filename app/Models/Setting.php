<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;

class Setting extends Model
{
    protected $fillable = ['group', 'key', 'value', 'type'];

    /**
     * Get a setting value by key, with optional default.
     */
    public static function getValue(string $key, mixed $default = null): mixed
    {
        $setting = static::where('key', $key)->first();

        if (! $setting) {
            return $default;
        }

        return $setting->castValue();
    }

    /**
     * Set a setting value by key.
     */
    public static function setValue(string $key, mixed $value): void
    {
        $setting = static::where('key', $key)->first();

        if ($setting) {
            $setting->update(['value' => (string) $value]);
        }
    }

    /**
     * Get all settings grouped.
     */
    public static function allGrouped(): array
    {
        return static::all()
            ->groupBy('group')
            ->map(fn ($items) => $items->mapWithKeys(fn ($item) => [
                $item->key => [
                    'value' => $item->castValue(),
                    'type'  => $item->type,
                ],
            ]))
            ->toArray();
    }

    /**
     * Cast the stored string value to its proper type.
     */
    public function castValue(): mixed
    {
        return match ($this->type) {
            'boolean' => (bool) $this->value,
            'integer' => (int) $this->value,
            default   => $this->value,
        };
    }
}
