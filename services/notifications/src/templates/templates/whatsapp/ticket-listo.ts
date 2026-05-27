export const ticketListoTemplate = {
  id: 'ticket_listo',
  whatsapp: `📊 *Ticket de balanza listo — GuayCampo*

Hola {{driverName}},

Tu ticket de balanza está completo:

🎫 N° de ticket: *{{ticketNumber}}*
⚖️ Peso neto: *{{netWeightKg}} kg*
📄 PDF: {{pdfUrl}}

_Gracias por operar con GuayCampo._`,
  pushTitle: 'Ticket listo',
  pushBody: 'Ticket N° {{ticketNumber}} — Peso neto: {{netWeightKg}} kg',
};
