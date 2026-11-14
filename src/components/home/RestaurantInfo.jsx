import React from 'react';
import { MapPin, ChefHat, PhoneCall } from 'lucide-react';

export default function RestaurantInfo() {
  const cards = [
    {
      icon: MapPin,
      title: 'Visit us',
      subtitle: 'Gajambe Plaza, Yalwawa, Dutse',
      action: null,
    },
    {
      icon: ChefHat,
      title: 'Freshly prepared',
      subtitle: 'Made when you order',
      action: null,
    },
    {
      icon: PhoneCall,
      title: 'Call / WhatsApp',
      subtitle: '09068202567',
      action: 'tel:09068202567',
      isPhone: true,
    },
  ];

  return (
    <section className="pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {cards.map((card, idx) => {
            const Icon = card.icon;
            const content = (
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-stone-200/80 shadow-soft hover:shadow-md transition-shadow duration-200">
                <div className="w-12 h-12 rounded-xl bg-forest-50 border border-forest-100 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-forest-800" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs uppercase font-bold tracking-wider text-stone-600">
                    {card.title}
                  </p>
                  <p className="text-sm font-semibold text-forest-900 truncate mt-0.5">
                    {card.subtitle}
                  </p>
                </div>
              </div>
            );

            if (card.action) {
              return (
                <a
                  key={idx}
                  href={card.action}
                  className="block group transition-transform duration-200 hover:-translate-y-0.5"
                >
                  {content}
                </a>
              );
            }

            return <div key={idx}>{content}</div>;
          })}
        </div>
      </div>
    </section>
  );
}
