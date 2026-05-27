export const recordatorioTurnoTemplate = {
  id: 'recordatorio_turno',
  whatsapp: `⏰ *Recordatorio de turno — GuayCampo*

Hola {{driverName}},

Tenés un turno programado en *{{hoursUntil}} hora(s)*.

📅 Fecha: {{date}}
🕐 Horario: {{timeFrom}} hs
🌾 Cultivo: {{commodity}}
🔢 N° Turno: {{shiftNumber}}

_Recordá tener tu QR listo al llegar a portería._`,
  pushTitle: 'Recordatorio de turno',
  pushBody: '{{commodity}} hoy a las {{timeFrom}} hs — N° {{shiftNumber}}',
};
