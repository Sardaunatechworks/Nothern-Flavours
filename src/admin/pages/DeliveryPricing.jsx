import React, { useState, useEffect } from 'react';
import { menuService } from '../../services/menuService';
import { formatNaira } from '../../utils/formatters';
import { Truck, Plus, Edit2, Trash2, Save, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import Swal from 'sweetalert2';

export default function DeliveryPricing() {
  const [baseFee, setBaseFee] = useState(1000);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingBase, setSavingBase] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settings, deliveryZones] = await Promise.all([
        menuService.getRestaurantSettings(),
        menuService.getDeliveryZones(),
      ]);
      setBaseFee(settings?.default_delivery_fee ?? 1000);
      setZones(deliveryZones || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateBaseFee = async (e) => {
    e.preventDefault();
    setSavingBase(true);
    try {
      await menuService.updateBaseDeliveryFee(baseFee);
      Swal.fire({
        title: 'Updated',
        text: `Standard base delivery fee updated to ${formatNaira(baseFee)}`,
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    } finally {
      setSavingBase(false);
    }
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const delivery_fee = parseFloat(formData.get('delivery_fee'));

    try {
      if (editingZone?.id) {
        await menuService.updateDeliveryZone(editingZone.id, {
          name,
          delivery_fee,
        });
      } else {
        await menuService.createDeliveryZone({
          name,
          delivery_fee,
        });
      }

      Swal.fire('Saved', 'Delivery zone fee updated', 'success');
      setIsModalOpen(false);
      setEditingZone(null);
      loadData();
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleToggleZoneActive = async (zone) => {
    try {
      await menuService.updateDeliveryZone(zone.id, {
        is_active: !zone.is_active,
      });
      setZones(zones.map((z) => (z.id === zone.id ? { ...z, is_active: !zone.is_active } : z)));
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  const handleDeleteZone = async (zone) => {
    const res = await Swal.fire({
      title: `Delete zone ${zone.name}?`,
      text: 'This delivery location will be removed from customer checkout.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Yes, Delete',
    });

    if (res.isConfirmed) {
      try {
        await menuService.deleteDeliveryZone(zone.id);
        setZones(zones.filter((z) => z.id !== zone.id));
        Swal.fire('Deleted', 'Zone removed', 'success');
      } catch (err) {
        Swal.fire('Error', err.message, 'error');
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
            Delivery Pricing & Zones
          </h1>
          <p className="text-xs text-stone-500">
            Configure standard delivery rates and localized neighbourhood delivery fees across Dutse
          </p>
        </div>

        <button
          onClick={() => {
            setEditingZone(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-forest-800 text-gold-400 font-bold text-xs shadow hover:bg-forest-700 transition-colors"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Add Delivery Zone</span>
        </button>
      </div>

      {/* Base Delivery Fee Card */}
      <div className="bg-white p-6 rounded-3xl border border-stone-200/90 shadow-soft space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center text-forest-800">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-forest-950">
              Default Base Delivery Fee
            </h3>
            <p className="text-xs text-stone-500">
              Applied automatically whenever a customer chooses delivery without selecting a specific zone
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateBaseFee} className="flex flex-col sm:flex-row items-center gap-4 pt-2">
          <div className="relative w-full sm:w-64">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-stone-400 text-xs">
              ₦
            </span>
            <input
              type="number"
              step="50"
              min="0"
              required
              value={baseFee}
              onChange={(e) => setBaseFee(e.target.value)}
              className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-stone-300 text-sm font-bold text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-800"
            />
          </div>

          <button
            type="submit"
            disabled={savingBase}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-xs shadow transition-all active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{savingBase ? 'Saving...' : 'Update Default Fee'}</span>
          </button>
        </form>
      </div>

      {/* Specific Delivery Zones Table */}
      <div className="bg-white rounded-3xl border border-stone-200/90 shadow-soft overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-base font-bold text-forest-950">
              Neighbourhood / Zone Rates
            </h3>
            <p className="text-xs text-stone-500">
              Custom delivery rates for specific destinations (e.g. Yalwawa, Takur, FUD Campus)
            </p>
          </div>
          <span className="text-xs font-bold text-stone-400">
            {zones.length} active destinations
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs text-stone-400">Loading delivery zones...</div>
        ) : zones.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 text-stone-500 uppercase tracking-wider border-y border-stone-200">
                <tr>
                  <th className="py-3 px-4">Location / Zone Name</th>
                  <th className="py-3 px-4">Delivery Rate</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 font-medium text-stone-800">
                {zones.map((zone) => (
                  <tr key={zone.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-4 h-4 text-forest-800" />
                        <span className="font-bold text-forest-950">{zone.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-forest-900 text-sm">
                      {formatNaira(zone.delivery_fee)}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleZoneActive(zone)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          zone.is_active
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {zone.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingZone(zone);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-forest-800 hover:text-white transition-colors"
                          title="Edit Rate"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteZone(zone)}
                          className="p-1.5 rounded-lg bg-stone-100 hover:bg-rose-700 hover:text-white transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200 p-8">
            <p>No custom neighbourhood zones added yet.</p>
            <p className="text-[11px] text-stone-400 mt-1">
              Deliveries will use your standard default base fee ({formatNaira(baseFee)}).
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Zone Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-forest-950">
                {editingZone ? 'Edit Delivery Rate' : 'Add New Delivery Zone'}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingZone(null);
                }}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-stone-700">Zone / Neighbourhood Name *</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingZone?.name || ''}
                  placeholder="e.g. Yalwawa, FUD Campus, Takur, Limawa"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-stone-700">Delivery Fee (₦) *</label>
                <input
                  type="number"
                  step="50"
                  min="0"
                  required
                  name="delivery_fee"
                  defaultValue={editingZone?.delivery_fee || 500}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-forest-800 text-gold-400 font-bold rounded-xl shadow hover:bg-forest-700"
                >
                  Save Zone Rate
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

