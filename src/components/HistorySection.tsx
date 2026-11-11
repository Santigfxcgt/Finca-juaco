import React from 'react';

export function HistorySection() {
  return (
    <section id="nuestra-historia" className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 scroll-mt-24">
      <div className="bg-white rounded-3xl border border-[#D7C7B2]/80 p-8 sm:p-14 shadow-xs">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 pb-8 border-b border-[#D7C7B2]/50">
          <span className="text-2xs sm:text-xs font-bold uppercase tracking-widest text-[#1B4332]">
            Montenegro, Quindío • Desde 2020
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2C1E16] tracking-tight mt-2 mb-3">
            Nuestra Historia
          </h2>
          <p className="text-xs sm:text-sm text-[#6D5A4B] leading-relaxed">
            La esencia, hospitalidad y tradición que dan vida a La Colmena de Don Juaco.
          </p>
        </div>

        {/* Central Narrative Text */}
        <div className="max-w-2xl mx-auto space-y-6 text-[#4A3B32] text-sm sm:text-base leading-relaxed text-justify">
          <p>
            La Colmena de Don Juaco nació en el año 2020, en el corazón de Montenegro, Quindío, con el propósito de ofrecer a nuestros visitantes un espacio acogedor donde pudieran descansar, disfrutar y vivir la esencia de nuestra región.
          </p>
          
          <p>
            Desde nuestros inicios, hemos trabajado para brindar una experiencia basada en la hospitalidad, la tranquilidad y la atención cercana, haciendo que cada huésped se sienta como en casa. Nuestra ubicación nos permite conectar a nuestros visitantes con la belleza natural, la cultura y los diferentes atractivos turísticos que hacen del Quindío un destino especial.
          </p>
          
          <p>
            A lo largo de estos años, hemos crecido junto a nuestros huéspedes, aprendiendo de cada experiencia y manteniendo siempre el compromiso de ofrecer un servicio de calidad. Cada habitación, cada espacio y cada detalle de La Colmena de Don Juaco refleja nuestra intención de crear momentos agradables y recuerdos que perduren.
          </p>
          
          <p>
            Hoy continuamos construyendo nuestra historia, recibiendo a viajeros de diferentes lugares y llevando con orgullo el nombre de Montenegro y el Quindío.
          </p>

          {/* Central Highlight Quote */}
          <div className="my-8 p-6 rounded-2xl bg-[#FAF6F0] border border-[#D7C7B2] text-center">
            <p className="font-serif italic font-bold text-[#1B4332] text-base sm:text-lg">
              “Bienvenidos a La Colmena de Don Juaco, un lugar para descansar, disfrutar y sentirse como en casa.”
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}
