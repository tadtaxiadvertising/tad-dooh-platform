# Regression Test Record

1. **`QrScanService.recordScan` Deduplication & Result Structure**:
   - Test verifies return object `{ scan, isDuplicate, converted }` and 24h deduplication logic.
2. **`ConversationService.findOrCreateConversation` & `addMessage`**:
   - Test verifies conversation idempotency by `threadId` and automatic `updatedAt` update.
3. **`CommissionService.createIdempotent` & `generateMonthlySettlement`**:
   - Test verifies driver existence validation and idempotency for settlement batch creation.
4. **`VerifiedMetricsService.detectAnomalies`**:
   - Test verifies detection of silent devices across active campaigns with fallback field resolution (`device_id` / `deviceId`).
