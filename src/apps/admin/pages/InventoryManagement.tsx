import { useState, useEffect } from 'react'
import { Package, RefreshCw, AlertTriangle, ShieldCheck, Edit, Check, X } from 'lucide-react'
import { apiRequest } from '../../../shared/api'

export function InventoryManagement() {
  const [inventory, setInventory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState<number>(0)
  const [updating, setUpdating] = useState(false)

  const fetchInventory = () => {
    setLoading(true)
    apiRequest('/admin/inventory')
      .then(res => setInventory(res))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchInventory()
  }, [])

  const startEdit = (row: any) => {
    setEditingId(row.ticket_type_id)
    setEditQty(row.available_quantity)
  }

  const saveEdit = async (ticketTypeId: string) => {
    setUpdating(true)
    try {
      await apiRequest(`/admin/inventory/${ticketTypeId}`, {
        method: 'PUT',
        body: { available_quantity: Number(editQty) },
      })
      setEditingId(null)
      fetchInventory()
    } catch (err: any) {
      alert(err.message || 'Inventory update failed')
    } finally {
      setUpdating(false)
    }
  }

  const togglePauseSales = async (row: any) => {
    const target = row.available_quantity > 0 ? 0 : 50
    try {
      await apiRequest(`/admin/inventory/${row.ticket_type_id}`, {
        method: 'PUT',
        body: { available_quantity: target },
      })
      fetchInventory()
    } catch (err: any) {
      alert(err.message || 'Could not toggle sales')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-[#E06D3B] uppercase">
            ATOMIC RESERVATIONS
          </span>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
            Ticket Inventory Control Matrix
          </h1>
          <p className="text-xs text-slate-500">
            Monitor real-time remaining capacity, active 10-minute hold counters, and adjust stock allocations.
          </p>
        </div>

        <button
          onClick={fetchInventory}
          className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <RefreshCw size={13} />
          <span>Refresh Stock</span>
        </button>
      </div>

      {/* Inventory Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-mono text-[10px]">
              <tr>
                <th className="px-6 py-3.5">Experience & City</th>
                <th className="px-6 py-3.5">Ticket Tier</th>
                <th className="px-6 py-3.5">Price</th>
                <th className="px-6 py-3.5">Available Stock</th>
                <th className="px-6 py-3.5">Reserved (Hold)</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Quick Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {inventory.map(row => {
                const isEditing = editingId === row.ticket_type_id
                const isLow = row.available_quantity > 0 && row.available_quantity < 10
                const isSoldOut = row.available_quantity === 0
                return (
                  <tr key={row.ticket_type_id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-4">
                      <strong className="block font-serif font-bold text-slate-900 text-xs sm:text-sm">{row.event_title}</strong>
                      <span className="text-[11px] text-slate-400 font-mono">{row.city} · Tier: {row.ticket_type_id}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-800">{row.tier_name}</td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">₹{row.price}</td>
                    <td className="px-6 py-4 font-mono">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editQty}
                          onChange={e => setEditQty(Number(e.target.value))}
                          className="w-20 p-1.5 rounded-lg border border-slate-300 font-mono text-xs"
                        />
                      ) : (
                        <span className={`font-bold ${isSoldOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-900'}`}>
                          {row.available_quantity} / {row.total_quantity}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-amber-700 font-bold">
                      {row.reserved_quantity} holds
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isSoldOut
                            ? 'bg-rose-50 text-rose-800 border border-rose-200'
                            : isLow
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {isSoldOut ? 'Paused / Sold Out' : isLow ? 'Low Stock' : 'Active Sales'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {isEditing ? (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => saveEdit(row.ticket_type_id)}
                            disabled={updating}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            title="Save quantity"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg"
                            title="Cancel"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => startEdit(row)}
                            className="px-2.5 py-1 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 font-semibold"
                          >
                            Set Qty
                          </button>
                          <button
                            onClick={() => togglePauseSales(row)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              row.available_quantity > 0
                                ? 'text-rose-600 border-rose-200 hover:bg-rose-50'
                                : 'text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                            }`}
                          >
                            {row.available_quantity > 0 ? 'Pause' : 'Resume'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

