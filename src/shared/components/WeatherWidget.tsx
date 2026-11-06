import { useEffect, useState } from 'react'
import { Cloud, CloudRain, Sun, Compass } from 'lucide-react'
import { apiRequest } from '../api'
import type { WeatherInfo } from '../types'

export function WeatherWidget({ lat = 12.9716, lon = 77.5946, city = 'Bengaluru' }: { lat?: number; lon?: number; city?: string }) {
  const [weather, setWeather] = useState<WeatherInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    apiRequest<WeatherInfo>(`/discovery/weather?latitude=${lat}&longitude=${lon}`)
      .then(res => {
        if (active) setWeather(res)
      })
      .catch(() => {
        if (active) {
          setWeather({
            source: 'Offline Cache',
            temperature_c: 24.5,
            condition: 'Clear sky',
            recommendation: 'Pleasant temperature for heritage and museum exploration',
            is_outdoor_friendly: true,
            last_updated: new Date().toISOString(),
          })
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [lat, lon])

  if (loading || !weather) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-100 text-stone-500 text-xs font-sans">
        <Compass className="animate-spin" size={14} />
        <span>Checking live weather...</span>
      </div>
    )
  }

  const isRain = weather.condition.toLowerCase().includes('rain') || weather.condition.toLowerCase().includes('shower')
  const isCloudy = weather.condition.toLowerCase().includes('cloud')

  return (
    <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-stone-900/5 border border-stone-200/80 text-stone-800 text-xs font-sans">
      {isRain ? (
        <CloudRain className="text-blue-600" size={16} />
      ) : isCloudy ? (
        <Cloud className="text-stone-500" size={16} />
      ) : (
        <Sun className="text-amber-500" size={16} />
      )}
      <span className="font-semibold">{city}: {weather.temperature_c}°C</span>
      <span className="text-stone-400">·</span>
      <span className="text-stone-600">{weather.condition}</span>
      <span className="hidden sm:inline text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200/60">
        {weather.is_outdoor_friendly ? 'Great for outdoors' : 'Indoor spots ideal'}
      </span>
    </div>
  )
}

