export class InventoryModule {
  private static readonly MAX_SLOTS = 15;

  /**
   * Validates if a tablet configuration respects the 15-slot limitation.
   */
  static validateSlotInventory(activeAds: number): { valid: boolean; remaining: number } {
    const remaining = this.MAX_SLOTS - activeAds;
    return {
      valid: activeAds <= this.MAX_SLOTS,
      remaining: Math.max(0, remaining)
    };
  }

  /**
   * Simulates the rotation within those slots.
   */
  static getRandomSlotAllocation(campaignCount: number): number[] {
    // Distributes 15 slots among available campaigns
    const slots = new Array(this.MAX_SLOTS).fill(0);
    return slots.map(() => Math.floor(Math.random() * campaignCount));
  }
}
