export const alertaSiloTemplate = {
  id: 'alerta_silo',
  whatsapp: `⚠️ *ALERTA DE SILO — GuayCampo*

Se detectó una alerta en *{{siloName}}*:

🚨 Severidad: *{{severity}}*
📋 Detalle: {{alertMessage}}

Revisá el estado del silo a la brevedad.

_GuayCampo — Sistema de monitoreo de silos_`,
  pushTitle: '⚠️ Alerta de silo',
  pushBody: '{{siloName}}: {{alertMessage}}',
};
