# FloodTrack — Dashboard & Statistics Analysis

**Date:** 2026-10-07

---

## What Is This Dashboard?

FloodTrack is a flood monitoring and disaster-response coordination system built for the APLA (Angat Para sa Lungsod ng Angat) team. The admin panel has two main analytics pages: a real-time **Dashboard** and a deeper **Statistics** page, both served via Laravel + React (Inertia.js).

**Who uses it:** APLA disaster-response coordinators and administrators who monitor flood reports, dispatch rescue teams, and manage evacuation centers in Angat, Bulacan.

**Business process:** The system tracks the full lifecycle of flood incident reports — from citizen submission (via mobile app, SMS, or call) through verification, team assignment, and resolution.

**What it provides:** Real-time situational awareness on the Dashboard (counts, map, alerts) and trend analysis plus performance evaluation on the Statistics page (response times, responder efficiency, AI insights).

---

## Summary Cards & Key Metrics (Dashboard)

The Dashboard displays six primary KPI cards at the top, each with a trend indicator comparing to the previous period:

| Card | What It Shows | Trend |
| --- | --- | --- |
| Total Reports | All flood reports in the selected period | % change vs previous period |
| Pending | Reports awaiting verification | % change vs previous period |
| Active | Verified + assigned reports (in progress) | % change vs previous period |
| Resolved Today | Reports resolved on the current day | % change vs previous period |
| Total Users | All non-admin system users | — |
| Responders | Count of rescue personnel | — |

### Secondary Counts

| Metric | Description |
| --- | --- |
| Verified | Reports that passed verification |
| Assigned | Reports assigned to a rescue team |
| Resolved | Total resolved reports in the period |
| Rejected | Reports rejected during verification |
| Active Alerts | Total active alerts in the period |
| Affected Areas | Count of distinct addresses with active reports |

### Rates and Averages

| Metric | Formula |
| --- | --- |
| Avg Response Time | Mean minutes from report creation to resolution |
| Verification Rate | (Verified + Assigned + Resolved + Acknowledged + Rejected) / Total × 100% |
| Resolution Rate | Resolved / Total × 100% |
| Deployment Rate | Deployed Teams / Active Teams × 100% |
| Reports Per Responder | Total Reports / Total Responders |

### Team Operations Summary

| Metric | Description |
| --- | --- |
| Active Teams | Teams currently active |
| Deployed Teams | Teams with active assignments |
| Inactive Teams | Teams not currently active |

---

## Charts & Visualizations (Dashboard)

The Dashboard renders six visual components:

| Chart / Visual | Type | What It Shows |
| --- | --- | --- |
| Flood Incident Trend | Area chart | Daily reports vs resolved over the last 7/14/30/90 days, with a cumulative toggle |
| Flood Risk Score | Bar chart | Top 5 highest-risk barangays scored 0–100, color-coded by risk level (High ≥ 60, Moderate 30–59, Low < 30) |
| Top Barangays | Bar chart | Top 8 barangays ranked by report count, with a color gradient |
| Incident Map | Map grid | Up to 50 active reports plotted by latitude/longitude coordinates |
| Recent Reports | Table | Latest 10 reports with reference number, severity, status, address, user, and coordinates |
| Critical Alerts | Banner | Up to 3 latest critical-severity alerts displayed prominently |

### Flood Risk Score Formula (100-Point Scale)

| Factor | Max Points | Basis |
| --- | --- | --- |
| Report frequency | 25 | Normalized by highest-count barangay |
| Average severity | 20 | Weighted: critical = 4, high = 3, moderate = 2, low = 1 |
| Rainfall | 20 | Current 1-hour + next 2-day forecast (60/40 split) |
| Seasonality | 15 | Percentage of reports occurring in the current month |
| Elevation | 12 | Lower elevation = higher risk |
| Terrain | 8 | flood_prone = 0.5, near_river = 0.35, coastal = 0.15 |

### Filtering and Period Options

The dashboard supports filtering by:
- **Severity:** critical, high, moderate, low
- **Status:** pending, verified, assigned, resolved, rejected
- **Barangay:** multi-select from configured list
- **Date period:** today, this week, this month, last 30/90 days, or custom range

Trend percentages automatically compare the selected period to the same-length previous period.

---

## Statistics Page Breakdown

The Statistics page provides deeper analytics and trend analysis beyond the Dashboard.

### Summary Cards (Top of Page)

| Card | Description |
| --- | --- |
| Total Reports | All reports in the selected period |
| Critical Count | Reports with critical severity |
| Resolution Rate | Percentage of reports resolved |
| Avg Response Time | Mean end-to-end minutes from report to resolution |

### Trend Indicators (vs Previous Period)

| Trend | What It Tracks |
| --- | --- |
| Reports trend | % change in total report volume |
| Resolved trend | % change in resolved reports |
| Avg Response trend | % change in response time |
| Critical trend | % change in critical-severity reports |

### Charts and Visualizations (10 Total)

| Chart | Type | What It Shows |
| --- | --- | --- |
| Severity Breakdown | Bar chart | Critical, high, moderate, low counts with percentages |
| Status Breakdown | Bar chart | Pending, verified, assigned, resolved, rejected counts |
| Monthly Trend | Stacked bar | 6-month history of total reports broken down by severity |
| Peak Hours | Bar chart | Report counts by hour of day (0–23) |
| Peak Hours Heatmap | 7×24 grid | Activity intensity by day-of-week and hour |
| Barangay Heatmap | Horizontal bar | Top 20 areas ranked by report count |
| Month-over-Month | Grouped bar | This month vs last month by severity level |
| Report Source Distribution | Bar chart | Reports by submission channel (app, SMS, call, etc.) |
| Response Time Breakdown | Stacked bar | Per-severity stage times: report→verified, verified→assigned, assigned→resolved |
| Response Time Trend | Line chart | Daily average response time over last 30 days |

### Response Time Breakdown (Stage-by-Stage Averages)

| Stage | Description |
| --- | --- |
| Report → Verified | Time from citizen submission to admin verification |
| Verified → Assigned | Time from verification to rescue team dispatch |
| Assigned → Resolved | Time from team dispatch to on-ground resolution |

### Responder and Team Performance Tables

| Data | Fields Shown |
| --- | --- |
| Top 5 Responders | Name, resolved count, total assigned, efficiency %, avg response time |
| All Teams | Name, active status, total assigned, resolved count, efficiency %, avg response time |

### Evacuation Center Statistics

| Metric | Description |
| --- | --- |
| Total Centers | Number of evacuation centers |
| Total Capacity | Combined maximum occupancy |
| Total Occupancy | Current combined occupancy |
| Per-center detail | Name, address, type, capacity, occupancy, active status |
| Occupancy Timeline | Historical occupancy per center over time |

### Additional Data

| Data | Description |
| --- | --- |
| Barangay Reports | Top 20 barangays by report count |
| Alert Frequency | Alert counts by type per day (last 30 days) |
| Severity vs Response | Scatter plot data correlating severity level to response minutes |

### AI Insights Panel

The Statistics page includes an AI-powered analysis (GPT-4o-mini) that generates a structured assessment including:
- **Risk level** and confidence rating
- **Executive summary** (2–3 sentences)
- **Key findings** (4 items)
- **Bottleneck identification** — which stage is slowest, why, and how to fix it
- **Affected areas** — up to 5 critical areas with risk levels and reasons
- **Team actions** — specific actions for overloaded or inefficient teams
- **Evacuation actions** — interventions needed for evacuation centers
- **Priority action** — single most important immediate action

The AI ingests all report data, response times, team performance, evacuation status, and 7-day trends to produce these recommendations.

---

## Performance Indicators & Computed Metrics

Both pages surface performance indicators derived from the raw data:

| Indicator | Formula / Logic | Where Shown |
| --- | --- | --- |
| Verification Rate | (Verified + Assigned + Resolved + Acknowledged + Rejected) ÷ Total × 100 | Dashboard |
| Resolution Rate | Resolved ÷ Total × 100 | Dashboard, Statistics |
| Deployment Rate | Deployed Teams ÷ Active Teams × 100 | Dashboard |
| Reports Per Responder | Total Reports ÷ Total Responders | Dashboard |
| Responder Efficiency | Resolved ÷ Total Assigned × 100 (per responder) | Statistics |
| Avg Response Time | Mean minutes from report creation to resolution | Both |
| Stage Response Times | Avg minutes per stage (report→verified, verified→assigned, assigned→resolved) | Statistics |
| Flood Risk Score | Composite 0–100 score using 6 weighted factors (frequency, severity, rainfall, seasonality, elevation, terrain) | Dashboard |
| Trend % Change | (Current period value − Previous period value) ÷ Previous period value × 100 | Both |

**Period comparison logic:** The system automatically selects a comparison period of equal length. For example, "This Month" compares against last month; "Last 30 Days" compares against the 30 days before that. Trends are labeled with human-readable descriptions (e.g., "vs last week").

---

## Real-Time Features & Export

### Real-Time Updates (Dashboard)

The Dashboard listens to four Socket.IO events and automatically reloads data when any fires:
- `new-report`
- `report-status`
- `member-status-updated`
- `new-notification`

Authentication uses short-lived Sanctum tokens with automatic reconnection (up to 10 attempts, 3-second delay).

### PDF Export

The Dashboard can generate a PDF report containing:
- Summary statistics (4 main KPIs)
- Status breakdown with progress bars and percentages
- Severity breakdown with progress bars and percentages
- Top responders table (name, email, resolved count, resolution rate)
- Recent reports table (reference number, severity, status, address, reporter, team, date)
- Footer with generation timestamp and period label

### Mobile Dashboard

The Expo mobile app mirrors the admin Dashboard with:
- 6 summary cards (same KPIs as web)
- Severity and status breakdowns with percentage bars
- Recent reports with AI verification flags (duplicate, bad image, flagged, OK)
- Quick navigation to Report Management and Hazard Management

---

## Selected KPIs — Objective & Threshold (3 of N)

From all the KPIs displayed across the Dashboard and Statistics pages, the following three are selected for detailed explanation of their objective and threshold:

---

### KPI 1: Average Response Time

**What it measures:** The mean number of minutes from when a flood report is created (citizen submission) to when it is marked as resolved (on-ground resolution complete).

**Objective:** Minimize the time it takes for the APLA team to respond to and resolve flood incidents. Faster response times directly reduce the risk of casualties, property damage, and prolonged displacement. This KPI reflects the overall operational efficiency of the entire response pipeline — from verification to team dispatch to on-ground resolution.

**Threshold (from SLA configuration):**

The system enforces stage-by-stage SLA thresholds that vary by severity. The total end-to-end threshold is the sum of all three stages:

| Severity | Verify (min) | Assign (min) | Resolve (min) | Total End-to-End (min) |
| --- | --- | --- | --- | --- |
| Critical | 15 | 30 | 120 | **165 min (2 hr 45 min)** |
| High | 30 | 60 | 240 | **330 min (5 hr 30 min)** |
| Moderate | 60 | 120 | 480 | **660 min (11 hr)** |
| Low | 120 | 240 | 960 | **1,320 min (22 hr)** |

**Escalation behavior:**
- At **80%** of the threshold → status changes to **"at risk"** (warning level)
- At **100%** of the threshold → status changes to **"breached"**
- At **150%** of the threshold → status changes to **"critical breach"**, severity is auto-escalated one level up (e.g., high → critical), and admins receive push notifications

**Why it matters:** This is the single most important operational KPI. If response time is high, citizens remain in danger longer, and the team's credibility and effectiveness are diminished. The SLA system automates accountability by escalating unresolved reports before they become disasters.

---

### KPI 2: Resolution Rate

**What it measures:** The percentage of all flood reports within the selected period that have been fully resolved.

**Formula:** `Resolved Reports ÷ Total Reports × 100%`

**Objective:** Ensure that the team is not just receiving and acknowledging flood reports but actually completing the full response cycle — verifying, dispatching a team, and resolving the incident. A high resolution rate indicates that the organization is effectively closing out incidents rather than letting them stall at intermediate stages (pending, verified, or assigned).

**Threshold:**

| Level | Resolution Rate | Interpretation |
| --- | --- | --- |
| Excellent | ≥ 90% | Nearly all reports are being resolved; operations are highly effective |
| Acceptable | 70% – 89% | Most reports resolved; some may be stalling at verification or assignment |
| Needs Improvement | 50% – 69% | Significant backlog; team capacity or process bottlenecks likely |
| Critical | < 50% | Majority of reports unresolved; immediate operational review required |

**How the system uses it:**
- Displayed on both the Dashboard (as a computed rate) and the Statistics page (with trend comparison)
- The AI Insights panel flags low resolution rates and identifies which stage is the bottleneck (e.g., "assigned_to_resolved is the slowest stage — teams are dispatched but take too long to close")
- The trend indicator shows whether the rate is improving or declining vs the previous period

**Why it matters:** A low resolution rate means citizens are reporting floods but not receiving complete assistance. It signals either understaffing, process inefficiency, or reports getting stuck in the pipeline. Combined with the stage-by-stage response time breakdown, this KPI helps administrators pinpoint exactly where reports are failing to progress.

---

### KPI 3: Flood Risk Score

**What it measures:** A composite score from 0 to 100 assigned to each barangay, representing its current flood risk level based on multiple weighted factors.

**Objective:** Proactively identify which barangays are most vulnerable to flooding so that the APLA team can pre-position resources, issue early warnings, and prioritize response efforts before incidents escalate. Unlike reactive KPIs (response time, resolution rate), the Flood Risk Score is a predictive indicator that helps with prevention and preparedness.

**Formula (100-point scale):**

| Factor | Weight | How It's Calculated |
| --- | --- | --- |
| Report Frequency | 25 pts | Number of reports normalized against the highest-count barangay |
| Average Severity | 20 pts | Weighted average (critical=4, high=3, moderate=2, low=1), normalized to 20 |
| Rainfall | 20 pts | Current 1-hour rainfall (60%) + next 2-day forecast (40%), scaled to 20 |
| Seasonality | 15 pts | % of the barangay's reports that occurred in the current month |
| Elevation | 12 pts | Lower elevation = higher score (inverted scale) |
| Terrain | 8 pts | Based on terrain type: flood_prone (0.5), near_river (0.35), coastal (0.15) |

**Threshold:**

| Risk Level | Score Range | Action Required |
| --- | --- | --- |
| **High** | 60 – 100 | Immediate attention: pre-deploy teams, issue alerts, prepare evacuation centers |
| **Moderate** | 30 – 59 | Monitor closely: increase patrol frequency, prepare standby teams |
| **Low** | 0 – 29 | Routine monitoring: no immediate action needed |

**How the system uses it:**
- Displayed on the Dashboard as a color-coded bar chart (top 5 barangays)
- Red bars for high-risk, orange/yellow for moderate, green for low
- Refreshes with each period change, incorporating real-time rainfall data from weather APIs
- The AI Insights panel references high-risk barangays and recommends specific pre-emptive actions

**Why it matters:** Flood response is most effective when it starts before the flood peaks. This score combines historical incident patterns with live weather data and geographic factors to give administrators an early warning about which areas need attention now — not after citizens start calling for help.
