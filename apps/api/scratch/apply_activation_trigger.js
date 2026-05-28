const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sqlFunction = `
CREATE OR REPLACE FUNCTION public.activate_driver_on_payment()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.category = 'SUSCRIPCION' AND NEW.amount >= 6000.00) THEN
        UPDATE public.drivers
        SET 
            status = 'OPERATIVO',
            subscription_paid = TRUE,
            subscription_end = NOW() + INTERVAL '30 days',
            onboarding_status = 'COMPLETED'
        WHERE id = NEW.entity_id;
        RAISE NOTICE 'Driver % activado exitosamente por pago de suscripción.', NEW.entity_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
`;

const sqlTrigger = `
DROP TRIGGER IF EXISTS tr_activate_driver_on_payment ON public.financial_transactions;
`;

const sqlCreateTrigger = `
CREATE TRIGGER tr_activate_driver_on_payment
AFTER INSERT ON public.financial_transactions
FOR EACH ROW
EXECUTE FUNCTION public.activate_driver_on_payment();
`;

async function main() {
  console.log('🚀 Aplicando Trigger de Activación Financiera...');
  try {
    console.log('  - Creando función...');
    await prisma.$executeRawUnsafe(sqlFunction);
    console.log('  - Eliminando trigger anterior (si existe)...');
    await prisma.$executeRawUnsafe(sqlTrigger);
    console.log('  - Creando nuevo trigger...');
    await prisma.$executeRawUnsafe(sqlCreateTrigger);
    console.log('✅ Todo aplicado exitosamente.');
  } catch (error) {
    console.error('❌ Error al aplicar el trigger:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
