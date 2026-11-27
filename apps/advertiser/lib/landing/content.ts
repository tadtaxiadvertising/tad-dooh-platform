import type { LandingRole } from "./model";

export const OBJECTIVES = {
  awareness: "Dar a conocer mi marca",
  launch: "Presentar una novedad",
  local: "Conectar con mi ciudad",
} as const;
export type DemoObjective = keyof typeof OBJECTIVES;

export const ROLE_CONTENT = {
  advertiser: {
    eyebrow: "TU NEGOCIO, EN EL RECORRIDO",
    headline: ["Tu marca no espera.", "Va a su encuentro."],
    lead: "Anuncia tu negocio en pantallas dentro de taxis. Con un código QR en tu anuncio, los pasajeros interesados pueden descubrir tu promoción desde sus celulares. Simula tu inversión sin crear una cuenta.",
    heroCta: "Explorar mi campaña",
    title: "Que tu marca salga a la calle.",
    description:
      "Empieza por un objetivo, una ciudad y un presupuesto. Prueba una idea antes de entrar al proceso de revisión y planificación.",
    benefits: [
      "Presupuesto bajo tu control",
      "Contenido sujeto a revisión",
      "Actividad y estimaciones con contexto",
    ],
    cta: "Ingresar como anunciante",
    finalTitle: "Tu próxima campaña puede comenzar aquí.",
    finalCopy:
      "Accede al portal de anunciantes para revisar la creatividad, las condiciones y la disponibilidad. La simulación no reserva inventario.",
  },
  driver: {
    eyebrow: "TU RECORRIDO. OTRA POSIBILIDAD.",
    headline: ["Tú mueves la ciudad.", "Explora algo más."],
    lead: "Conoce la participación de taxistas en TAD. Prueba un ejemplo de ingresos brutos y descubre los pasos y condiciones para formar parte.",
    heroCta: "Probar mi ejemplo",
    title: "Un recorrido que puede sumar.",
    description:
      "Visualiza cómo se combinan los slots publicitarios y los eventos CPA validados. La actividad real y tu contrato determinan cada liquidación.",
    benefits: [
      "Participación sujeta a elegibilidad",
      "Actividad validada antes de liquidar",
      "Una página dedicada a ti y a tu taxi",
    ],
    cta: "Conocer TAD para taxistas",
    finalTitle: "Conoce el siguiente paso para tu taxi.",
    finalCopy:
      "Revisa beneficios, requisitos y condiciones en la página para conductores.",
  },
} satisfies Record<
  LandingRole,
  {
    eyebrow: string;
    headline: string[];
    lead: string;
    heroCta: string;
    title: string;
    description: string;
    benefits: string[];
    cta: string;
    finalTitle: string;
    finalCopy: string;
  }
>;

export const ROLE_FAQS: Record<
  LandingRole,
  readonly (readonly [string, string])[]
> = {
  advertiser: [
    [
      "¿Cuánto cuesta una pantalla y qué descuento ofrece el conductor?",
      "La tarifa base es RD$2,500 por pantalla y mes, antes de impuestos. Un código válido de conductor TAD aplica un descuento del 40 % al importe de pantallas: RD$1,500 por pantalla y mes. El código se valida en el servidor durante el registro; la producción creativa opcional se cotiza por separado.",
    ],
    [
      "¿Este presupuesto ya contrata una campaña?",
      "No. El ejemplo ayuda a preparar una idea. Las pantallas, condiciones, contenido y disponibilidad se confirman durante la revisión en el portal autorizado.",
    ],
    [
      "¿Cuántas personas verán mi anuncio?",
      "El simulador muestra un rango de impresiones estimadas según la metodología y los supuestos del modelo. No estima cuántas personas únicas verán tu anuncio ni confirma atención individual. La actividad real se interpreta en los reportes de campaña.",
    ],
    [
      "¿Cómo interactúan los pasajeros con una promoción mediante QR?",
      "Una campaña puede mostrar un código QR para que quien esté interesado lo escanee con su celular y visite una página móvil de la marca. El escaneo es voluntario; no equivale a una compra, ni se garantizan visitas o conversiones. La disponibilidad y medición se validan al configurar la campaña.",
    ],
    [
      "¿Cómo empiezo una campaña?",
      "Explora el recorrido y entra a tu portal si ya tienes una cuenta. El registro público solo se habilita cuando el flujo de identidad y aprobación esté validado.",
    ],
  ],
  driver: [
    [
      "¿La calculadora garantiza mis ingresos?",
      "No. Es un ejemplo bruto e ilustrativo. Elegibilidad, reproducciones verificadas, ventas aprobadas, ajustes y contrato determinan la liquidación real. No es una nómina ni un saldo.",
    ],
    [
      "¿Un referido pendiente cuenta como CPA?",
      "No. Este ejemplo solo representa eventos CPA validados. Un referido pendiente no es una venta aprobada. El máximo de 100 es un límite de la demo, no una regla del negocio.",
    ],
    [
      "¿Dónde conozco los requisitos para mi taxi?",
      "La página dedicada al taxista explica beneficios, proceso, requisitos y condiciones. Si ya participas, el acceso como conductor lleva a tu portal privado.",
    ],
  ],
};
