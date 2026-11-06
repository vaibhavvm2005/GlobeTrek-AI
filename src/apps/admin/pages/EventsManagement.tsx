import { useState, useEffect } from 'react'
import {
  Calendar,
  Plus,
  Search,
  Edit,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
  MapPin,
  Clock,
  Compass
} from 'lucide-react'
import { apiRequest } from '../../../shared/api'
import type { Experience, Category, Venue } from '../../../shared/types'

export function EventsManagement() {
  const [events, setEvents] = useState<Experience[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Experience | null>(null)

  // Form fields
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState('cat-museum')
  const [venueId, setVenueId] = useState('ven-ngma')
  const [city, setCity] = useState('Bengaluru')
  const [price, setPrice] = useState(150)
  const [image, setImage] = useState('https://images.unsplash.com/photo-1564399579883-451a5d44ec08?auto=format&fit=crop&w=1200&q=85')
  const [dateStr, setDateStr] = useState('Open Daily')
  const [description, setDescription] = useState('')
  const [inventory, setInventory] = useState(100)
  const [isPublished, setIsPublished] = useState(1)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const fetchCatalog = () => {
    setLoading(true)
    Promise.all([
      apiRequest<Experience[]>('/admin/events'),
      apiRequest<Category[]>('/categories'),
      apiRequest<Venue[]>('/venues'),
    ])
      .then(([evs, cats, vens]) => {
        setEvents(evs)
        setCategories(cats)
        setVenues(vens)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCatalog()
  }, [])

  const handleOpenCreate = () => {
    setEditingEvent(null)
    setTitle('')
    setCategoryId(categories[0]?.id || 'cat-museum')
    setVenueId(venues[0]?.id || 'ven-ngma')
    setCity('Bengaluru')
    setPrice(200)
    setImage('https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85')
    setDateStr('Weekends & Holidays')
    setDescription('Curated cultural experience.')
    setInventory(150)
    setIsPublished(1)
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErrorMsg('')
    try {
      await apiRequest('/admin/events', {
        method: 'POST',
        body: {
          title,
          category_id: categoryId,
          venue_id: venueId,
          city,
          price: Number(price),
          image,
          date_str: dateStr,
          description,
          inventory: Number(inventory),
          is_published: isPublished,
        },
      })
      setModalOpen(false)
      fetchCatalog()
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not save event')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this event? This will only succeed if there are zero confirmed bookings.')) return
    try {
      await apiRequest(`/admin/events/${id}`, { method: 'DELETE' })
      fetchCatalog()
    } catch (err: any) {
      alert(err.message || 'Delete operation rejected')
    }
  }

  const filtered = events.filter(e =>
    !query ||
    e.title.toLowerCase().includes(query.toLowerCase()) ||
    e.city.toLowerCase().includes(query.toLowerCase()) ||
    e.category_name?.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            CATALOG MANAGEMENT
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Event & Experience Directory
          </h1>
          <p className="text-xs text-slate-500">
            Publish, configure ticket tiers, assign venues, and manage listings across South Asian hubs.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="px-4 py-2.5 rounded-xl bg-[#0B192C] text-white hover:bg-[#E06D3B] text-xs font-semibold flex items-center gap-2 shadow-sm transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add New Event</span>
        </button>
      </div>

      {/* Search & Counter */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by title, city, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Total: <strong>{filtered.length}</strong> events
        </span>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Experience</th>
                <th className="px-6 py-3.5">Category</th>
                <th className="px-6 py-3.5">Location</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Seats Avail</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img src={e.image} alt="" className="w-12 h-12 rounded-xl object-cover shrink-0" />
                      <div>
                        <strong className="block font-serif font-bold text-slate-900 text-xs sm:text-sm">{e.title}</strong>
                        <span className="text-[11px] text-slate-400 font-mono">ID: #{e.id} · {e.date_str}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{e.category_name}</td>
                  <td className="px-6 py-4">{e.city}</td>
                  <td className="px-6 py-4 font-mono font-bold text-slate-900">₹{e.price}</td>
                  <td className="px-6 py-4 font-mono font-semibold">{e.inventory}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        e.is_published
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {e.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete event"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-serif font-bold text-xl text-slate-900">
                Create New Event or Experience
              </h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">Event Title</span>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Echoes of Hampi Classical Music Festival"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white"
                />
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Category</span>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Venue</span>
                  <select
                    value={venueId}
                    onChange={e => setVenueId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  >
                    {venues.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.city})</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">City</span>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Base Price (₹)</span>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="font-semibold text-slate-700">Initial Stock</span>
                  <input
                    type="number"
                    required
                    value={inventory}
                    onChange={e => setInventory(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono"
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">Image URL</span>
                <input
                  type="url"
                  required
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono text-xs"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">Date Display String</span>
                <input
                  type="text"
                  required
                  value={dateStr}
                  onChange={e => setDateStr(e.target.value)}
                  placeholder="e.g. 28 November 2026, 7 PM"
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </label>

              <label className="block space-y-1">
                <span className="font-semibold text-slate-700">Narrative Description</span>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                />
              </label>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-[#0B192C] text-white hover:bg-[#E06D3B] font-semibold"
                >
                  {saving ? 'Creating Event...' : 'Create Event & Initialize Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
