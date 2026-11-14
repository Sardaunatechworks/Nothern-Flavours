import React, { useState, useEffect } from 'react';
import { X, CheckCircle, MessageSquare, AlertCircle, Loader2, MapPin } from 'lucide-react';
import { checkoutSchema } from '../../schemas/orderSchema';
import { useBasket } from '../../context/BasketContext';
import { orderService } from '../../services/orderService';
import { menuService } from '../../services/menuService';
import { formatNaira } from '../../utils/formatters';

export default function CheckoutModal({ onClose, onSuccess }) {
  const { basket, subtotal, clearBasket } = useBasket();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [orderConfirmation, setOrderConfirmation] = useState(null);

  const [baseDeliveryFee, setBaseDeliveryFee] = useState(1000);
  const [deliveryZones, setDeliveryZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    orderType: 'delivery',
    deliveryAddress: '',
    notes: '',
  });

  useEffect(() => {
    async function loadDeliveryConfig() {
      try {
        const [settings, zones] = await Promise.all([
          menuService.getRestaurantSettings(),
          menuService.getDeliveryZones(),
        ]);
        if (settings?.default_delivery_fee != null) {
          setBaseDeliveryFee(Number(settings.default_delivery_fee));
        }
        if (zones && zones.length > 0) {
          const activeZones = zones.filter((z) => z.is_active);
          setDeliveryZones(activeZones);
          if (activeZones.length > 0) {
            setSelectedZoneId(activeZones[0].id);
          }
        }
      } catch (e) {
        console.error('Error loading delivery settings', e);
      }
    }

    loadDeliveryConfig();
  }, []);

  const selectedZone = deliveryZones.find((z) => z.id === selectedZoneId);
  const deliveryFee =
    formData.orderType === 'delivery'
      ? selectedZone
        ? Number(selectedZone.delivery_fee)
        : baseDeliveryFee
      : 0;

  const grandTotal = subtotal + deliveryFee;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    setFieldErrors({});

    // Zod validation
    const validation = checkoutSchema.safeParse(formData);
    if (!validation.success) {
      const errors = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0]] = err.message;
        }
      });
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    const fullAddress =
      formData.orderType === 'delivery' && selectedZone
        ? `[Zone: ${selectedZone.name}] ${formData.deliveryAddress}`
        : formData.deliveryAddress;

    try {
      const result = await orderService.submitCustomerOrder({
        fullName: formData.fullName,
        phone: formData.phone,
        orderType: formData.orderType,
        deliveryAddress: fullAddress,
        notes: formData.notes,
        items: basket,
      });

      const whatsappUrl = orderService.buildWhatsAppUrl({
        orderNumber: result.order_number,
        fullName: formData.fullName,
        phone: formData.phone,
        orderType: formData.orderType,
        deliveryAddress: fullAddress,
        notes: formData.notes,
        items: basket,
        subtotal: result.subtotal || subtotal,
        deliveryFee: result.delivery_fee || deliveryFee,
        total: result.total || grandTotal,
      });

      clearBasket();

      setOrderConfirmation({
        orderNumber: result.order_number,
        whatsappUrl,
        customerName: formData.fullName,
        total: result.total || grandTotal,
      });
    } catch (err) {
      setServerError(err.message || 'Unable to place order. Please check stock or try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-200 overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-5 bg-forest-800 text-cream-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-bold">
              {orderConfirmation ? 'Order Received' : 'Complete Your Order'}
            </h3>
            <p className="text-[11px] text-gold-400">Northern Flavours Restaurant · Dutse</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-cream-200 hover:text-white hover:bg-forest-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {orderConfirmation ? (
            /* Confirmation View */
            <div className="text-center space-y-6 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase font-extrabold tracking-widest text-gold-600">
                  ORDER PLACED SUCCESSFULLY
                </span>
                <h4 className="font-serif text-2xl font-bold text-forest-950">
                  {orderConfirmation.orderNumber}
                </h4>
                <p className="text-xs text-stone-600 max-w-sm mx-auto leading-relaxed">
                  Thank you, <span className="font-semibold">{orderConfirmation.customerName}</span>! Your order has been recorded in our system. Tap below to send your order details directly to our staff on WhatsApp for confirmation.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-cream-100 border border-stone-200 text-left space-y-2">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Order Reference:</span>
                  <span className="font-mono font-bold text-forest-950">{orderConfirmation.orderNumber}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Total Amount:</span>
                  <span className="font-bold text-forest-900">{formatNaira(orderConfirmation.total)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Status:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                    Pending Staff Confirmation
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <a
                  href={orderConfirmation.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onSuccess}
                  className="w-full inline-flex items-center justify-center gap-2.5 py-3.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-98"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Order via WhatsApp</span>
                </a>

                <button
                  onClick={onSuccess}
                  className="w-full py-2.5 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Form View */
            <form onSubmit={handleSubmit} className="space-y-5">
              {serverError && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </div>
              )}

              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="e.g. Fatima Mohammed"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                {fieldErrors.fullName && (
                  <p className="text-[11px] text-red-500">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g. 09068202567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
                {fieldErrors.phone && (
                  <p className="text-[11px] text-red-500">{fieldErrors.phone}</p>
                )}
              </div>

              {/* Order Type: Delivery / Pickup */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-700">Order Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.orderType === 'delivery'
                        ? 'border-forest-800 bg-forest-50/60 text-forest-900 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderType"
                      value="delivery"
                      checked={formData.orderType === 'delivery'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-xs">
                      🚗 Delivery (+{formatNaira(deliveryFee)})
                    </span>
                  </label>

                  <label
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                      formData.orderType === 'pickup'
                        ? 'border-forest-800 bg-forest-50/60 text-forest-900 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="orderType"
                      value="pickup"
                      checked={formData.orderType === 'pickup'}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-xs">🛍️ Pickup (Free)</span>
                  </label>
                </div>
              </div>

              {/* Delivery Zone Selection (if delivery) */}
              {formData.orderType === 'delivery' && deliveryZones.length > 0 && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Delivery Neighbourhood / Area <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-bold text-forest-950 focus:outline-none focus:ring-2 focus:ring-forest-800 bg-white"
                  >
                    {deliveryZones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {formatNaira(z.delivery_fee)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Delivery Address (only if delivery) */}
              {formData.orderType === 'delivery' && (
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-stone-700">
                    Delivery Address in Dutse <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    name="deliveryAddress"
                    value={formData.deliveryAddress}
                    onChange={handleChange}
                    placeholder="House number, street name, landmark in Dutse..."
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                  />
                  {fieldErrors.deliveryAddress && (
                    <p className="text-[11px] text-red-500">{fieldErrors.deliveryAddress}</p>
                  )}
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-stone-700">
                  Special Instructions / Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="e.g. Extra spicy, separate sauce, etc."
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-forest-800"
                />
              </div>

              {/* Summary line */}
              <div className="p-4 rounded-xl bg-cream-100 border border-stone-200 space-y-1">
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Subtotal</span>
                  <span>{formatNaira(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs text-stone-600">
                  <span>Delivery Fee</span>
                  <span>{formatNaira(deliveryFee)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-forest-950 pt-1 border-t border-stone-300">
                  <span>Total Amount</span>
                  <span>{formatNaira(grandTotal)}</span>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gold-400" />
                    <span>Processing Order...</span>
                  </>
                ) : (
                  <span>Place Order</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
