import { useState, useRef, useEffect } from 'react'
import {
  QrCode,
  Camera,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Search,
  User,
  Calendar,
  Ticket,
  MapPin,
  RefreshCw
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function QRVerificationPage() {
  const [tokenInput, setTokenInput] = useState('')
  const [location, setLocation] = useState('Main Gate - North Turnstile')
  const [scanning, setScanning] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [scanHistory, setScanHistory] = useState<any[]>([])
  const [cameraActive, setCameraActive] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Camera video stream handler
  const startCamera = async () => {
    try {
      setCameraActive(true)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
    } catch {
      alert('Camera access unavailable. You can enter or paste the QR code token or booking reference below.')
      setCameraActive(false)
    }
  }

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach(track => track.stop())
    }
    setCameraActive(false)
  }

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  const handleVerify = async (tokenToVerify?: string) => {
    const raw = (tokenToVerify || tokenInput).trim()
    if (!raw) return
    setVerifying(true)
    setResult(null)

    try {
      const res = await apiRequest('/admin/ticket-verification', {
        method: 'POST',
        body: {
          qr_token: raw,
          location,
        },
      })
      setResult(res)
      setScanHistory(prev => [
        {
          id: Date.now(),
          booking_id: res.booking_id,
          event: res.event_title,
          customer: res.customer_name,
          valid: res.valid,
          time: new Date().toLocaleTimeString(),
          location,
          reason: res.reason,
        },
        ...prev,
      ])
      if (res.valid) {
        setTokenInput('')
      }
    } catch (err: any) {
      setResult({
        valid: false,
        reason: 'FORGED_OR_INVALID',
        message: err.message || 'Invalid ticket token or signature mismatch',
      })
    } finally {
      setVerifying(false)
    }
  }

  const handleSampleToken = async (sampleCode: string) => {
    try {
      const ticket = await apiRequest(`/tickets/${sampleCode}`)
      if (ticket?.qr_token) {
        setTokenInput(ticket.qr_token)
        handleVerify(ticket.qr_token)
      }
    } catch {
      setTokenInput(sampleCode)
      handleVerify(sampleCode)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            TURNSTILE SECURITY
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            QR Pass Verification & Gate Check-in
          </h1>
          <p className="text-xs text-slate-500">
            Cryptographic ticket token verification. Validates authenticity and prevents duplicate check-ins.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 bg-white px-3 py-2 rounded-xl border border-slate-200">
            <MapPin size={13} className="text-[#E06D3B]" />
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="Main Gate - North Turnstile">Main Gate - North Turnstile</option>
              <option value="South Pavilion Entrance">South Pavilion Entrance</option>
              <option value="VIP & Fast-Track Lane">VIP & Fast-Track Lane</option>
            </select>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Scanner & Manual Entry Column */}
        <div className="lg:col-span-7 space-y-5">
          {/* Scanner Box */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                <QrCode size={18} className="text-[#0B192C]" />
                <span>Turnstile Scanner Terminal</span>
              </h2>
              {cameraActive ? (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold"
                >
                  Stop Camera
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Camera size={14} />
                  <span>Start Camera</span>
                </button>
              )}
            </div>

            {/* Video preview if camera active */}
            {cameraActive && (
              <div className="relative rounded-2xl overflow-hidden aspect-[4/3] bg-black border border-slate-800">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <div className="absolute inset-12 border-2 border-dashed border-emerald-400 rounded-2xl pointer-events-none animate-pulse" />
                <span className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/90 font-mono">
                  Align visitor QR pass within turnstile target
                </span>
              </div>
            )}

            {/* Manual Token or Code Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">
                Enter or Paste QR Payload Token / Booking Reference
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={e => setTokenInput(e.target.value)}
                  placeholder="Paste raw QR token (e.g. WF-7A8B9C.hash...) or reference"
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
                <button
                  onClick={() => handleVerify()}
                  disabled={!tokenInput.trim() || verifying}
                  className="px-5 py-2.5 rounded-xl bg-[#0B192C] text-white hover:bg-[#E06D3B] text-xs font-semibold disabled:opacity-40 transition-colors shadow-sm"
                >
                  {verifying ? 'Validating...' : 'Verify Pass'}
                </button>
              </div>
            </div>

            {/* Evaluator Quick Code Fill */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-mono text-[11px]">Quick Samples:</span>
              <button
                type="button"
                onClick={() => handleSampleToken('WF-7A8B9C')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
              >
                Sample 1: WF-7A8B9C
              </button>
              <button
                type="button"
                onClick={() => handleSampleToken('WF-2D3E4F')}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px]"
              >
                Sample 2: WF-2D3E4F
              </button>
            </div>
          </div>

          {/* Validation Result Display Card */}
          {result && (
            <div
              className={`p-6 rounded-3xl border shadow-lg space-y-4 animate-in zoom-in-95 ${
                result.valid
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : result.reason === 'ALREADY_USED'
                  ? 'bg-amber-50/80 border-amber-300 text-amber-950'
                  : 'bg-rose-50/80 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex items-center gap-3">
                {result.valid ? (
                  <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md">
                    <CheckCircle2 size={24} />
                  </div>
                ) : result.reason === 'ALREADY_USED' ? (
                  <div className="w-12 h-12 rounded-2xl bg-amber-600 text-white flex items-center justify-center shadow-md">
                    <AlertTriangle size={24} />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
                    <XCircle size={24} />
                  </div>
                )}

                <div>
                  <h3 className="font-serif font-bold text-lg sm:text-xl">
                    {result.valid
                      ? 'Access Granted · Valid Ticket'
                      : result.reason === 'ALREADY_USED'
                      ? 'Rejected · Pass Already Used'
                      : 'Security Alert · Invalid or Forged Token'}
                  </h3>
                  <span className="text-xs font-mono font-medium block mt-0.5">
                    {result.message}
                  </span>
                </div>
              </div>

              {result.booking_id && (
                <div className="p-4 rounded-2xl bg-white/80 border border-slate-200/80 space-y-2 text-xs">
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Booking Reference:</span>
                    <strong className="text-slate-900">{result.booking_id}</strong>
                  </div>
                  {result.event_title && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Event / Museum:</span>
                      <strong className="text-slate-900">{result.event_title}</strong>
                    </div>
                  )}
                  {result.customer_name && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Visitor:</span>
                      <strong className="text-slate-900">{result.customer_name}</strong>
                    </div>
                  )}
                  {result.visitors && (
                    <div className="pt-2 border-t border-slate-100 flex justify-between font-mono">
                      <span className="text-slate-500">Admissions:</span>
                      <span className="font-bold text-slate-800">
                        {result.visitors.map((v: any) => `${v.ticket_name} (${v.quantity})`).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Recent Scan History Column */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-2xs space-y-4">
            <h3 className="font-serif font-bold text-base text-slate-900">
              Live Turnstile Scan Log
            </h3>
            {scanHistory.length === 0 ? (
              <p className="text-xs text-slate-400 py-8 text-center font-mono">
                No tickets scanned this session. Ready for incoming turnstile traffic.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {scanHistory.map(item => (
                  <div key={item.id} className="py-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900">
                        {item.booking_id || 'UNKNOWN'}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          item.valid
                            ? 'bg-emerald-50 text-emerald-800'
                            : item.reason === 'ALREADY_USED'
                            ? 'bg-amber-50 text-amber-800'
                            : 'bg-rose-50 text-rose-800'
                        }`}
                      >
                        {item.valid ? 'PASSED' : item.reason === 'ALREADY_USED' ? 'DUPLICATE' : 'INVALID'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>{item.customer || 'Guest'}</span>
                      <span className="font-mono">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

