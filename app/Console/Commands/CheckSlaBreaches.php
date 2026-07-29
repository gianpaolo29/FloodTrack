<?php

namespace App\Console\Commands;

use App\Models\Setting;
use App\Services\SlaService;
use Illuminate\Console\Command;

class CheckSlaBreaches extends Command
{
    protected $signature = 'sla:check-breaches';

    protected $description = 'Check for SLA threshold breaches and trigger escalation actions';

    public function handle(SlaService $sla): int
    {
        if (! Setting::getValue('sla_enabled')) {
            $this->info('SLA monitoring is disabled.');

            return self::SUCCESS;
        }

        $count = $sla->checkAndEscalate();

        $this->info("Processed {$count} escalation(s).");

        return self::SUCCESS;
    }
}
