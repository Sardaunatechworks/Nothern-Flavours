import React from 'react';
import { Plus, Star, AlertCircle } from 'lucide-react';
import { formatNaira } from '../../utils/formatters';
import { useBasket } from '../../context/BasketContext';

export default function ProductCard({ product }) {
  const { addToBasket } = useBasket();

  const isOutOfStock = product.track_stock && product.stock_quantity <= 0;
  const isOrderable = product.is_available && !isOutOfStock;

  return (
    <div className="group flex flex-col bg-white rounded-2xl border border-stone-200/90 shadow-soft hover:shadow-elevated transition-all duration-200 overflow-hidden">
      {/* Product Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
        <img
          src={product.image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges: Customer favourite & Stock status */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {product.is_favourite && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-gold-500 text-forest-950 shadow-sm">
              <Star className="w-3 h-3 fill-forest-950" />
              <span>Customer Favourite</span>
            </span>
          )}
          {!product.is_available && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-stone-900/80 text-white backdrop-blur-sm">
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span>Unavailable</span>
            </span>
          )}
          {product.is_available && isOutOfStock && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-600 text-white shadow-sm">
              <span>Sold Out</span>
            </span>
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-serif text-lg font-bold text-forest-950 group-hover:text-forest-700 transition-colors">
              {product.name}
            </h3>
          </div>

          <p className="text-xs sm:text-sm text-stone-500 line-clamp-2 leading-relaxed">
            {product.description}
          </p>
        </div>

        {/* Footer: Price & Add to basket */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-stone-600 font-medium">Price</span>
            <p className="font-serif text-lg sm:text-xl font-extrabold text-forest-900">
              {formatNaira(product.price)}
            </p>
          </div>

          <button
            onClick={() => addToBasket(product)}
            disabled={!isOrderable}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
              isOrderable
                ? 'bg-forest-800 hover:bg-forest-700 text-gold-400 shadow-sm hover:shadow active:scale-95'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>
      </div>
    </div>
  );
}
