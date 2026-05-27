export const bienvenidaEmailTemplate = {
  id: 'bienvenida_email',
  subject: 'Bienvenido a GuayCampo — {{tenantName}}',
  html: `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Bienvenido a GuayCampo</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: #1a5276; padding: 20px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">GuayCampo</h1>
    <p style="color: #aed6f1; margin: 5px 0 0 0;">Sistema de gestión de plantas de cereales</p>
  </div>
  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; border: 1px solid #dee2e6;">
    <h2 style="color: #1a5276;">¡Bienvenido/a, {{userName}}!</h2>
    <p>Tu cuenta fue creada exitosamente en <strong>{{tenantName}}</strong>.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <tr style="background: #eaf2ff;">
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Usuario</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">{{email}}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #dee2e6;"><strong>Rol</strong></td>
        <td style="padding: 10px; border: 1px solid #dee2e6;">{{role}}</td>
      </tr>
    </table>
    <p>Podés acceder al sistema desde:</p>
    <p><a href="{{appUrl}}" style="background: #1a5276; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Ingresar a GuayCampo</a></p>
    <p style="color: #6c757d; font-size: 12px; margin-top: 30px;">
      Este es un mensaje automático generado por GuayCampo. No responda a este correo.
    </p>
  </div>
</body>
</html>`,
};
