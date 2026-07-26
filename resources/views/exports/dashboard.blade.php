<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>FloodTrack Dashboard Report</title>
<style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
        font-family: DejaVu Sans, sans-serif;
        font-size: 11px;
        color: #1a1a2e;
        background: #fff;
        padding: 32px 36px;
    }

    /* ── Header ── */
    .header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 14px;
        margin-bottom: 22px;
    }
    .header-top {
        display: table;
        width: 100%;
    }
    .header-left  { display: table-cell; vertical-align: middle; }
    .header-right { display: table-cell; vertical-align: middle; text-align: right; }
    .brand {
        font-size: 22px;
        font-weight: 700;
        color: #2563eb;
        letter-spacing: -0.5px;
    }
    .brand span { color: #0ea5e9; }
    .tagline { font-size: 10px; color: #64748b; margin-top: 2px; }
    .meta { font-size: 10px; color: #64748b; line-height: 1.6; }
    .meta strong { color: #1e293b; }

    /* ── Section titles ── */
    .section { margin-bottom: 20px; }
    .section-title {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #2563eb;
        border-left: 3px solid #2563eb;
        padding-left: 8px;
        margin-bottom: 10px;
    }

    /* ── Stats grid ── */
    .stats-table { width: 100%; border-collapse: separate; border-spacing: 6px; }
    .stat-cell {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 6px;
        padding: 10px 12px;
        width: 25%;
        vertical-align: top;
    }
    .stat-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.6px; color: #94a3b8; font-weight: 600; }
    .stat-value { font-size: 22px; font-weight: 700; color: #1e293b; margin-top: 4px; }
    .stat-value.blue     { color: #2563eb; }
    .stat-value.amber    { color: #d97706; }
    .stat-value.violet   { color: #7c3aed; }
    .stat-value.emerald  { color: #059669; }
    .stat-value.red      { color: #dc2626; }
    .stat-value.sky      { color: #0284c7; }

    /* ── Two-column layout ── */
    .two-col { display: table; width: 100%; border-spacing: 0; }
    .col-left  { display: table-cell; width: 48%; vertical-align: top; padding-right: 10px; }
    .col-right { display: table-cell; width: 52%; vertical-align: top; padding-left: 10px; }

    /* ── Generic table ── */
    .data-table { width: 100%; border-collapse: collapse; font-size: 10px; }
    .data-table thead tr { background: #2563eb; color: #fff; }
    .data-table thead th { padding: 7px 10px; text-align: left; font-weight: 600; font-size: 9.5px; }
    .data-table tbody tr:nth-child(even) { background: #f1f5f9; }
    .data-table tbody td { padding: 6px 10px; border-bottom: 1px solid #e2e8f0; color: #334155; }

    /* ── Badges ── */
    .badge {
        display: inline-block;
        padding: 2px 7px;
        border-radius: 20px;
        font-size: 9px;
        font-weight: 600;
        text-transform: capitalize;
    }
    .badge-pending  { background: #fef3c7; color: #92400e; }
    .badge-verified { background: #e0f2fe; color: #0369a1; }
    .badge-assigned { background: #ede9fe; color: #5b21b6; }
    .badge-resolved { background: #d1fae5; color: #065f46; }
    .badge-rejected { background: #fee2e2; color: #991b1b; }
    .badge-critical { background: #fee2e2; color: #991b1b; }
    .badge-high     { background: #ffedd5; color: #9a3412; }
    .badge-moderate { background: #fef9c3; color: #854d0e; }
    .badge-low      { background: #dcfce7; color: #166534; }

    /* ── Progress bar ── */
    .progress-row { margin-bottom: 7px; }
    .progress-label { display: table; width: 100%; margin-bottom: 3px; }
    .progress-name  { display: table-cell; font-size: 10px; color: #475569; text-transform: capitalize; }
    .progress-count { display: table-cell; text-align: right; font-size: 10px; font-weight: 600; color: #1e293b; }
    .progress-track { background: #e2e8f0; border-radius: 4px; height: 7px; width: 100%; }
    .progress-fill  { height: 7px; border-radius: 4px; }

    /* ── Footer ── */
    .footer {
        margin-top: 28px;
        padding-top: 10px;
        border-top: 1px solid #e2e8f0;
        font-size: 9px;
        color: #94a3b8;
        text-align: center;
    }
</style>
</head>
<body>

{{-- ── Header ── --}}
<div class="header">
    <div class="header-top">
        <div class="header-left">
            <div class="brand">Flood<span>Track</span></div>
            <div class="tagline">Flood Monitoring &amp; Response System — Nasugbu, Batangas</div>
        </div>
        <div class="header-right">
            <div class="meta">
                <strong>Dashboard Report</strong><br>
                Period: {{ $periodLabel }}<br>
                Generated: {{ now()->format('F j, Y \a\t g:i A') }}
            </div>
        </div>
    </div>
</div>

{{-- ── Summary stats ── --}}
<div class="section">
    <div class="section-title">Summary</div>
    <table class="stats-table">
        <tr>
            <td class="stat-cell">
                <div class="stat-label">Total Reports</div>
                <div class="stat-value blue">{{ number_format($stats['total_reports']) }}</div>
            </td>
            <td class="stat-cell">
                <div class="stat-label">Pending</div>
                <div class="stat-value amber">{{ number_format($stats['pending']) }}</div>
            </td>
            <td class="stat-cell">
                <div class="stat-label">Active (Verified + Assigned)</div>
                <div class="stat-value violet">{{ number_format($stats['active']) }}</div>
            </td>
            <td class="stat-cell">
                <div class="stat-label">Resolved Today</div>
                <div class="stat-value emerald">{{ number_format($stats['resolved_today']) }}</div>
            </td>
        </tr>
        <tr>
            <td class="stat-cell">
                <div class="stat-label">Verified</div>
                <div class="stat-value sky">{{ number_format($stats['verified']) }}</div>
            </td>
            <td class="stat-cell">
                <div class="stat-label">Assigned</div>
                <div class="stat-value violet">{{ number_format($stats['assigned']) }}</div>
            </td>
            <td class="stat-cell">
                <div class="stat-label">Resolved</div>
                <div class="stat-value emerald">{{ number_format($stats['resolved']) }}</div>
            </td>
            <td class="stat-cell">
                <div class="stat-label">Rejected</div>
                <div class="stat-value red">{{ number_format($stats['rejected']) }}</div>
            </td>
        </tr>
    </table>
</div>

{{-- ── Breakdowns ── --}}
<div class="section">
    <div class="two-col">
        {{-- Status breakdown --}}
        <div class="col-left">
            <div class="section-title">Status Breakdown</div>
            @php $statusTotal = $status_breakdown->sum(); @endphp
            @foreach (['pending','verified','assigned','resolved','rejected'] as $s)
                @php $count = $status_breakdown[$s] ?? 0; $pct = $statusTotal > 0 ? round($count / $statusTotal * 100) : 0; @endphp
                <div class="progress-row">
                    <div class="progress-label">
                        <span class="progress-name">{{ ucfirst($s) }}</span>
                        <span class="progress-count">{{ $count }} <span style="color:#94a3b8;font-weight:400">({{ $pct }}%)</span></span>
                    </div>
                    <div class="progress-track">
                        @php
                            $colors = ['pending'=>'#f59e0b','verified'=>'#0ea5e9','assigned'=>'#8b5cf6','resolved'=>'#10b981','rejected'=>'#ef4444'];
                        @endphp
                        <div class="progress-fill" style="width:{{ $pct }}%;background:{{ $colors[$s] ?? '#94a3b8' }};"></div>
                    </div>
                </div>
            @endforeach
        </div>

        {{-- Severity breakdown --}}
        <div class="col-right">
            <div class="section-title">Severity Breakdown</div>
            @php $sevTotal = $severity_breakdown->sum(); @endphp
            @foreach (['critical','high','moderate','low'] as $sv)
                @php $count = $severity_breakdown[$sv] ?? 0; $pct = $sevTotal > 0 ? round($count / $sevTotal * 100) : 0; @endphp
                <div class="progress-row">
                    <div class="progress-label">
                        <span class="progress-name">{{ ucfirst($sv) }}</span>
                        <span class="progress-count">{{ $count }} <span style="color:#94a3b8;font-weight:400">({{ $pct }}%)</span></span>
                    </div>
                    <div class="progress-track">
                        @php
                            $sevColors = ['critical'=>'#ef4444','high'=>'#f97316','moderate'=>'#eab308','low'=>'#22c55e'];
                        @endphp
                        <div class="progress-fill" style="width:{{ $pct }}%;background:{{ $sevColors[$sv] ?? '#94a3b8' }};"></div>
                    </div>
                </div>
            @endforeach
        </div>
    </div>
</div>

{{-- ── Top Responders ── --}}
@if($top_responders->isNotEmpty())
<div class="section">
    <div class="section-title">Top Responders</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>Resolved</th>
                <th>Total Assigned</th>
                <th>Resolution Rate</th>
            </tr>
        </thead>
        <tbody>
            @foreach($top_responders as $i => $r)
            <tr>
                <td>{{ $i + 1 }}</td>
                <td><strong>{{ $r->name }}</strong></td>
                <td>{{ $r->email }}</td>
                <td>{{ $r->resolved_count }}</td>
                <td>{{ $r->total_assigned }}</td>
                <td>{{ $r->total_assigned > 0 ? round($r->resolved_count / $r->total_assigned * 100) : 0 }}%</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ── Recent Reports ── --}}
@if($recent_reports->isNotEmpty())
<div class="section">
    <div class="section-title">Recent Reports (Latest {{ $recent_reports->count() }})</div>
    <table class="data-table">
        <thead>
            <tr>
                <th>Reference</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Address</th>
                <th>Reporter</th>
                <th>Team</th>
                <th>Date</th>
            </tr>
        </thead>
        <tbody>
            @foreach($recent_reports as $report)
            <tr>
                <td><strong>{{ $report->reference_number }}</strong></td>
                <td><span class="badge badge-{{ $report->severity }}">{{ ucfirst($report->severity) }}</span></td>
                <td><span class="badge badge-{{ $report->status }}">{{ ucfirst($report->status) }}</span></td>
                <td>{{ $report->address ?? '—' }}</td>
                <td>{{ $report->user?->name ?? '—' }}</td>
                <td>{{ $report->assignedTeam?->name ?? '—' }}</td>
                <td>{{ \Carbon\Carbon::parse($report->created_at)->format('M j, Y') }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
</div>
@endif

{{-- ── Footer ── --}}
<div class="footer">
    FloodTrack System &nbsp;·&nbsp; Nasugbu, Batangas &nbsp;·&nbsp;
    This report was automatically generated on {{ now()->format('F j, Y \a\t g:i A') }} &nbsp;·&nbsp;
    Period: {{ $periodLabel }}
</div>

</body>
</html>
