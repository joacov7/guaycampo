export const posicionColaTemplate = {
  id: 'posicion_cola',
  whatsapp: `🚛 *Ingreso registrado — GuayCampo*

Hola {{driverName}},

Tu camión *{{plate}}* fue registrado en planta.

📍 Posición en cola: *#{{position}}*
⏱ Tiempo estimado de espera: *{{estimatedWaitMin}} minutos*

Permanecé en la zona de estacionamiento asignada.
_Te avisaremos cuando sea tu turno en la báscula._

_GuayCampo — Sistema de gestión de plantas de cereales_`,
  pushTitle: 'Ingreso registrado',
  pushBody: 'Posición #{{position}} en cola — espera estimada {{estimatedWaitMin}} min',
};
