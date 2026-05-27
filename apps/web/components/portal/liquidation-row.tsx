import Link from 'next/link';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LiquidationRowData {
  id: string;
  liquidationNumber: string;
  period: string;
  commodityName: string;
  netKg: number;
  pricePerTon: number;
  grossAmount: number;
  retentions: number;
  netAmount: number;
  status: 'pendiente' | 'pagado';
  paidAt?: string | Date;
}

interface LiquidationRowProps {
  liquidation: LiquidationRowData;
}

export function LiquidationRow({ liquidation }: LiquidationRowProps) {
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="py-3 px-3 text-gray-600 whitespace-nowrap">{liquidation.period}</td>
      <td className="py-3 px-3 font-medium text-gray-900 whitespace-nowrap">
        {liquidation.liquidationNumber}
      </td>
      <td className="py-3 px-3 text-gray-600">{liquidation.commodityName}</td>
      <td className="py-3 px-3 text-right text-gray-600 hidden sm:table-cell">
        {liquidation.netKg.toLocaleString('es-AR')} kg
      </td>
      <td className="py-3 px-3 text-right text-gray-600 hidden md:table-cell">
        ${liquidation.pricePerTon.toLocaleString('es-AR')}
      </td>
      <td className="py-3 px-3 text-right text-gray-600 hidden lg:table-cell">
        ${liquidation.grossAmount.toLocaleString('es-AR')}
      </td>
      <td className="py-3 px-3 text-right text-red-600 hidden lg:table-cell">
        -${liquidation.retentions.toLocaleString('es-AR')}
      </td>
      <td className="py-3 px-3 text-right font-bold text-gray-900">
        ${liquidation.netAmount.toLocaleString('es-AR')}
      </td>
      <td className="py-3 px-3 text-center">
        <span className={cn(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          liquidation.status === 'pagado'
            ? 'bg-green-50 text-green-700'
            : 'bg-yellow-50 text-yellow-700',
        )}>
          {liquidation.status === 'pagado' ? 'Pagado' : 'Pendiente'}
        </span>
        {liquidation.status === 'pagado' && liquidation.paidAt && (
          <span className="block text-xs text-gray-400 mt-0.5">
            {format(new Date(liquidation.paidAt), 'dd/MM/yy', { locale: es })}
          </span>
        )}
      </td>
      <td className="py-3 px-3">
        <div className="flex items-center gap-1">
          <Link
            href={`/portal/mis-liquidaciones/${liquidation.id}`}
            className="text-guay-600 hover:text-guay-700 p-1 rounded"
            title="Ver detalle"
          >
            <FileText className="w-4 h-4" />
          </Link>
          <button
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
            title="Descargar PDF"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
