/**
 * Datos de FAQ para la app. Basado en faq-data.ts de la web.
 */

export const FAQ_PATIENTS = [
  {
    question: '¿Cómo agendo mi primera cita?',
    answer:
      'Entra a Explorar o busca al profesional que te interese. Elige el servicio, la fecha y el horario disponible. Completa el pago con tarjeta de crédito o débito de forma segura (Stripe). Recibirás un email de confirmación y el ticket con los datos de la cita. Si es en línea, el enlace de videollamada aparecerá en el email y en Mis citas.',
  },
  {
    question: '¿Cómo cancelo o reprogramo una cita?',
    answer:
      'En la app ve a Mis citas, localiza la cita y usa la opción «Cancelar» o «Reprogramar». Es importante que canceles o reprogrames con al menos 24 horas de anticipación para evitar cargos según la política del profesional. Si solo cancelas, la cita queda anulada; si reprogramas, podrás elegir otro horario disponible.',
  },
  {
    question: '¿Hay reembolsos si cancelo o no asisto?',
    answer:
      'No hay reembolsos una vez confirmado el pago. Si cancelas con más de 24 horas de anticipación, el profesional puede evaluar excepciones según su criterio. Si no te presentas a la cita, no aplica reembolso. Para casos especiales (por ejemplo, el profesional no se presentó), puedes enviar una solicitud desde el centro de ayuda web y la revisamos en 24–48 h hábiles.',
  },
  {
    question: 'No me llegó el enlace de la videollamada, ¿qué hago?',
    answer:
      'Revisa tu bandeja de spam o correo no deseado. En la app, entra a Mis citas, abre la cita y revisa si aparece el enlace de reunión en los detalles. Si sigue sin aparecer, usa «Enviar solicitud» en el centro de ayuda web e indica el nombre del profesional, fecha y hora de la cita.',
  },
];

export const FAQ_PROFESSIONALS = [
  {
    question: '¿Cuánto cobra Holistia de comisión por mis citas y servicios?',
    answer:
      'En consultas (citas): Holistia retiene un 15% del monto que cobras; el 85% es para ti. En eventos pagados la comisión es del 20%. En programas digitales y retos también es 15%. La inscripción como profesional se paga una vez y no tiene comisión por transacción. Sobre cada pago, Stripe aplica además su tarifa (aprox. 3.6% + $3 MXN + IVA).',
  },
  {
    question: '¿Cómo funcionan las cancelaciones por parte del paciente?',
    answer:
      'El paciente debe cancelar con al menos 24 horas de anticipación. Si cancela después, puedes aplicar tu política. Si el paciente no se presenta, puedes marcar la cita como «Paciente no asistió» desde el detalle de la cita; en ese caso no aplica reembolso.',
  },
  {
    question: '¿Cómo y cuándo recibo el dinero de mis consultas?',
    answer:
      'Los pagos se procesan con Stripe Connect. El dinero se cobra en el momento de la reserva; Stripe envía a tu cuenta conectada según su calendario (normalmente 2–7 días hábiles). En Finanzas puedes ver el detalle de cada transacción y el monto neto que te corresponde.',
  },
  {
    question: '¿Puedo dar reembolsos a un paciente?',
    answer:
      'Sí. Si canceló con más de 24 h de anticipación o hay un acuerdo entre ustedes, puedes gestionar un reembolso desde tu cuenta de Stripe. Cualquier devolución se coordina entre tú, el paciente y, si aplica, soporte de Holistia.',
  },
];
