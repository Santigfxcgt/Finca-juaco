import { GoogleGenAI } from '@google/genai';

let aiInstance: GoogleGenAI | null = null;

function getAI(): GoogleGenAI | null {
  if (!aiInstance && process.env.GEMINI_API_KEY) {
    aiInstance = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

export interface ChatHistoryItem {
  sender: 'bot' | 'user';
  text: string;
}

export async function generateAgrotourismAdvice(
  userQuery: string,
  history?: ChatHistoryItem[],
  guestContext?: any
): Promise<{ text: string; thoughtProcess?: string }> {
  const ai = getAI();

  const systemInstruction = `Eres Don Joaquín "Don Juaco" Restrepo, el cálido, respetuoso y sabio anfitrión de la "Finca La Colmena de Don Juaco" en Montenegro, Quindío (Eje Cafetero de Colombia).

PERSONALIDAD Y ESTILO:
- Hablas con auténtica calidez campesina colombiana, amabilidad sincera y orgullo por tu tierra cafetera.
- Usas expresiones respetuosas y cercanas como "amigo/a", "qué bendición saludarte", "con el mayor de los gustos", "un buen tintico recién tostado".
- Tus respuestas TIENEN PLENO SENTIDO, son claras, coherentes, bien redactadas y van directo al punto solicitado.
- MEMORIA CONVERSACIONAL ACTIVA: Recuerda SIEMPRE lo que el usuario te haya dicho antes en la conversación (su nombre, nombres de acompañantes, mascotas, fechas de viaje, número de personas, gustos y preguntas previas). Mantén el hilo conductor natural del diálogo.

INFORMACIÓN OFICIAL Y PRECISA DE FINCA LA COLMENA:
1. HABITACIONES (7 Cabañas Campestres organizadas por capacidad):
   • Habitación Doble (para 2 personas): 1 Cama Doble matrimonial, baño privado con agua caliente, TV por cable, ventilador y WiFi.
   • Habitaciones Triples (para 3 personas: Madera Colonial, Cabecero Tallado, Colonial Cafetera, Campestre Quindío): 1 Cama Doble + 1 Cama Sencilla, baño privado con agua caliente, TV, ventilador y WiFi.
   • Habitaciones Cuádruples (para 4 personas: Suite Ladrillo y Madera, Habitación Familiar): 2 Camas dobles o 1 doble + 2 sencillas, baño privado amplio con agua caliente, TV, ventilador y WiFi.
   • Nota: Nómbralas siempre por su capacidad o estilo (Doble, Triple, Cuádruple), no uses códigos numéricos como HAB-01.

2. TARIFAS Y DESAYUNO CAMPESINO:
   • Temporada Regular (baja): $85.000 COP por noche.
   • Temporada Alta (20 de Diciembre al 20 de Enero, Semana Santa y puentes festivos): $120.000 COP por noche.
   • 🍳 ¡EL DESAYUNO CAMPESINO ESTÁ 100% INCLUIDO en ambas temporadas sin costo adicional! Incluye huevos de campo frescos al gusto, arepa caliente, queso campesino fresco de la región, miel pura de abejas de la finca y café especial recién molido y colado.
   • Si el usuario pide cotización o cálculo para X noches o X habitaciones, haz el cálculo matemático exacto con amabilidad.

3. UBICACIÓN Y CÓMO LLEGAR:
   • Finca La Colmena, Montenegro, Quindío, Colombia.
   • A solo 5 minutos del Parque del Café en Montenegro.
   • A 15 minutos de Panaca y Quimbaya.
   • A 30 minutos de Armenia y el Aeropuerto El Edén (AXM).
   • A 55 minutos de Pereira y el Aeropuerto Matecaña (PEI).
   • Vía pavimentada y en excelente estado para cualquier automóvil o moto.
   • Parqueadero privado, cerrado, seguro y totalmente gratuito dentro de la finca.

4. EXPERIENCIAS DE LA FINCA (3 ESPACIOS):
   • 🐕 Amplia Zona Verde para Mascotas: Extensa pradera de césped natural cercada y segura para que los perros corran libremente, jueguen con la pelota y exploren con sombra de árboles nativos (Finca 100% Pet-Friendly).
   • 🎪 Zona Recreativa con Columpios para Niños: Parque infantil al aire libre con columpios tradicionales de madera, resbaladero y juegos sobre pasto suave para el disfrute sano y seguro de los niños.
   • 🏊‍♂️ Piscina Campestre con Solárium: Piscina al aire libre con aguas cristalinas, solárium con asoleadoras para tomar el sol y hermosa vista panorámica a los cafetales y montañas.

5. POLÍTICAS Y SERVICIOS:
   • Check-in: A partir de las 3:00 PM.
   • Check-out: Hasta la 1:00 PM.
   • Mascotas: 100% Pet-Friendly (se solicita traer camita y mantenerlos bajo supervisión).
   • WiFi gratuito de buena velocidad y cobertura celular 4G.
   • Reservas: Se pueden hacer en la web seleccionando fechas y cabaña, o por WhatsApp directo con Don Juaco al +57 301 567 7776.

REGLAS DE RESPUESTA:
- Si el usuario te saluda o hace una pregunta corta, responde de forma cálida, concisa y pregunta en qué más le puedes colaborar.
- Si el usuario continúa una conversación previa, responde con referencia explícita a lo que venían hablando.
- Si el usuario quiere reservar, guíalo indicándole que en la página principal puede seleccionar fechas y hacer clic en 'Reservar' o escribir al WhatsApp +57 301 567 7776.`;

  if (ai) {
    // Model candidate list prioritizing the most stable and fast models
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

    // Construct valid multi-turn contents
    const formattedContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    if (history && Array.isArray(history) && history.length > 0) {
      // Filter and format historical turns
      for (const item of history) {
        if (!item.text || !item.text.trim()) continue;
        // Skip default greeting if it's at the very beginning to ensure the first turn is 'user'
        if (formattedContents.length === 0 && item.sender === 'bot') continue;

        const role = item.sender === 'user' ? 'user' : 'model';
        
        // Avoid consecutive turns with identical roles by concatenating text
        if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
          formattedContents[formattedContents.length - 1].parts[0].text += `\n${item.text.trim()}`;
        } else {
          formattedContents.push({
            role,
            parts: [{ text: item.text.trim() }]
          });
        }
      }
    }

    // Add current user query
    if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === 'user') {
      formattedContents[formattedContents.length - 1].parts[0].text += `\n${userQuery.trim()}`;
    } else {
      formattedContents.push({
        role: 'user',
        parts: [{ text: userQuery.trim() }]
      });
    }

    for (const modelName of candidateModels) {
      try {
        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: formattedContents,
          config: {
            systemInstruction,
            temperature: 0.6,
          },
        });

        // 12 seconds timeout to allow thorough reasoning without hanging
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI request timeout')), 12000)
        );

        const response = await Promise.race([generatePromise, timeoutPromise]);

        if (response && response.text && response.text.trim().length > 0) {
          return {
            text: response.text.trim(),
          };
        }
      } catch (err: any) {
        // Try next candidate model on temporary unavailability or timeout
        continue;
      }
    }
  }

  // ========================================================
  // SMART CONTEXTUAL RESPONDER (Real, accurate fallback with memory)
  // ========================================================
  const q = userQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Check if history contains previous context (e.g. mention of pets, dates, prices)
  const allHistoryText = (history || []).map(h => h.text.toLowerCase()).join(' ');

  if (q.includes('precio') || q.includes('tarifa') || q.includes('costo') || q.includes('cuanto vale') || q.includes('cuanto cuesta') || q.includes('valor')) {
    return {
      text: `¡Con mucho gusto te informo nuestras tarifas oficiales!\n\n` +
        `En Finca La Colmena manejamos tarifas por noche con desayuno incluido:\n` +
        `• 🌿 **Temporada Regular:** $85.000 COP por noche.\n` +
        `• ☀️ **Temporada Alta (20 Dic - 20 Ene, festivos y Semana Santa):** $120.000 COP por noche.\n\n` +
        `🍳 **¡El desayuno campesino está 100% INCLUIDO en ambas temporadas!** Todas las habitaciones cuentan con TV por cable, ventilador, baño privado con agua caliente y WiFi.\n\n` +
        `¿Para qué fechas tienes planeado tu viaje para verificar disponibilidad?`
    };
  }

  if (q.includes('desayuno') || q.includes('comida') || q.includes('restaurante') || q.includes('almuerzo') || q.includes('cena') || q.includes('alimentacion')) {
    return {
      text: `¡El desayuno campesino es uno de los mayores deleites de la finca!\n\n` +
        `Viene **incluido sin costo adicional** en tu estadía y lo servimos bien calientito con:\n` +
        `• Huevos frescos de campo al gusto (pericos, revueltos o fritos).\n` +
        `• Arepa recién asada de choclo o campesina.\n` +
        `• Queso campesino fresco de la región.\n` +
        `• Miel pura cosechada en nuestras propias colmenas.\n` +
        `• Café especial de la finca recién molido y colado.\n\n` +
        `Para almuerzos y cenas, preparamos platos típicos por encargo previo o puedes visitar excelentes restaurantes típicos en Quimbaya a solo 8 minutos.`
    };
  }

  if (q.includes('habitacion') || q.includes('cabana') || q.includes('camas') || q.includes('cuantas personas') || q.includes('capacidad') || q.includes('alojamiento') || q.includes('suite')) {
    return {
      text: `¡Nuestras 7 habitaciones campestres están listas para recibirte con total comodidad!\n\n` +
        `• **Habitación Doble (2 personas):** Cama doble matrimonial, baño privado con agua caliente, TV y WiFi.\n` +
        `• **Habitaciones Triples (3 personas):** 1 Cama doble + 1 cama sencilla, baño privado con agua caliente, TV y WiFi.\n` +
        `• **Habitaciones Cuádruples (4 personas):** 2 Camas dobles o 1 doble + 2 sencillas, baño privado amplio, TV y WiFi.\n\n` +
        `Todas tienen vista a la naturaleza, agua caliente y desayuno campesino incluido ($85.000 regular / $120.000 alta).`
    };
  }

  if (q.includes('donde') || q.includes('ubicacion') || q.includes('llegar') || q.includes('direccion') || q.includes('panaca') || q.includes('parque del cafe') || q.includes('quimbaya') || q.includes('aeropuerto')) {
    return {
      text: `Estamos ubicados en un punto estratégico y muy tranquilo:\n\n` +
        `📍 **Ubicación:** Vereda Kerman, Quimbaya, Quindío, Colombia.\n\n` +
        `⏱ **Tiempos de llegada:**\n` +
        `• A solo 8-10 minutos del centro urbano de Quimbaya.\n` +
        `• A 10 minutos de PANACA.\n` +
        `• A 25 minutos del Parque del Café (Montenegro).\n` +
        `• A 45 minutos del Aeropuerto El Edén de Armenia (AXM).\n` +
        `• A 55 minutos del Aeropuerto Matecaña de Pereira (PEI).\n\n` +
        `🚗 **Acceso:** Vía pavimentada apta para cualquier vehículo particular, campero o moto. Contamos con parqueadero privado, cerrado y vigilado gratuito.`
    };
  }

  if (q.includes('experiencia') || q.includes('piscina') || q.includes('nino') || q.includes('niño') || q.includes('columpio') || q.includes('parque') || q.includes('zona verde') || q.includes('actividad')) {
    return {
      text: `¡En Finca La Colmena disfrutarás de 3 espacios al aire libre diseñados para toda la familia! 🌿✨\n\n` +
        `🐕 **1. Amplia Zona Verde para Mascotas:** Pradera natural segura y cercada para que tus peluditos jueguen y corran en libertad (100% Pet-Friendly).\n\n` +
        `🎪 **2. Zona Recreativa con Columpios para Niños:** Parque infantil al aire libre con columpios tradicionales de madera, resbaladero y juegos sobre césped suave.\n\n` +
        `🏊‍♂️ **3. Piscina Campestre & Solárium:** Aguas cristalinas, asoleadoras para relajarse y hermosa vista a las montañas cafeteras.`
    };
  }

  if (q.includes('mascota') || q.includes('perro') || q.includes('gato') || q.includes('pet friendly') || q.includes('animal') || allHistoryText.includes('perro') || allHistoryText.includes('mascota')) {
    return {
      text: `¡Por supuesto! En Finca La Colmena **somos 100% Pet-Friendly** 🐾.\n\n` +
        `Tus peluditos son más que bienvenidos. Contamos con una amplia pradera verde cercada y segura donde pueden correr y jugar sin riesgos viales. Solo te pedimos traer su camita y mantenerlos bajo supervisión responsable.`
    };
  }

  if (q.includes('reserva') || q.includes('apartar') || q.includes('disponibilidad') || q.includes('fechas') || q.includes('como reservo')) {
    return {
      text: `¡Hacer tu reserva es muy fácil y seguro!\n\n` +
        `1. En la página principal, elige tus fechas de llegada y salida junto con el número de personas.\n` +
        `2. Selecciona la cabaña que más te guste y haz clic en **'Reservar'**.\n` +
        `3. Completa tus datos y podrás confirmar por transferencia (Bancolombia, Nequi, Daviplata) o coordinar el pago.\n\n` +
        `También puedes escribirme directamente al WhatsApp +57 301 567 7776 y con gusto te colaboro personalmente.`
    };
  }

  if (q.includes('check in') || q.includes('check out') || q.includes('checkin') || q.includes('checkout') || q.includes('horario') || q.includes('hora')) {
    return {
      text: `Nuestros horarios son:\n\n` +
        `⏰ **Check-In:** A partir de las 3:00 PM.\n` +
        `⏰ **Check-Out:** Hasta la 1:00 PM del día de salida.\n\n` +
        `Si llegas antes, con gusto puedes dejar tu equipaje en custodia y disfrutar de la piscina, zonas verdes o salir a conocer PANACA.`
    };
  }

  // Conversational response referencing user query
  return {
    text: `¡Qué bendición saludarte! Con gusto te oriento sobre "${userQuery}":\n\n` +
      `En Finca La Colmena te ofrecemos descanso campestre en Quimbaya con 7 habitaciones ($85.000 regular / $120.000 alta), desayuno campesino incluido, piscina, parque infantil con columpios y amplia zona verde para mascotas.\n\n` +
      `¿Te gustaría consultar disponibilidad de fechas, tarifas o detalles de cómo llegar? ¡Dime y con el mayor de los gustos te atiendo!`
  };
}
