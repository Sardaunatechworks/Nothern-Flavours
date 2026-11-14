import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { Truck, Plus, Phone, Mail, MapPin } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchSuppliers = async () => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.from('suppliers').select('*').order('name');
      if (data) {
        setSuppliers(data);
        setLoading(false);
        return;
      }
    }

    setSuppliers([
      {
        id: 's1',
        name: 'Dutse Central Grain & Rice Wholesalers',
        phone: '08021112233',
        email: 'grains@dutsemarket.ng',
        address: 'Stall 44, Yalwawa Main Market, Dutse',
        notes: 'Supplies Nigerian parboiled rice and semo weekly.',
      },
      {
        id: 's2',
        name: 'Jigawa Fresh Poultry & Farms',
        phone: '08039998877',
        email: 'poultry@jigawafarms.ng',
        address: 'Kudai Road, Dutse',
        notes: 'Freshly dressed chickens and turkey cuts.',
      },
    ]);
    setLoading(false);
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newSupp = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      notes: formData.get('notes'),
    };

    if (isSupabaseConfigured && supabase) {
      await supabase.from('suppliers').insert(newSupp);
    }
    setSuppliers([...suppliers, { id: `supp-${Date.now()}`, ...newSupp }]);
    setIsModalOpen(false);
    Swal.fire('Saved', 'Supplier contact recorded.', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Suppliers & Vendors
          </h1>
          <p className="text-xs text-stone-500">
            Operational contact list for poultry, produce, and packaging vendors
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow hover:bg-forest-700 transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Supplier</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-soft space-y-3"
          >
            <div className="flex items-start justify-between">
              <h3 className="font-serif text-base font-bold text-forest-950">{s.name}</h3>
              <span className="p-2 rounded-xl bg-forest-50 text-forest-800">
                <Truck className="w-4 h-4" />
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-stone-600">
              {s.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-stone-400" />
                  <span>{s.phone}</span>
                </div>
              )}
              {s.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-stone-400" />
                  <span>{s.email}</span>
                </div>
              )}
              {s.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>{s.address}</span>
                </div>
              )}
            </div>

            {s.notes && (
              <p className="text-[11px] text-stone-500 bg-stone-50 p-2 rounded-lg italic">
                {s.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-forest-950">Add Supplier Contact</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-stone-400">✕</button>
            </div>

            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Vendor Name *</label>
                <input
                  type="text"
                  required
                  name="name"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Phone</label>
                <input
                  type="text"
                  name="phone"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Email</label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Address / Market Stall</label>
                <input
                  type="text"
                  name="address"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Notes</label>
                <textarea
                  rows={2}
                  name="notes"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 text-gold-400 font-bold rounded-xl shadow"
                >
                  Save Supplier
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-stone-200 text-stone-700 font-bold rounded-xl"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
