import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, Home, MessageSquare } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';

export default function OrderConfirmation() {
  const { orderNumber } = useParams();

  return (
    <div className="min-h-screen flex flex-col bg-cream-100">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 py-16">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-stone-200 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle className="w-10 h-10" />
          </div>

          <div className="space-y-2">
            <span className="text-xs uppercase font-extrabold tracking-widest text-gold-600">
              ORDER CONFIRMED
            </span>
            <h2 className="font-serif text-2xl font-bold text-forest-950">
              {orderNumber || 'Order Recorded'}
            </h2>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Your order is safely recorded. Our kitchen staff in Dutse will verify ingredients and begin preparation shortly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-cream-100 border border-stone-200 text-left text-xs space-y-2 text-stone-700">
            <p>• Orders are prepared fresh upon order receipt.</p>
            <p>• For urgent inquiries or delivery questions, reach us on 09068202567.</p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={`https://wa.me/2349068202567?text=${encodeURIComponent(`Hello Northern Flavours, I am following up on order ${orderNumber}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-all"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat with Restaurant Staff</span>
            </a>

            <Link
              to="/"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-forest-800 hover:bg-forest-700 text-gold-400 font-bold text-xs shadow-md transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Menu</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

