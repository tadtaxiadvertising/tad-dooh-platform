# Referral Loop - Blueprint de Implementación

## A. Resumen Arquitectónico
El "Referral Loop" automatiza el pago de RD$500 a la billetera (Wallet) de un Conductor cuando un Anunciante que fue captado mediante su Código QR (Referral) paga su primera campaña publicitaria (estado "ACTIVE").

Actualmente, existe un problema crítico en `finance.service.ts` donde la nómina suma recursivamente la bonificación por referidos cada mes, independientemente de si el anunciante activó campañas o si ya se le pagó por él previamente. 

**Solución Arquitectónica:**
1. **Captura del Lead:** `AdvertisersController` y `AdvertisersService` deben aceptar el `referralCode` durante el registro, resolver el `driverId` y guardarlo en el campo `referredBy` de la tabla `Advertiser`.
2. **Trigger del Bono (Pago Instantáneo):** En `CampaignService.updateCampaign`, cuando una campaña cambie su estado a `ACTIVE`, se verificará si el anunciante dueño tiene un `referredBy` y si es su **primera campaña activa**. De ser afirmativo, se crea automáticamente un registro `Commission` de tipo `ADVERTISER_SALE` con estado `APPROVED/PAID`, se genera un `FinancialTransaction` para el Ledger y se incrementa el saldo en la tabla `Wallet` (o `walletBalance` del chofer) en RD$500.
3. **Saneamiento Financiero:** Se removerá el cálculo recursivo ciego de referidos de anunciantes dentro de `FinanceService.calculateMonthlyPayroll` para evitar el fraude o pago múltiple por un mismo anunciante.

---

## B. Prerrequisitos e Impacto
- **Dependencias a instalar:** Ninguna (No aplica).
- **Cambios en `schema.prisma`:** Ninguno requerido. Se utilizará el modelo `Commission` existente y el campo `referredBy` del `Advertiser`.
- **Archivos colaterales afectados:** `finance.service.ts` (Core nómina) sufrirá cambios para descontar los RD$500 fijos de bono mensual y leer solo de las comisiones o transacciones reales.

---

## C. Archivos a Crear / Modificar (Paso a Paso Milimétrico)

### 1. `apps/api/src/modules/advertisers/advertisers.controller.ts`
**Acción:** REEMPLAZAR BLOQUE en método `create`.
**Código Exacto:**
```typescript
  @Public()
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post()
  async create(@Body() body: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    password?: string;
    referralCode?: string; // NUEVO
  }) {
    if (!body.companyName || !body.contactName || !body.email) {
      throw new BadRequestException('companyName, contactName, and email are required');
    }
    return this.advertisersService.create(body);
  }
```

### 2. `apps/api/src/modules/advertisers/advertisers.service.ts`
**Acción:** REEMPLAZAR BLOQUE en método `create`.
**Código Exacto:**
```typescript
  async create(data: {
    companyName: string;
    contactName: string;
    email: string;
    phone?: string;
    password?: string;
    referralCode?: string; // NUEVO
  }) {
    let hashedPassword: string | null = null;
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    let referredByDriverId: string | null = null;
    if (data.referralCode) {
      const driver = await this.prisma.driver.findUnique({
        where: { referralCode: data.referralCode },
        select: { id: true }
      });
      if (driver) {
        referredByDriverId = driver.id;
        this.logger.log(`🔗 Advertiser ${data.companyName} referred by Driver ${driver.id}`);
      }
    }

    return this.prisma.advertiser.create({
      data: {
        companyName: data.companyName,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        password: hashedPassword,
        status: BUSINESS_RULES.STATUS.ADVERTISER.INITIAL,
        referredBy: referredByDriverId // NUEVO - Enlace de Referido
      },
    });
  }
```

### 3. `apps/api/src/modules/campaign/campaign.service.ts`
**Acción:** REEMPLAZAR BLOQUE en método `updateCampaign` al verificar activación.
**Código Exacto:** Buscar `if (campaign.status === 'ACTIVE') {` y reemplazar el bloque para incorporar el Referral Loop.
```typescript
    if (campaign.status === 'ACTIVE') {
      await this.prisma.refreshActiveCampaignsView();
      this.supabaseService.broadcastEvent('fleet_sync', 'WAKE_UP_CALL', {
        reason: 'campaign_updated',
        campaignId: id
      }).catch(() => {});

      // --- INICIO: REFERRAL LOOP V12 ---
      try {
        const adv = await this.prisma.advertiser.findUnique({
          where: { id: campaign.advertiserId },
          select: { referredBy: true, _count: { select: { campaigns: { where: { status: 'ACTIVE' } } } } }
        });

        // Solo pagar si es la primera campaña que se vuelve ACTIVE y fue referido por alguien
        if (adv && adv.referredBy && adv._count.campaigns === 1) {
          const driverId = adv.referredBy;
          
          // Prevenir pagos duplicados verificando si ya existe comisión para este anunciante
          const existingComm = await this.prisma.commission.findFirst({
            where: { driverId, sourceType: 'ADVERTISER_SALE' } 
          });

          // Idealmente se debería vincular el advertiserId en Commission, pero como es MVP, si no existe o lo guardamos en 'sourceType' basta
          if (!existingComm) {
            this.logger.log(`💸 [REFERRAL_LOOP] Triggering referral bonus for Driver ${driverId} (Advertiser ${adv.referredBy} activated 1st campaign)`);
            
            // 1. Crear la Comisión
            await this.prisma.commission.create({
              data: {
                driverId,
                amount: BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
                sourceType: 'ADVERTISER_SALE',
                status: 'APPROVED',
              }
            });

            // 2. Transacción en el Ledger Financiero
            await this.prisma.financialTransaction.create({
              data: {
                type: 'OUTGOING',
                category: 'OPEX_COMMISSION',
                amount: BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
                netAmount: BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD,
                taxAmount: 0,
                entityId: driverId,
                reference: `REF-BONUS-${campaign.id.substring(0,8)}`,
                note: `Bono de Referido por 1ra campaña activa de anunciante asociado.`,
                status: 'COMPLETED'
              }
            });

            // 3. Acreditar a la Wallet Real del Driver
            await this.prisma.wallet.upsert({
              where: { driverId },
              update: { availableBalance: { increment: BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD } },
              create: { driverId, availableBalance: BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD }
            });
          }
        }
      } catch(err) {
        this.logger.error(`❌ [REFERRAL_LOOP] Failed to process referral payout: ${err.message}`);
      }
      // --- FIN: REFERRAL LOOP V12 ---
    }
```

### 4. `apps/api/src/modules/finance/finance.service.ts`
**Acción:** REEMPLAZAR BLOQUE en método `calculateMonthlyPayroll`.
**Objetivo:** Remover el multiplicador fijo de referidos que genera pago doble continuo.
**Código Exacto:**
```typescript
        // Calculate referral commissions (Legacy drivers onboarding)
        const referrals = driver.referrals ? driver.referrals.length : 0;
        const driverReferralBonus = referrals * BUSINESS_RULES.DRIVER_REFERRAL_BONUS_RD;

        // --- FIX V12: Removed recursive blind advertiser referral payments ---
        // Los bonos de anunciantes ahora se abonan directo a la Wallet en el Referral Loop (CampaignService)
        // en tiempo real como 'OPEX_COMMISSION'. Ya no suman al sueldo base recurrente.
        const advertiserReferralBonus = 0; 
```

---

## D. Plan de Reversión (Rollback)
Si la inserción en la Wallet causa inconsistencias durante el proceso en el Easypanel VPS:
1. Revertir el bloque de código en `campaign.service.ts` a su estado original (sin el bloque `REFERRAL LOOP V12`).
2. Revertir el ajuste de `finance.service.ts` si se determina que la contabilidad manual requiere retener el método antiguo (restaurar la línea `const advertiserReferralBonus = advertiserReferrals * BUSINESS_RULES.ADVERTISER_REFERRAL_BONUS_RD;`).
3. Ejecutar comando en consola de DB para purgar transacciones corruptas: `DELETE FROM commissions WHERE source_type='ADVERTISER_SALE';`
