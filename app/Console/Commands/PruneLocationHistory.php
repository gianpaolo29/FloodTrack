<?php

namespace App\Console\Commands;

use App\Models\ResponderLocationHistory;
use Illuminate\Console\Command;

class PruneLocationHistory extends Command
{
    protected $signature = 'history:prune {--days=30 : Days of history to keep}';
    protected $description = 'Delete responder location history older than N days';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $cutoff = now()->subDays($days);

        $deleted = ResponderLocationHistory::where('recorded_at', '<', $cutoff)->delete();

        $this->info("Pruned {$deleted} location history records older than {$days} days.");
        return 0;
    }
}
