import React from 'react';
import { MapPin, Phone, MessageCircle, Clock, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-forest-950 text-cream-200 border-t border-forest-900 pt-16 pb-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-10">
        {/* Brand column */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Northern Flavours Logo"
              className="w-11 h-11 rounded-full object-cover border border-gold-500/70 shadow-sm bg-forest-900"
            />
            <div>
              <span className="font-serif text-lg font-bold text-cream-50 tracking-wider">
                NORTHERN FLAVOURS
              </span>
              <p className="text-[10px] tracking-widest text-gold-400">RESTAURANT · DUTSE</p>
            </div>
          </div>
          <p className="text-sm text-stone-300 leading-relaxed font-light">
            Bringing authentic Northern taste, savory local staples, refreshing natural drinks, and freshly made meals to your doorstep in Dutse.
          </p>
        </div>

        {/* Location & Contact */}
        <div className="space-y-3">
          <h4 className="font-serif text-base font-semibold text-gold-400 tracking-wide">
            Location & Contact
          </h4>
          <div className="flex items-start gap-2.5 text-sm text-stone-300">
            <MapPin className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
            <span>Gajambe Plaza, Yalwawa, Dutse, Jigawa State, Nigeria</span>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-stone-300">
            <Phone className="w-4 h-4 text-gold-500 shrink-0" />
            <a href="tel:09068202567" className="hover:text-gold-400 transition-colors">
              09068202567
            </a>
          </div>
          <div className="flex items-center gap-2.5 text-sm text-stone-300">
            <MessageCircle className="w-4 h-4 text-gold-500 shrink-0" />
            <a
              href="https://wa.me/2349068202567"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gold-400 transition-colors"
            >
              WhatsApp: 09068202567
            </a>
          </div>
        </div>

        {/* Opening Hours & Staff Link */}
        <div className="space-y-3">
          <h4 className="font-serif text-base font-semibold text-gold-400 tracking-wide">
            Service Hours
          </h4>
          <div className="flex items-start gap-2.5 text-sm text-stone-300">
            <Clock className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-cream-50">Monday – Sunday</p>
              <p className="text-xs text-stone-400">8:00 AM – 10:00 PM</p>
            </div>
          </div>

          <div className="pt-4 border-t border-forest-900/80">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-2 text-xs text-stone-400 hover:text-gold-400 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Staff Portal Login</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 pt-6 border-t border-forest-900 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Northern Flavours Restaurant. All rights reserved.
      </div>
    </footer>
  );
}

