export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  DEBTOR = 'DEBTOR', // Triggers HTTP 402 logic
  SUSPENDED = 'SUSPENDED'
}

export class SubscriptionModule {
  /**
   * Decides if a simulated driver should fail with HTTP 402.
   * Based on the errorRate defined in the UI.
   */
  static shouldTriggerDebtorMode(rate: number): boolean {
    return Math.random() < rate;
  }

  /**
   * Logic to handle the API response.
   * If the API returns 402, the simulator must stop activity for that specific driver.
   */
  static handleApiResponse(status: number): { stopActivity: boolean, message: string } {
    if (status === 402) {
      return { 
        stopActivity: true, 
        message: 'Payment Required: Driver subscription expired or missing. Halting simulation for this node.' 
      };
    }
    return { stopActivity: false, message: 'OK' };
  }
}
