import PDFDocument from 'pdfkit';
import fs from 'fs';

const doc = new PDFDocument({ margin: 60, size: 'A4' });
const stream = fs.createWriteStream('TP-Finanzas-Personales.pdf');
doc.pipe(stream);

const M = 60;
const W = 495;
const accent = '#1e40af';

function header(text) {
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').fontSize(13).fillColor(accent).text(text, { underline: false });
  doc.moveDown(0.3);
}

function p(text) {
  doc.font('Helvetica').fontSize(10).fillColor('#1f2937').text(text, { align: 'justify' });
  doc.moveDown(0.2);
}

function separator() {
  doc.strokeColor('#cbd5e1').lineWidth(0.5).moveTo(M, doc.y).lineTo(M + W, doc.y).stroke();
  doc.moveDown(0.6);
}

// ===== PORTADA =====
doc.moveDown(3);
doc.font('Helvetica-Bold').fontSize(22).fillColor('#111827').text('Gestor de Finanzas Personales', { align: 'center' });
doc.font('Helvetica-Bold').fontSize(16).fillColor(accent).text('con Asistente Inteligente', { align: 'center' });
doc.moveDown(1.5);
doc.strokeColor(accent).lineWidth(2).moveTo(180, doc.y).lineTo(430, doc.y).stroke();
doc.moveDown(1.5);
doc.font('Helvetica').fontSize(11).fillColor('#4b5563').text('Trabajo Práctico Integrador', { align: 'center' });
doc.font('Helvetica').fontSize(10).fillColor('#6b7280').text('AI Engineering - Julio 2026', { align: 'center' });
doc.moveDown(3);

// ===== 1. TEMA =====
header('1. Tema del Proyecto');
p('Se desarrollará un sistema web completo para la gestión de finanzas personales que permitirá a los usuarios registrar y categorizar ingresos y gastos, definir presupuestos mensuales, establecer metas de ahorro, visualizar su evolución financiera mediante gráficos, y consultar un asistente inteligente basado en LangChain + Ollama para obtener recomendaciones y análisis personalizados.');

separator();

// ===== 2. CASOS DE USO =====
header('2. Casos de Uso');

const casos = [
  ['1', 'Registro y autenticación', 'Crear cuenta e iniciar sesión mediante JWT'],
  ['2', 'Agregar transacción', 'Registrar ingresos y gastos con categoría, monto, fecha y descripción'],
  ['3', 'CRUD de categorías', 'Gestionar categorías personalizadas con nombre, tipo y color'],
  ['4', 'Dashboard con gráficos', 'Visualizar balance, gastos por categoría y evolución mensual'],
  ['5', 'Presupuesto mensual', 'Definir límites de gasto por categoría con barra de progreso'],
  ['6', 'Metas de ahorro', 'Crear objetivos de ahorro con depósitos y seguimiento porcentual'],
  ['7', 'Alertas automáticas', 'Notificar cuando un presupuesto se excede o alcanza el 80%'],
  ['8', 'Búsqueda y filtros', 'Filtrar transacciones por tipo, categoría, fechas y texto'],
  ['9', 'Exportación CSV', 'Descargar transacciones filtradas como archivo CSV'],
  ['10', 'Chatbot asesor', 'Consultar al asistente IA sobre finanzas personales con memoria conversacional'],
];

let y0 = doc.y;
doc.rect(M, y0, W, 18).fill(accent);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5);
doc.text('#', M + 8, y0 + 4, { width: 25 });
doc.text('Caso de Uso', M + 38, y0 + 4, { width: 150 });
doc.text('Descripción', M + 195, y0 + 4, { width: 300 });
doc.moveDown(1.4);

casos.forEach((r, i) => {
  const ry = doc.y;
  const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(M, ry - 2, W, 22).fill(bg);
  doc.fillColor('#111827').font('Helvetica').fontSize(9);
  doc.text(r[0], M + 8, ry + 1, { width: 25 });
  doc.font('Helvetica-Bold').text(r[1], M + 38, ry + 1, { width: 150 });
  doc.font('Helvetica').text(r[2], M + 195, ry + 1, { width: 300 });
  doc.moveDown(0.85);
});

separator();

// ===== 3. STACK TECNOLÓGICO =====
header('3. Stack Tecnológico');

const stack = [
  ['Frontend', 'React 18, Vite, Tailwind CSS, Recharts'],
  ['Backend', 'Node.js, Express'],
  ['Base de Datos', 'SQLite (better-sqlite3)'],
  ['Autenticación', 'JWT, bcryptjs'],
  ['Chatbot', 'LangChain, Ollama (llama3.2)'],
  ['MCP', 'Filesystem Server, Database Server'],
];

y0 = doc.y;
doc.rect(M, y0, W, 18).fill(accent);
doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9.5);
doc.text('Capa', M + 10, y0 + 4, { width: 120 });
doc.text('Tecnologías', M + 160, y0 + 4, { width: 280 });
doc.moveDown(1.4);

stack.forEach((r, i) => {
  const ry = doc.y;
  const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
  doc.rect(M, ry - 2, W, 20).fill(bg);
  doc.fillColor('#111827').font('Helvetica-Bold').fontSize(9.5);
  doc.text(r[0], M + 10, ry + 1, { width: 120 });
  doc.font('Helvetica').text(r[1], M + 160, ry + 1, { width: 280 });
  doc.moveDown(0.8);
});

separator();

// ===== 4. INTEGRANTE =====
header('4. Integrante');

doc.moveDown(0.3);
doc.font('Helvetica-Bold').fontSize(10.5).fillColor('#374151');
doc.text('Apellido y Nombre:', { continued: true });
doc.font('Helvetica').fillColor('#111827');
doc.text('  Bogado Leon, Ramiro Enzo');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').fillColor('#374151');
doc.text('Mail:', { continued: true });
doc.font('Helvetica').fillColor('#111827');
doc.text('  federama2@gmail.com');
doc.moveDown(0.5);

doc.font('Helvetica-Bold').fillColor('#374151');
doc.text('Usuario de GitHub:', { continued: true });
doc.font('Helvetica').fillColor('#111827');
doc.text('  RamiroBogado');

// ===== FOOTER =====
doc.moveDown(4);
doc.strokeColor('#e5e7eb').lineWidth(0.5).moveTo(M, doc.y).lineTo(M + W, doc.y).stroke();
doc.moveDown(0.4);
doc.fontSize(8).fillColor('#9ca3af').font('Helvetica').text('AI Engineering - Trabajo Práctico Integrador - 2026', { align: 'center' });

doc.end();

stream.on('finish', () => {
  console.log('PDF generado: TP-Finanzas-Personales.pdf');
});
