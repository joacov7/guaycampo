export const turnoConfirmadoTemplate = {
  id: 'turno_confirmado',
  whatsapp: `✅ *Turno confirmado — GuayCampo*

Hola {{driverName}}, tu turno fue registrado:

📅 Fecha: {{date}}
🕐 Horario: {{timeFrom}} hs
🌾 Cultivo: {{commodity}}
🚛 Patente: {{plate}}
🔢 N° Turno: {{shiftNumber}}

Presentate con el QR en portería dentro del horario asignado.
Recibirás aviso cuando sea tu turno en la báscula.

_GuayCampo — Sistema de gestión de plantas de cereales_`,
  pushTitle: 'Turno confirmado',
  pushBody: '{{commodity}} el {{date}} a las {{timeFrom}} hs — N° {{shiftNumber}}',
};
