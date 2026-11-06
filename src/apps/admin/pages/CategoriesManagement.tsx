import { useState, useEffect } from 'react'
import { Layers, Plus, RefreshCw } from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Category } from '../../../shared/types'

export function CategoriesManagement() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  const fetchCats = () => {
    setLoading(true)
    apiRequest<Category[]>('/categories')
      .then(res => setCategories(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCats()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            TAXONOMY CONTROL
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Categories & Discovery Tags
          </h1>
          <p className="text-xs text-slate-500">
            Manage customer-facing interest classifications and category taxonomy.
          </p>
        </div>

        <button
          onClick={fetchCats}
          className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(c => (
          <div key={c.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-bold text-[#E06D3B]">{c.id}</span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Icon: {c.icon}
              </span>
            </div>
            <h3 className="font-serif font-bold text-base text-slate-900">{c.name}</h3>
            <p className="text-xs text-slate-500">{c.description || 'Verified classification'}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

