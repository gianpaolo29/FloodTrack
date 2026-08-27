<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use PhpOffice\PhpSpreadsheet\Chart\Chart;
use PhpOffice\PhpSpreadsheet\Chart\DataSeries;
use PhpOffice\PhpSpreadsheet\Chart\DataSeriesValues;
use PhpOffice\PhpSpreadsheet\Chart\Legend;
use PhpOffice\PhpSpreadsheet\Chart\PlotArea;
use PhpOffice\PhpSpreadsheet\Chart\Title;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\RichText\RichText;
use PhpOffice\PhpSpreadsheet\Shared\Date;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReportsExport
{
    // Colors
    private string $brandBlue   = '2563EB';
    private string $headerBg    = '1E40AF';
    private string $lightGray   = 'F8FAFC';
    private string $borderColor = 'E2E8F0';

    private array $sevColors = [
        'critical' => 'FEE2E2',
        'high'     => 'FFEDD5',
        'moderate' => 'FEF9C3',
        'low'      => 'DCFCE7',
    ];

    private array $statusColors = [
        'pending'  => 'FEF3C7',
        'verified' => 'E0F2FE',
        'assigned' => 'EDE9FE',
        'resolved' => 'D1FAE5',
        'rejected' => 'FEE2E2',
    ];

    public function __construct(
        private Collection $reports,
        private array      $stats,
        private Collection $severityBreakdown,
        private Collection $statusBreakdown,
        private Collection $topResponders,
        private string     $periodLabel,
    ) {}

    /**
     * Generate the spreadsheet and write to php://output.
     */
    public function download(string $filename): void
    {
        $spreadsheet = new Spreadsheet();

        // Remove default sheet — we create our own
        $spreadsheet->removeSheetByIndex(0);

        $this->buildSummarySheet($spreadsheet);
        $this->buildReportsSheet($spreadsheet);

        $spreadsheet->setActiveSheetIndex(0);

        $writer = IOFactory::createWriter($spreadsheet, 'Xlsx');
        $writer->setIncludeCharts(true);
        $writer->save('php://output');
    }

    // ─── Summary sheet ────────────────────────────────────────────────

    private function buildSummarySheet(Spreadsheet $spreadsheet): void
    {
        $sheet = new Worksheet($spreadsheet, 'Summary');
        $spreadsheet->addSheet($sheet, 0);

        $row = 1;

        // ── Branding header ──
        $sheet->mergeCells("A{$row}:H{$row}");
        $sheet->setCellValue("A{$row}", 'FloodTrack Report');
        $this->applyStyle($sheet, "A{$row}:H{$row}", [
            'font'      => ['bold' => true, 'size' => 18, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->brandBlue}"]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
        ]);
        $sheet->getRowDimension($row)->setRowHeight(40);
        $row++;

        // ── Period & generation date ──
        $sheet->mergeCells("A{$row}:H{$row}");
        $sheet->setCellValue("A{$row}", "Period: {$this->periodLabel}  |  Generated: " . now()->format('M d, Y h:i A'));
        $this->applyStyle($sheet, "A{$row}:H{$row}", [
            'font'      => ['italic' => true, 'size' => 10, 'color' => ['argb' => 'FF6B7280']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);
        $row += 2;

        // ── Summary stats grid ──
        $statItems = [
            ['Total Reports', $this->stats['total_reports'], 'DBEAFE'],
            ['Pending',       $this->stats['pending'],       'FEF3C7'],
            ['Verified',      $this->stats['verified'],      'E0F2FE'],
            ['Assigned',      $this->stats['assigned'],      'EDE9FE'],
            ['Resolved',      $this->stats['resolved'],      'D1FAE5'],
            ['Rejected',      $this->stats['rejected'],      'FEE2E2'],
        ];

        $col = 'A';
        foreach ($statItems as [$label, $value, $bg]) {
            $sheet->setCellValue("{$col}{$row}", $label);
            $sheet->setCellValue("{$col}" . ($row + 1), $value);
            $this->applyStyle($sheet, "{$col}{$row}:{$col}" . ($row + 1), [
                'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$bg}"]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => "FF{$this->borderColor}"]]],
            ]);
            $this->applyStyle($sheet, "{$col}{$row}", [
                'font' => ['bold' => true, 'size' => 9, 'color' => ['argb' => 'FF374151']],
            ]);
            $this->applyStyle($sheet, "{$col}" . ($row + 1), [
                'font' => ['bold' => true, 'size' => 14],
            ]);
            $sheet->getColumnDimension($col)->setWidth(16);
            $col++;
        }
        $row += 3;

        // ── Status breakdown ──
        $row = $this->writeBreakdownTable($sheet, $row, 'Status Breakdown', $this->statusBreakdown, $this->statusColors);
        $row++;

        // ── Severity breakdown ──
        $sevTableStartRow = $row;
        $row = $this->writeBreakdownTable($sheet, $row, 'Severity Breakdown', $this->severityBreakdown, $this->sevColors);
        $row++;

        // ── Pie chart: Severity ──
        if ($this->severityBreakdown->isNotEmpty()) {
            $dataStartRow = $sevTableStartRow + 1; // first data row after header
            $dataEndRow   = $dataStartRow + $this->severityBreakdown->count() - 1;

            $labels = [new DataSeriesValues('String', "Summary!\$A\${$dataStartRow}:\$A\${$dataEndRow}", null, $this->severityBreakdown->count())];
            $values = [new DataSeriesValues('Number', "Summary!\$B\${$dataStartRow}:\$B\${$dataEndRow}", null, $this->severityBreakdown->count())];

            $series   = new DataSeries(DataSeries::TYPE_PIECHART, null, range(0, 0), [], $labels, $values);
            $plotArea = new PlotArea(null, [$series]);
            $legend   = new Legend(Legend::POSITION_RIGHT, null, false);
            $title    = new Title('Severity Distribution');

            $chart = new Chart('severity_chart', $title, $legend, $plotArea);
            $chart->setTopLeftPosition('D' . ($sevTableStartRow));
            $chart->setBottomRightPosition('H' . ($sevTableStartRow + 12));
            $sheet->addChart($chart);
        }

        // ── Bar chart: Status ──
        // We need to know where the status table data starts; it was written earlier.
        // Re-scan to find it — it started right after the stats grid.
        $statusDataStart = 8; // row after "Status Breakdown" header (approximate)
        // Actually let's compute it properly. Stats grid ends at row 6 originally + 3 = row ~7. Let's use a stored value.
        // We'll refactor: store row refs.

        // For simplicity, write status chart data in a hidden area
        $chartDataRow = $row + 1;
        $i = 0;
        foreach ($this->statusBreakdown as $status => $count) {
            $sheet->setCellValue('A' . ($chartDataRow + $i), ucfirst($status));
            $sheet->setCellValue('B' . ($chartDataRow + $i), $count);
            $i++;
        }
        $statusChartEnd = $chartDataRow + $i - 1;

        if ($this->statusBreakdown->isNotEmpty()) {
            $labels2 = [new DataSeriesValues('String', "Summary!\$A\${$chartDataRow}:\$A\${$statusChartEnd}", null, $this->statusBreakdown->count())];
            $values2 = [new DataSeriesValues('Number', "Summary!\$B\${$chartDataRow}:\$B\${$statusChartEnd}", null, $this->statusBreakdown->count())];

            $series2   = new DataSeries(DataSeries::TYPE_BARCHART, DataSeries::GROUPING_CLUSTERED, range(0, 0), [], $labels2, $values2);
            $plotArea2 = new PlotArea(null, [$series2]);
            $legend2   = new Legend(Legend::POSITION_BOTTOM, null, false);
            $title2    = new Title('Status Distribution');

            $chart2 = new Chart('status_chart', $title2, $legend2, $plotArea2);
            $chart2->setTopLeftPosition('D' . $chartDataRow);
            $chart2->setBottomRightPosition('H' . ($chartDataRow + 12));
            $sheet->addChart($chart2);
        }

        $row = $chartDataRow + max($i, 13) + 2;

        // ── Top 5 responders ──
        $sheet->mergeCells("A{$row}:D{$row}");
        $sheet->setCellValue("A{$row}", 'Top 5 Responders');
        $this->applyStyle($sheet, "A{$row}:D{$row}", [
            'font' => ['bold' => true, 'size' => 12, 'color' => ['argb' => 'FFFFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->headerBg}"]],
        ]);
        $row++;

        $responderHeaders = ['Name', 'Email', 'Resolved', 'Total Assigned'];
        $col = 'A';
        foreach ($responderHeaders as $h) {
            $sheet->setCellValue("{$col}{$row}", $h);
            $this->applyStyle($sheet, "{$col}{$row}", [
                'font'    => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->brandBlue}"]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => "FF{$this->borderColor}"]]],
            ]);
            $col++;
        }
        $row++;

        foreach ($this->topResponders as $idx => $responder) {
            $bg = $idx % 2 === 0 ? 'FFFFFFFF' : "FF{$this->lightGray}";
            $sheet->setCellValue("A{$row}", $responder->name);
            $sheet->setCellValue("B{$row}", $responder->email);
            $sheet->setCellValue("C{$row}", $responder->resolved_count);
            $sheet->setCellValue("D{$row}", $responder->total_assigned);
            $this->applyStyle($sheet, "A{$row}:D{$row}", [
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $bg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => "FF{$this->borderColor}"]]],
            ]);
            $row++;
        }

        // Auto-size key columns
        foreach (range('A', 'H') as $c) {
            $sheet->getColumnDimension($c)->setAutoSize(true);
        }
    }

    private function writeBreakdownTable(Worksheet $sheet, int $row, string $title, Collection $data, array $colors): int
    {
        $sheet->mergeCells("A{$row}:C{$row}");
        $sheet->setCellValue("A{$row}", $title);
        $this->applyStyle($sheet, "A{$row}:C{$row}", [
            'font' => ['bold' => true, 'size' => 11, 'color' => ['argb' => 'FF1F2937']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->lightGray}"]],
            'borders' => ['bottom' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['argb' => "FF{$this->brandBlue}"]]],
        ]);
        $row++;

        $total = $data->sum();

        foreach ($data as $key => $count) {
            $pct = $total > 0 ? round(($count / $total) * 100, 1) : 0;
            $bg  = $colors[strtolower($key)] ?? 'FFFFFF';

            $sheet->setCellValue("A{$row}", ucfirst($key));
            $sheet->setCellValue("B{$row}", $count);
            $sheet->setCellValue("C{$row}", "{$pct}%");

            $this->applyStyle($sheet, "A{$row}:C{$row}", [
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$bg}"]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => "FF{$this->borderColor}"]]],
            ]);
            $this->applyStyle($sheet, "B{$row}:C{$row}", [
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
            ]);
            $row++;
        }

        return $row;
    }

    // ─── Reports sheet ────────────────────────────────────────────────

    private function buildReportsSheet(Spreadsheet $spreadsheet): void
    {
        $sheet = new Worksheet($spreadsheet, 'Reports');
        $spreadsheet->addSheet($sheet, 1);

        $columns = [
            'A' => ['title' => 'Reference',   'width' => 20],
            'B' => ['title' => 'Severity',     'width' => 12],
            'C' => ['title' => 'Status',       'width' => 12],
            'D' => ['title' => 'Description',  'width' => 40],
            'E' => ['title' => 'Address',      'width' => 35],
            'F' => ['title' => 'Lat',          'width' => 14],
            'G' => ['title' => 'Lon',          'width' => 14],
            'H' => ['title' => 'Reporter',     'width' => 18],
            'I' => ['title' => 'Assigned To',  'width' => 18],
            'J' => ['title' => 'Team',         'width' => 18],
            'K' => ['title' => 'Created At',   'width' => 22],
            'L' => ['title' => 'Verified At',  'width' => 22],
            'M' => ['title' => 'Resolved At',  'width' => 22],
        ];

        // ── Header row ──
        $headerRow = 1;
        foreach ($columns as $col => $meta) {
            $sheet->setCellValue("{$col}{$headerRow}", $meta['title']);
            $sheet->getColumnDimension($col)->setWidth($meta['width']);
        }

        $lastCol = 'M';
        $this->applyStyle($sheet, "A{$headerRow}:{$lastCol}{$headerRow}", [
            'font'      => ['bold' => true, 'size' => 10, 'color' => ['argb' => 'FFFFFFFF']],
            'fill'      => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->brandBlue}"]],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
            'borders'   => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => "FF{$this->borderColor}"]]],
        ]);

        // Freeze top row + autofilter
        $sheet->freezePane('A2');
        $sheet->setAutoFilter("A1:{$lastCol}1");

        // Date format for Excel
        $dateFormat = 'MMM D, YYYY h:mm AM/PM';

        // ── Data rows ──
        $row = 2;
        foreach ($this->reports as $idx => $report) {
            // Reference as explicit text to avoid scientific notation
            $sheet->getCell("A{$row}")->setValueExplicit($report->reference_number, \PhpOffice\PhpSpreadsheet\Cell\DataType::TYPE_STRING);

            $sheet->setCellValue("B{$row}", ucfirst($report->severity));
            $sheet->setCellValue("C{$row}", ucfirst($report->status));
            $sheet->setCellValue("D{$row}", $report->description);
            $sheet->setCellValue("E{$row}", $report->address);

            // Lat/Lon as numbers
            if ($report->latitude !== null) {
                $sheet->setCellValue("F{$row}", (float) $report->latitude);
                $sheet->getStyle("F{$row}")->getNumberFormat()->setFormatCode('0.000000');
            }
            if ($report->longitude !== null) {
                $sheet->setCellValue("G{$row}", (float) $report->longitude);
                $sheet->getStyle("G{$row}")->getNumberFormat()->setFormatCode('0.000000');
            }

            $sheet->setCellValue("H{$row}", $report->user?->name ?? '');
            $sheet->setCellValue("I{$row}", $report->assignedResponder?->name ?? '');
            $sheet->setCellValue("J{$row}", $report->assignedTeam?->name ?? '');

            // Dates as Excel date values
            $this->setDateCell($sheet, "K{$row}", $report->created_at, $dateFormat);
            $this->setDateCell($sheet, "L{$row}", $report->verified_at, $dateFormat);
            $this->setDateCell($sheet, "M{$row}", $report->resolved_at, $dateFormat);

            // ── Alternating row color ──
            $rowBg = $idx % 2 === 0 ? 'FFFFFFFF' : "FF{$this->lightGray}";
            $this->applyStyle($sheet, "A{$row}:{$lastCol}{$row}", [
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => $rowBg]],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['argb' => "FF{$this->borderColor}"]]],
            ]);

            // ── Severity conditional color ──
            $sevKey = strtolower($report->severity);
            if (isset($this->sevColors[$sevKey])) {
                $this->applyStyle($sheet, "B{$row}", [
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->sevColors[$sevKey]}"]],
                    'font' => ['bold' => true],
                ]);
            }

            // ── Status conditional color ──
            $statKey = strtolower($report->status);
            if (isset($this->statusColors[$statKey])) {
                $this->applyStyle($sheet, "C{$row}", [
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['argb' => "FF{$this->statusColors[$statKey]}"]],
                    'font' => ['bold' => true],
                ]);
            }

            $row++;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private function setDateCell(Worksheet $sheet, string $cell, mixed $date, string $format): void
    {
        if ($date === null) {
            $sheet->setCellValue($cell, '');
            return;
        }

        $carbon = $date instanceof \Carbon\Carbon ? $date : \Carbon\Carbon::parse($date);
        $sheet->setCellValue($cell, Date::PHPToExcel($carbon));
        $sheet->getStyle($cell)->getNumberFormat()->setFormatCode($format);
    }

    private function applyStyle(Worksheet $sheet, string $range, array $style): void
    {
        $sheet->getStyle($range)->applyFromArray($style);
    }
}
