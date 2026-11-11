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
    headline: [
      "Tu marca tiene",
      "un asiento en primera fila.",
    ],
    lead: "Lleva tu mensaje a pantallas digitales a bordo de taxis. Visualiza una creatividad de ejemplo, explora tu presupuesto y descubre el proceso antes de contratar.",
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
      "¿Este presupuesto ya contrata una campaña?",
      "No. El ejemplo ayuda a preparar una idea. Las pantallas, condiciones, contenido y disponibilidad se confirman durante la revisión en el portal autorizado.",
    ],
    [
      "¿Cuántas personas verán mi anuncio?",
      "Esta demo no estima alcance. Las impresiones dependen de la metodología, la actividad y los supuestos de una campaña; no equivalen a personas únicas ni a atención individual verificada.",
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
