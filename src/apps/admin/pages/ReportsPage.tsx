import { FileSpreadsheet, Download, Calendar, CheckCircle2 } from 'lucide-react'

export function ReportsPage() {
  const reports = [
    {
      title: 'Daily Turnstile Admissions & Settlement Report',
      format: 'CSV / Excel',
      period: 'Past 30 Days',
      size: '142 KB',
      description: 'Itemized gate scan logs, checked-in passenger counts, and turnout percentages.',
    },
    {
      title: 'Tax Invoice & Convenience Fee Audit Ledger',
      format: 'CSV / PDF',
      period: 'Fiscal Month Nov 2026',
      size: '280 KB',
      description: 'Statutory GST breakdown, payment gateway convenience deductions, and merchant net receivables.',
    },
    {
      title: 'Inventory Velocity & Break-Even Occupancy Matrix',
      format: 'CSV',
      period: 'Quarterly',
      size: '95 KB',
      description: 'Sales velocity across General, Student, and VIP tiers, with hold drop-off analysis.',
    },
  ]

  const triggerDownload = (title: string) => {
    alert(`Downloading export: ${title}. Generating verified CSV spreadsheet.`)
  }

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
          FINANCIAL EXPORTS
        </span>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
          Accounting & Turnstile Reports
        </h1>
        <p className="text-xs text-slate-500">
          Generate tamper-proof CSV and financial exports for audit compliance and merchant settlements.
        </p>
      </div>

      <div className="space-y-4">
        {reports.map((rep, idx) => (
          <div key={idx} className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={16} className="text-[#E06D3B]" />
                <h3 className="font-serif font-bold text-base text-slate-900">{rep.title}</h3>
              </div>
              <p className="text-xs text-slate-500">{rep.description}</p>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400 pt-1">
                <span>Period: {rep.period}</span>
                <span>·</span>
                <span>Format: {rep.format}</span>
              </div>
            </div>

            <button
              onClick={() => triggerDownload(rep.title)}
              className="px-4 py-2 rounded-xl bg-[#0B192C] text-white hover:bg-[#E06D3B] text-xs font-semibold flex items-center gap-2 transition-colors shrink-0 shadow-xs"
            >
              <Download size={14} />
              <span>Download Report</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

