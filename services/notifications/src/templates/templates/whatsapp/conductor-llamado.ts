export const conductorLlamadoTemplate = {
  id: 'conductor_llamado',
  whatsapp: `🔔 *¡ES TU TURNO!*

{{driverName}}, dirigite ahora a *{{scaleLabel}}*.

🚛 Patente: {{plate}}
⚖️ Báscula: {{scaleLabel}}
⏰ Tenés 5 minutos para presentarte.

_Si no podés presentarte, avisá al operador._`,
  pushTitle: '🔔 ¡Es tu turno!',
  pushBody: 'Dirigite a {{scaleLabel}} — Patente {{plate}}',
};
