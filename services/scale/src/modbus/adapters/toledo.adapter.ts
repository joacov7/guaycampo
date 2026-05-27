// =============================================================================
// GuayCampo - Toledo Scale Adapter
// Compatible with: ICS465, IND256x and similar Toledo/Mettler-Toledo models
// =============================================================================
//
// Register map (Modbus holding registers):
//   0x0000-0x0001 — Weight value (Float32, Big-Endian)
//   0x0002        — Status word
//                   bit 0 = stable, bit 1 = overload, bit 2 = zero
//
// Coil map:
//   0x0001        — Tare command (momentary pulse)

import type { ScaleAdapter, ModbusClient } from './scale-adapter.interface';

export class ToledoAdapter implements ScaleAdapter {
  async readWeight(client: ModbusClient, _config: Record<string, unknown>): Promise<number> {
    const data = await client.readHoldingRegisters(0x0000, 2);
    const buf = Buffer.allocUnsafe(4);
    buf.writeUInt16BE(data.data[0] ?? 0, 0);
    buf.writeUInt16BE(data.data[1] ?? 0, 2);
    return parseFloat(buf.readFloatBE(0).toFixed(1));
  }

  async isStable(client: ModbusClient, _config: Record<string, unknown>): Promise<boolean> {
    const status = await client.readHoldingRegisters(0x0002, 1);
    return ((status.data[0] ?? 0) & 0x01) === 1;
  }

  async tare(client: ModbusClient, _config: Record<string, unknown>): Promise<void> {
    await client.writeCoil(0x0001, true);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    await client.writeCoil(0x0001, false);
  }
}
