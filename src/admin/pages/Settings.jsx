import React, { useState, useEffect } from 'react';
import { menuService } from '../../services/menuService';
import { supabase, isSupabaseConfigured } from '../../services/supabase';
import { Settings as SettingsIcon, Save, Store, Truck, Clock, Package } from 'lucide-react';
import Swal from 'sweetalert2';

export default function Settings() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await menuService.getRestaurantSettings();
        setSettings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const updated = {
      restaurant_name: formData.get('restaurant_name'),
      phone: formData.get('phone'),
      whatsapp_number: formData.get('whatsapp_number'),
      address: formData.get('address'),
      default_delivery_fee: parseFloat(formData.get('default_delivery_fee') || '1000'),
      accepting_orders: formData.get('accepting_orders') === 'on',
      delivery_enabled: formData.get('delivery_enabled') === 'on',
      pickup_enabled: formData.get('pickup_enabled') === 'on',
      // Section 4 Takeaway Packaging settings
      takeaway_packaging_enabled: formData.get('takeaway_packaging_enabled') === 'on',
      takeaway_packaging_model: formData.get('takeaway_packaging_model') || 'order',
      takeaway_packaging_fee: parseFloat(formData.get('takeaway_packaging_fee') || '500'),
    };

    try {
      if (isSupabaseConfigured && supabase && settings?.id) {
        await supabase
          .from('restaurant_settings')
          .update(updated)
          .eq('id', settings.id);
      }

      setSettings({ ...settings, ...updated });
      Swal.fire({
        title: 'Settings Saved',
        text: 'Restaurant configuration updated successfully.',
        icon: 'success',
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire('Error', err.message, 'error');
    }
  };

  if (loading) {
    return <div className="py-16 text-center text-xs text-stone-400">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold text-forest-950">
          Restaurant Settings
        </h1>
        <p className="text-xs text-stone-500">
          Configure operating status, takeaway packaging charges, delivery fees, and restaurant contact information
        </p>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* Operations Switch Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <label className="p-4 bg-white rounded-2xl border border-stone-200 shadow-soft flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-bold text-forest-950">Accepting Orders</p>
              <p className="text-[10px] text-stone-500">Store open for customer orders</p>
            </div>
            <input
              type="checkbox"
              name="accepting_orders"
              defaultChecked={settings.accepting_orders}
              className="w-5 h-5 accent-forest-800 rounded cursor-pointer"
            />
          </label>

          <label className="p-4 bg-white rounded-2xl border border-stone-200 shadow-soft flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-bold text-forest-950">Delivery Orders</p>
              <p className="text-[10px] text-stone-500">Enable doorstep delivery</p>
            </div>
            <input
              type="checkbox"
              name="delivery_enabled"
              defaultChecked={settings.delivery_enabled}
              className="w-5 h-5 accent-forest-800 rounded cursor-pointer"
            />
          </label>

          <label className="p-4 bg-white rounded-2xl border border-stone-200 shadow-soft flex items-center justify-between cursor-pointer">
            <div>
              <p className="font-bold text-forest-950">Store Pickup</p>
              <p className="text-[10px] text-stone-500">Allow customer takeout</p>
            </div>
            <input
              type="checkbox"
              name="pickup_enabled"
              defaultChecked={settings.pickup_enabled}
              className="w-5 h-5 accent-forest-800 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* TAKEAWAY PACKAGING CONFIGURATION (Section 4 Requirement) */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-4">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-forest-800" />
            <div>
              <h3 className="font-serif text-base font-bold text-forest-950">
                Takeaway Packaging Configuration
              </h3>
              <p className="text-[11px] text-stone-500">
                Configure container and packaging fees automatically applied to takeaway POS orders
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div className="space-y-1">
              <label className="font-bold text-stone-700 block">Packaging Charge Status</label>
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  name="takeaway_packaging_enabled"
                  defaultChecked={settings.takeaway_packaging_enabled !== false}
                  className="w-4 h-4 accent-forest-800 rounded cursor-pointer"
                />
                <span className="text-stone-700 font-semibold">Enable Packaging Fee</span>
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700 block">Calculation Model</label>
              <select
                name="takeaway_packaging_model"
                defaultValue={settings.takeaway_packaging_model || 'order'}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800 bg-white"
              >
                <option value="order">Fixed Fee per Order</option>
                <option value="item">Fee per Food Item</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700 block">Packaging Fee Amount (₦)</label>
              <input
                type="number"
                step="50"
                min="0"
                name="takeaway_packaging_fee"
                defaultValue={settings.takeaway_packaging_fee ?? 500}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800 font-bold"
              />
            </div>
          </div>
        </div>

        {/* Business Identity Card */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-4">
          <h3 className="font-serif text-base font-bold text-forest-950">Restaurant Identity</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-stone-700">Restaurant Name</label>
              <input
                type="text"
                name="restaurant_name"
                defaultValue={settings.restaurant_name}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">Standard Delivery Fee (₦)</label>
              <input
                type="number"
                step="100"
                name="default_delivery_fee"
                defaultValue={settings.default_delivery_fee}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">Official Phone Number</label>
              <input
                type="text"
                name="phone"
                defaultValue={settings.phone}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-stone-700">WhatsApp Ordering Number (International format)</label>
              <input
                type="text"
                name="whatsapp_number"
                defaultValue={settings.whatsapp_number}
                placeholder="2349068202567"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <label className="font-bold text-stone-700">Physical Address</label>
              <input
                type="text"
                name="address"
                defaultValue={settings.address}
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-forest-800"
              />
            </div>
          </div>
        </div>

        {/* Operating Environment Information */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-soft space-y-3">
          <h3 className="font-serif text-base font-bold text-forest-950">Localization & Timezone</h3>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-stone-50 rounded-xl">
              <span className="text-stone-500">Official Currency:</span>
              <p className="font-bold text-forest-950 mt-0.5">Nigerian Naira (NGN / ₦)</p>
            </div>
            <div className="p-3 bg-stone-50 rounded-xl">
              <span className="text-stone-500">Server Timezone:</span>
              <p className="font-bold text-forest-950 mt-0.5">Africa/Lagos (UTC+1)</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-sm shadow-md transition-all active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Save Configuration Changes</span>
        </button>
      </form>
    </div>
  );
}
