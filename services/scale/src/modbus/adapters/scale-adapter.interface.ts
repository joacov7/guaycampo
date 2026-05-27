// =============================================================================
// GuayCampo - Scale Adapter Interface
// =============================================================================

export interface ScaleAdapter {
  readWeight(client: ModbusClient, config: Record<string, unknown>): Promise<number>;
  isStable(client: ModbusClient, config: Record<string, unknown>): Promise<boolean>;
  tare(client: ModbusClient, config: Record<string, unknown>): Promise<void>;
}

// Minimal interface to avoid direct modbus-serial dependency in the interface file
export interface ModbusClient {
  readHoldingRegisters(address: number, length: number): Promise<{ data: number[] }>;
  writeCoil(address: number, value: boolean): Promise<void>;
  setID(id: number): void;
}
