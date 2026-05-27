export const liquidacionEmitidaTemplate = {
  id: 'liquidacion_emitida',
  subject: 'Liquidación emitida — GuayCampo N° {{liquidacionNumber}}',
  html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Liquidación emitida</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a5276; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">GuayCampo</h1>
    <p style="color: #aed6f1; margin: 5px 0 0 0;">Sistema de gestión de plantas de cereales</p>
  </div>
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6;">
    <h2 style="color: #1a5276;">Liquidación Emitida</h2>
    <p>Estimado/a <strong>{{clientName}}</strong>,</p>
    <p>Se ha emitido la liquidación <strong>N° {{liquidacionNumber}}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #eaf2ff;">
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Fecha</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">{{date}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Cultivo</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">{{commodity}}</td>
      </tr>
      <tr style="background: #eaf2ff;">
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Cantidad (kg)</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">{{quantityKg}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Importe</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>{{amount}}</strong></td>
      </tr>
    </table>
    <p>Adjunto encontrará el PDF de la liquidación.</p>
    <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
      Este es un mensaje automático generado por GuayCampo. No responda a este correo.
    </p>
  </div>
</body>
</html>`,
};
