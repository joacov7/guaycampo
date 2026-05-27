// =============================================================================
// GuayCampo - Mettler-Toledo Scale Adapter
// Compatible with: ICS4xx, IND2xx, IND5xx series
// =============================================================================
//
// Register map (Modbus holding registers):
//   0x0000-0x0001 — Net weight (Float32, Little-Endian — note LE vs Toledo BE)
//   0x0002-0x0003 — Gross weight (Float32, Little-Endian)
//   0x0004        — Status word
//                   bit 0 = stable, bit 1 = motion, bit 2 = overrange,
//                   bit 3 = underrange, bit 4 = zero
//
// Coil map:
//   0x0000        — Tare command

import type { ScaleAdapter, ModbusClient } from './scale-adapter.interface';

export class MettlerAdapter implements ScaleAdapter {
  async readWeight(client: ModbusClient, _config: Record<string, unknown>): Promise<number> {
    // Mettler uses Little-Endian float
    const data = await client.readHoldingRegisters(0x0000, 2);
    const buf = Buffer.allocUnsafe(4);
    // LE: low word first
    buf.writeUInt16LE(data.data[0] ?? 0, 0);
    buf.writeUInt16LE(data.data[1] ?? 0, 2);
    return parseFloat(buf.readFloatLE(0).toFixed(1));
  }

  async isStable(client: ModbusClient, _config: Record<string, unknown>): Promise<boolean> {
    const status = await client.readHoldingRegisters(0x0004, 1);
    // bit 0 = stable, bit 1 = motion — stable only if stable=1 and motion=0
    const word = status.data[0] ?? 0;
    return (word & 0x01) === 1 && (word & 0x02) === 0;
  }

  async tare(client: ModbusClient, _config: Record<string, unknown>): Promise<void> {
    await client.writeCoil(0x0000, true);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    await client.writeCoil(0x0000, false);
  }
}
