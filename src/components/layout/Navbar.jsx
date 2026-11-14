import React from 'react';
import { ShoppingBag, Phone } from 'lucide-react';
import { useBasket } from '../../context/BasketContext';
import { Link } from 'react-router-dom';

export default function Navbar() {
  const { totalItems, setIsBasketOpen } = useBasket();

  return (
    <header className="sticky top-0 z-40 bg-forest-800 text-white shadow-md border-b border-forest-900/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand identity: Circular NF logo & title */}
        <Link to="/" className="flex items-center gap-3.5 group">
          <div className="w-12 h-12 rounded-full bg-forest-900 border-2 border-gold-500/80 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
            <span className="font-serif text-gold-500 text-xl font-bold tracking-tight">NF</span>
          </div>
          <div>
            <h1 className="font-serif text-lg sm:text-xl font-bold tracking-wider text-cream-50 uppercase">
              Northern Flavours
            </h1>
            <p className="text-[11px] font-medium tracking-widest text-gold-400 uppercase">
              Restaurant · Dutse
            </p>
          </div>
        </Link>

        {/* Right actions: Phone & Basket */}
        <div className="flex items-center gap-3 sm:gap-5">
          <a
            href="tel:09068202567"
            className="hidden md:flex items-center gap-2 text-xs font-semibold text-cream-100 hover:text-gold-400 px-3 py-2 rounded-lg bg-forest-900/60 border border-forest-700/50 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-gold-400" />
            <span>09068202567</span>
          </a>

          <button
            onClick={() => setIsBasketOpen(true)}
            className="relative flex items-center gap-2.5 bg-gold-500 hover:bg-gold-600 text-forest-950 font-semibold px-4 py-2.5 rounded-full shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-95"
            aria-label="View shopping basket"
          >
            <ShoppingBag className="w-4 h-4 text-forest-950" />
            <span className="text-xs sm:text-sm font-bold tracking-wide">My Basket</span>
            {totalItems > 0 && (
              <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-extrabold bg-forest-950 text-gold-400 rounded-full">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

