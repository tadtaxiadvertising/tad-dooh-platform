import { LegalLayout, LegalSection, LegalList, LegalHighlight } from '@tad/ui';

export default function AvisoLegal() {
  return (
    <LegalLayout
      title="Aviso Legal"
      subtitle="Información legal y corporativa de TAD Taxi Advertising S.R.L."
      lastUpdated="2026-09-05"
      lastUpdatedDisplay="5 de septiembre de 2026"
      basePath=""
    >
      <LegalSection id="identificacion" title="1. Identificación del titular">
        <p>
          En cumplimiento con el deber de información general establecido en la <strong>Ley No. 126-02</strong>{' '}
          sobre Comercio Electrónico, Documentos y Firmas Digitales de República Dominicana y demás
          normativa aplicable, se pone a disposición del Usuario la siguiente información del titular
          del sitio web y responsable de la Plataforma:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Denominación social:</LegalHighlight> TAD Taxi Advertising S.R.L.</>,
            <><LegalHighlight>Nombre comercial:</LegalHighlight> TAD DOOH Platform</>,
            <><LegalHighlight>Forma jurídica:</LegalHighlight> Sociedad de Responsabilidad Limitada (S.R.L.)</>,
            <><LegalHighlight>Registro Mercantil (RNC):</LegalHighlight> [Tu-RNC] — Registrada en la Cámara de Comercio y Producción de Santo Domingo.</>,
            <><LegalHighlight>Domicilio social:</LegalHighlight> Av. [Tu-Dirección], Santo Domingo, Distrito Nacional, República Dominicana.</>,
            <><LegalHighlight>Dirección de correo electrónico:</LegalHighlight> <a href="mailto:legal@tad.do">legal@tad.do</a></>,
            <><LegalHighlight>Teléfono de contacto:</LegalHighlight> +1 (809) XXX-XXXX</>,
            <><LegalHighlight>Sitio web:</LegalHighlight> <a href="https://proyecto-ia-tad-advertiser.rewvid.easypanel.host">proyecto-ia-tad-advertiser.rewvid.easypanel.host</a></>,
          ]}
        />
      </LegalSection>

      <LegalSection id="actividad" title="2. Actividad y objeto social">
        <p>
          TAD Taxi Advertising S.R.L. es una empresa dedicada a la operación de una red de publicidad
          digital out-of-home (DOOH) mediante pantallas digitales instaladas en vehículos de transporte
          público y comercial en República Dominicana.
        </p>
        <p>Sus servicios principales incluyen:</p>
        <LegalList
          items={[
            'Venta de espacios publicitarios en la red de pantallas digitales.',
            'Gestión de campañas publicitarias para anunciantes.',
            'Reclutamiento y gestión de operadores (conductores) de vehículos.',
            'Producción de contenido publicitario (opcional, tercerizado).',
            'Analítica y reportes de impacto publicitario.',
            'Desarrollo de tecnología publicitaria (plataforma TAD DOOH).',
          ]}
        />
        <p>
          TAD opera bajo los códigos de actividad económica <strong>CAEV 7310</strong> (Publicidad)
          y <strong>CAEV 6201</strong> (Programación informática) según la clasificación de la DGII.
        </p>
      </LegalSection>

      <LegalSection id="registro" title="3. Registro y autorizaciones">
        <p>La empresa cuenta con las siguientes inscripciones y autorizaciones:</p>
        <LegalList
          items={[
            <><LegalHighlight>Registro Nacional de Contribuyentes (RNC):</LegalHighlight> [Tu-RNC].</>,
            <><LegalHighlight>Registro Mercantil:</LegalHighlight> [Tu-Número-Mercantil] en la Cámara de Comercio y Producción de Santo Domingo.</>,
            <><LegalHighlight>Licencia de operación:</LegalHighlight> conforme a las regulaciones municipales y nacionales aplicables.</>,
            <><LegalHighlight>Inscripción de publicidad exterior:</LegalHighlight> ante las autoridades competentes (DIGESETT, ayuntamientos) para la operación de pantallas en vehículos.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="regulacion" title="4. Marco regulatorio aplicable">
        <p>La actividad de TAD se rige por, entre otras, las siguientes normas:</p>
        <LegalList
          items={[
            <><LegalHighlight>Ley No. 479-08</LegalHighlight> sobre Sociedades Comerciales y Empresas Individuales de Responsabilidad Limitada de República Dominicana.</>,
            <><LegalHighlight>Ley No. 172-13</LegalHighlight> sobre Protección de Datos Personales.</>,
            <><LegalHighlight>Ley No. 126-02</LegalHighlight> sobre Comercio Electrónico, Documentos y Firmas Digitales.</>,
            <><LegalHighlight>Ley No. 358-05</LegalHighlight> de Protección al Consumidor (Pro Consumidor).</>,
            <><LegalHighlight>Ley No. 11-92</LegalHighlight> que aprueba el Código Tributario.</>,
            <><LegalHighlight>Ley No. 42-01</LegalHighlight> General de Salud y sus reglamentos sobre publicidad.</>,
            <><LegalHighlight>Reglamentos y resoluciones del INDOTEL</LegalHighlight> sobre telecomunicaciones y servicios digitales.</>,
            <><LegalHighlight>Normativa municipal de Santo Domingo</LegalHighlight> sobre publicidad exterior y señalización.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="propiedad-intelectual" title="5. Propiedad intelectual e industrial">
        <h3>5.1. Marcas registradas</h3>
        <p>
          Los siguientes signos distintivos son propiedad de TAD Taxi Advertising S.R.L. y están
          protegidos por las leyes de propiedad industrial de República Dominicana y tratados
          internacionales:
        </p>
        <LegalList
          items={[
            'La marca "TAD" y su logotipo.',
            'La marca "TAD DOOH" y su logotipo.',
            'El eslogan "Potencia tu marca".',
            'Cualquier otra marca, nombre comercial o signo distintivo utilizado en la Plataforma.',
          ]}
        />
        <h3>5.2. Derechos de autor</h3>
        <p>
          Todos los contenidos de la Plataforma (textos, gráficos, logotipos, iconos, imágenes,
          videos, software, código fuente) son propiedad de TAD o de sus licenciantes y están
          protegidos por las leyes de derechos de autor.
        </p>
        <p>
          Queda prohibida la reproducción, distribución, comunicación pública, transformación o
          cualquier otra forma de explotación sin autorización previa y por escrito de TAD.
        </p>
      </LegalSection>

      <LegalSection id="publicidad" title="6. Normativa publicitaria">
        <p>
          La publicidad difundida a través de la red TAD DOOH cumple con:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Reglamentos de la DIGESETT</LegalHighlight> y autoridades de tránsito sobre publicidad en vehículos.</>,
            <><LegalHighlight>Regulaciones de Pro Consumidor</LegalHighlight> sobre publicidad engañosa y protección al consumidor.</>,
            <><LegalHighlight>Restricciones a publicidad de:</LegalHighlight> tabaco, alcohol, armas de fuego, productos farmacéuticos que requieren receta, servicios financieros no regulados, entre otros.</>,
            <><LegalHighlight>Normas de la Cámara de Comercio de Santo Domingo</LegalHighlight> sobre prácticas publicitarias éticas.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="limitacion-responsabilidad" title="7. Limitación de responsabilidad">
        <p>
          TAD no será responsable por:
        </p>
        <LegalList
          items={[
            'Daños derivados de la imposibilidad de acceso a la Plataforma o interrupciones del servicio.',
            'Daños causados por virus, malware o cualquier otro elemento dañino en los contenidos.',
            'Errores u omisiones en los contenidos publicitarios proporcionados por los anunciantes.',
            'Opiniones, comentarios o acciones de terceros a través de la Plataforma.',
            'Daños derivados del uso indebido de la Plataforma por parte de los Usuarios.',
          ]}
        />
        <p>
          Para información más detallada sobre la responsabilidad de TAD, consulta los{' '}
          <a href="/terminos-de-servicio">Términos de Servicio</a>.
        </p>
      </LegalSection>

      <LegalSection id="enlaces" title="8. Enlaces a sitios de terceros">
        <p>
          La Plataforma puede contener enlaces a sitios web de terceros (redes sociales, sitios de
          anunciantes, mapas, etc.). TAD no se hace responsable del contenido, las políticas de
          privacidad o las prácticas de estos sitios externos.
        </p>
        <p>
          La inclusión de un enlace no implica aprobación, patrocinio o afiliación con el sitio
          enlazado. Te recomendamos leer las políticas de privacidad y los términos de cada sitio
          de terceros que visites.
        </p>
      </LegalSection>

      <LegalSection id="resolucion-disputas" title="9. Resolución alternativa de disputas">
        <p>
          Conforme al <strong>Artículo 110 de la Ley No. 358-05</strong> (Pro Consumidor), informamos
          a los Usuarios que pueden someter cualquier disputa o queja ante:
        </p>
        <LegalList
          items={[
            <><LegalHighlight>Pro Consumidor (PROCONSUMIDOR):</LegalHighlight> <a href="https://proconsumidor.gob.do" target="_blank" rel="noopener noreferrer">proconsumidor.gob.do</a> — Tel: 809-472-2731.</>,
            <><LegalHighlight>Centro de Mediación y Arbitraje de la Cámara de Comercio de Santo Domingo:</LegalHighlight> para disputas comerciales.</>,
            <><LegalHighlight>Dirección de Protección de Datos Personales (DPD):</LegalHighlight> para temas de privacidad.</>,
          ]}
        />
      </LegalSection>

      <LegalSection id="responsabilidad-contenido" title="10. Responsabilidad sobre los contenidos">
        <p>
          TAD se compromete a:
        </p>
        <LegalList
          items={[
            'No publicar contenido ilegal, difamatorio o que vulnere derechos de terceros.',
            'Eliminar cualquier contenido que viole la ley o estos términos tras ser notificado.',
            'Cooperar con autoridades en la investigación de actividades ilícitas.',
          ]}
        />
        <p>
          Los anunciantes son los únicos responsables del contenido que publican en la red TAD DOOH,
          incluyendo su conformidad con las leyes publicitarias aplicables.
        </p>
      </LegalSection>

      <LegalSection id="modificaciones" title="11. Modificaciones del aviso legal">
        <p>
          TAD se reserva el derecho de modificar este aviso legal para reflejar cambios legales,
          regulatorios o de la actividad de la empresa. Los cambios materiales serán notificados
          a través de la Plataforma.
        </p>
      </LegalSection>

      <LegalSection id="idioma" title="12. Idioma aplicable">
        <p>
          Este aviso legal está redactado en español. En caso de traducciones a otros idiomas, la
          versión en español prevalecerá en caso de discrepancia.
        </p>
      </LegalSection>

      <LegalSection id="contacto" title="13. Contacto legal">
        <p>Para cualquier asunto legal o comunicación oficial:</p>
        <LegalList
          items={[
            <><LegalHighlight>Departamento Legal:</LegalHighlight> <a href="mailto:legal@tad.do">legal@tad.do</a></>,
            <><LegalHighlight>Protección de Datos Personales (DPO):</LegalHighlight> <a href="mailto:privacidad@tad.do">privacidad@tad.do</a></>,
            <><LegalHighlight>Notificaciones judiciales:</LegalHighlight> <a href="mailto:notificaciones@tad.do">notificaciones@tad.do</a></>,
            <><LegalHighlight>Dirección postal:</LegalHighlight> TAD Taxi Advertising S.R.L., Av. [Tu-Dirección], Santo Domingo, Distrito Nacional, República Dominicana.</>,
            <><LegalHighlight>Teléfono:</LegalHighlight> +1 (809) XXX-XXXX, extensión "Departamento Legal".</>,
            <><LegalHighlight>Horario de atención legal:</LegalHighlight> Lunes a Viernes, 9:00 - 17:00 (AST, UTC-4).</>,
          ]}
        />
      </LegalSection>
    </LegalLayout>
  );
}
