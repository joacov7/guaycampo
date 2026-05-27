// =============================================================================
// GuayCampo - Generic Configurable Scale Adapter
// =============================================================================
//
// Configuration keys (device.config JSONB):
// {
//   "weightRegister": 0,        — Starting holding register address
//   "weightLength": 2,          — Number of registers to read
//   "encoding": "float32_be" | "float32_le" | "int32_be" | "int32_le" | "bcd",
//   "multiplier": 1.0,          — Scale factor applied to raw value
//   "offset": 0,                — Additive offset applied after multiplier
//   "stableRegister": 2,        — Status register address (optional)
//   "stableBit": 0,             — Bit index in status register for stability flag
//   "tareCoil": 1               — Coil address to pulse for tare (optional)
// }

import type { ScaleAdapter, ModbusClient } from './scale-adapter.interface';

interface GenericConfig {
  weightRegister?: number;
  weightLength?: number;
  encoding?: 'float32_be' | 'float32_le' | 'int32_be' | 'int32_le' | 'bcd';
  multiplier?: number;
  offset?: number;
  stableRegister?: number;
  stableBit?: number;
  tareCoil?: number;
}

export class GenericAdapter implements ScaleAdapter {
  async readWeight(client: ModbusClient, config: Record<string, unknown>): Promise<number> {
    const cfg = config as GenericConfig;
    const reg = cfg.weightRegister ?? 0;
    const len = cfg.weightLength ?? 2;
    const encoding = cfg.encoding ?? 'float32_be';
    const multiplier = cfg.multiplier ?? 1.0;
    const offset = cfg.offset ?? 0;

    const data = await client.readHoldingRegisters(reg, len);
    const raw = this.decodeRegisters(data.data, encoding);
    return parseFloat(((raw * multiplier) + offset).toFixed(1));
  }

  async isStable(client: ModbusClient, config: Record<string, unknown>): Promise<boolean> {
    const cfg = config as GenericConfig;
    if (cfg.stableRegister === undefined) {
      // No stability register configured — assume stable
      return true;
    }
    const status = await client.readHoldingRegisters(cfg.stableRegister, 1);
    const bit = cfg.stableBit ?? 0;
    return ((status.data[0] ?? 0) >> bit & 0x01) === 1;
  }

  async tare(client: ModbusClient, config: Record<string, unknown>): Promise<void> {
    const cfg = config as GenericConfig;
    const coil = cfg.tareCoil ?? 1;
    await client.writeCoil(coil, true);
    await new Promise<void>((resolve) => setTimeout(resolve, 500));
    await client.writeCoil(coil, false);
  }

  private decodeRegisters(registers: number[], encoding: string): number {
    const buf = Buffer.allocUnsafe(4);

    switch (encoding) {
      case 'float32_be':
        buf.writeUInt16BE(registers[0] ?? 0, 0);
        buf.writeUInt16BE(registers[1] ?? 0, 2);
        return buf.readFloatBE(0);

      case 'float32_le':
        buf.writeUInt16LE(registers[0] ?? 0, 0);
        buf.writeUInt16LE(registers[1] ?? 0, 2);
        return buf.readFloatLE(0);

      case 'int32_be':
        buf.writeUInt16BE(registers[0] ?? 0, 0);
        buf.writeUInt16BE(registers[1] ?? 0, 2);
        return buf.readInt32BE(0);

      case 'int32_le':
        buf.writeUInt16LE(registers[0] ?? 0, 0);
        buf.writeUInt16LE(registers[1] ?? 0, 2);
        return buf.readInt32LE(0);

      case 'bcd': {
        // BCD: each nibble is a decimal digit (0-9)
        // registers[0] = high word, registers[1] = low word
        const high = registers[0] ?? 0;
        const low = registers[1] ?? 0;
        const bcdStr =
          this.bcdNibble(high >> 12) +
          this.bcdNibble((high >> 8) & 0xf) +
          this.bcdNibble((high >> 4) & 0xf) +
          this.bcdNibble(high & 0xf) +
          this.bcdNibble(low >> 12) +
          this.bcdNibble((low >> 8) & 0xf) +
          this.bcdNibble((low >> 4) & 0xf) +
          this.bcdNibble(low & 0xf);
        return parseInt(bcdStr, 10);
      }

      default:
        buf.writeUInt16BE(registers[0] ?? 0, 0);
        buf.writeUInt16BE(registers[1] ?? 0, 2);
        return buf.readFloatBE(0);
    }
  }

  private bcdNibble(nibble: number): string {
    return String(nibble & 0xf);
  }
}
