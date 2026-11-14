import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useBasket } from '../../context/BasketContext';
import { formatNaira } from '../../utils/formatters';
import CheckoutModal from '../checkout/CheckoutModal';

export default function BasketDrawer() {
  const {
    basket,
    removeFromBasket,
    updateQuantity,
    subtotal,
    totalItems,
    isBasketOpen,
    setIsBasketOpen,
  } = useBasket();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  if (!isBasketOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm transition-opacity"
          onClick={() => setIsBasketOpen(false)}
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
            {/* Header */}
            <div className="px-6 py-5 bg-forest-800 text-cream-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-gold-400" />
                <h2 className="font-serif text-lg font-bold">Your Basket</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-forest-900 text-gold-400">
                  {totalItems}
                </span>
              </div>
              <button
                onClick={() => setIsBasketOpen(false)}
                className="p-1 rounded-full text-cream-200 hover:text-white hover:bg-forest-700 transition-colors"
                aria-label="Close basket"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content / Items list */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {basket.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-forest-50 border border-forest-100 flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-forest-700" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-serif text-lg font-bold text-forest-950">
                      Your basket is empty
                    </h3>
                    <p className="text-xs text-stone-500 max-w-xs">
                      Discover our Northern menu, freshly prepared snacks, and chilled drinks.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsBasketOpen(false)}
                    className="mt-2 px-5 py-2 rounded-full bg-forest-800 text-gold-400 text-xs font-bold shadow hover:bg-forest-700 transition-colors"
                  >
                    Explore Menu
                  </button>
                </div>
              ) : (
                basket.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 p-3.5 rounded-xl border border-stone-200/80 bg-cream-50/50 hover:bg-cream-50 transition-colors"
                  >
                    <img
                      src={item.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'}
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-bold text-forest-950 truncate">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromBasket(item.id)}
                          className="text-stone-400 hover:text-red-500 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="text-xs text-stone-500">
                        {formatNaira(item.price)} each
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {/* Quantity controls */}
                        <div className="flex items-center border border-stone-200 rounded-full bg-white shadow-2xl">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="p-1 hover:text-forest-800 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold text-forest-950">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="p-1 hover:text-forest-800 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="font-serif text-sm font-bold text-forest-900">
                          {formatNaira(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer with subtotal & checkout CTA */}
            {basket.length > 0 && (
              <div className="p-6 bg-cream-100 border-t border-stone-200 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-stone-600">
                    <span>Subtotal</span>
                    <span className="font-semibold text-stone-800">{formatNaira(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-stone-500">
                    <span>Delivery fee</span>
                    <span className="italic">Calculated at checkout</span>
                  </div>
                  <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                    <span className="font-serif text-base font-bold text-forest-950">Total</span>
                    <span className="font-serif text-xl font-extrabold text-forest-900">
                      {formatNaira(subtotal)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 active:scale-98"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <CheckoutModal
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={() => {
            setIsCheckoutOpen(false);
            setIsBasketOpen(false);
          }}
        />
      )}
    </>
  );
}

