import { test, expect } from '@playwright/test';

test.describe('Antigravity Offline-First & Realtime Resilience', () => {
  test('should buffer GPS data when offline and sync when online', async ({ page }) => {
    // 1. Navegar a la página de Check-in
    await page.goto('/check-in');

    // 2. Simular pérdida de conexión
    await page.context().setOffline(true);
    
    // 3. Verificar UI de Offline
    await expect(page.locator('text=SIN CONEXIÓN')).toBeVisible();

    // 4. Realizar una acción de GPS (Check-in)
    await page.click('button:has-text("Check-in")');

    // 5. Verificar que los datos se guardaron en Zustand (localStorage)
    const storage = await page.evaluate(() => localStorage.getItem('tad-tablet-storage'));
    const state = JSON.parse(storage || '{}');
    expect(state.state.gpsBuffer.length).toBeGreaterThan(0);

    // 6. Recuperar conexión
    await page.context().setOffline(false);

    // 7. Verificar que desaparece el aviso de Offline
    await expect(page.locator('text=CONECTADO')).toBeVisible();

    // 8. Verificar que el buffer se limpie tras el reintento exitoso (en un entorno real esto sucede tras el sync)
    // Nota: Esto asume que el componente dispara el sync al detectar online
    await expect(async () => {
      const updatedStorage = await page.evaluate(() => localStorage.getItem('tad-tablet-storage'));
      const updatedState = JSON.parse(updatedStorage || '{}');
      expect(updatedState.state.gpsBuffer.length).toBe(0);
    }).toPass();
  });

  test('should refresh UI automatically via Realtime channel', async ({ page, browser }) => {
    await page.goto('/fleet');
    
    // Simular un cambio en la base de datos desde otra pestaña/contexto
    const secondPage = await browser.newPage();
    await secondPage.goto('/login'); // O cualquier página para disparar un evento
    
    // Emitir un cambio manual al canal de Supabase (Simulado vía BroadcastChannel para el test)
    await page.evaluate(() => {
      const bc = new BroadcastChannel('tad_sync');
      bc.postMessage({ type: 'REFRESH_UI', table: 'units' });
    });

    // Verificar que React Query intente invalidar (Podríamos espiar las llamadas de red)
    // En Playwright podemos verificar si aparece un toast de actualización o si el loading de la tabla aparece
    await expect(page.locator('.animate-spin')).toBeVisible();
  });
});
