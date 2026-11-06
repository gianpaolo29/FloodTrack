<?php

namespace App\Observers;

use App\Jobs\RerouteAroundHazard;
use App\Models\Hazard;

class HazardObserver
{
    /**
     * When a road hazard is created active, or toggled to active, reroute affected responders.
     */
    public function created(Hazard $hazard): void
    {
        $this->maybeReroute($hazard);
    }

    public function updated(Hazard $hazard): void
    {
        // Only if active changed to true, or it was just set to road+active
        if ($hazard->wasChanged('active') && $hazard->active) {
            $this->maybeReroute($hazard);
        }
    }

    private function maybeReroute(Hazard $hazard): void
    {
        if ($hazard->category === 'road' && $hazard->active) {
            RerouteAroundHazard::dispatch($hazard->id);
        }
    }
}
