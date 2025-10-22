import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';

interface CashCutPDFOptions {
  operatorName: string;
  date: string;
  cashTotal: number;
  bookingsCount: number;
  activeCount: number;
  cancelledCount: number;
  fileName: string;
}

/**
 * Exporta un corte de caja en formato miniprinter (80mm de ancho)
 * Diseñado para impresión en impresoras térmicas de tickets
 */
export function exportToCashCutPDF(options: CashCutPDFOptions) {
  const { operatorName, date, cashTotal, bookingsCount, activeCount, cancelledCount, fileName } = options;
  
  // 80mm = 3.15 pulgadas ≈ 226 puntos @ 72 DPI
  // Usaremos 80mm de ancho para formato miniprinter estándar
  const ticketWidth = 80; // mm
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [ticketWidth, 297] // 80mm width, A4 height (will auto-adjust)
  });

  const pageWidth = doc.internal.pageSize.width;
  const margin = 5; // Márgenes reducidos para miniprinter
  let yPosition = margin;

  // Función para dibujar línea separadora
  const drawSeparator = (char: string = '=') => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    const line = char.repeat(Math.floor((pageWidth - margin * 2) / 1.5));
    doc.text(line, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 4;
  };

  // Función para texto centrado
  const centerText = (text: string, fontSize: number, style: 'normal' | 'bold' = 'normal') => {
    doc.setFont('helvetica', style);
    doc.setFontSize(fontSize);
    doc.text(text, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += fontSize * 0.4;
  };

  // Función para texto alineado (label: valor)
  const alignedText = (label: string, value: string, fontSize: number = 10) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(fontSize);
    doc.text(label, margin, yPosition);
    doc.setFont('helvetica', 'bold');
    doc.text(value, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += fontSize * 0.4;
  };

  // Encabezado
  drawSeparator('=');
  centerText('CORTE DE CAJA CDV', 14, 'bold');
  drawSeparator('=');
  yPosition += 2;

  // Información del operador y fecha
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Operador:', margin, yPosition);
  doc.setFont('helvetica', 'bold');
  const operatorLines = doc.splitTextToSize(operatorName, pageWidth - margin * 2 - 15);
  doc.text(operatorLines, margin + 15, yPosition);
  yPosition += (operatorLines.length * 4.5) + 2;

  doc.setFont('helvetica', 'normal');
  doc.text('Fecha:', margin, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(date, pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 5;

  const now = new Date();
  doc.setFont('helvetica', 'normal');
  doc.text('Hora:', margin, yPosition);
  doc.setFont('helvetica', 'bold');
  doc.text(format(now, 'HH:mm', { locale: es }), pageWidth - margin, yPosition, { align: 'right' });
  yPosition += 6;

  // Separador de sección
  drawSeparator('-');
  centerText('RESUMEN DE TRANSACCIONES', 11, 'bold');
  drawSeparator('-');
  yPosition += 3;

  // Importe en Ventanilla (destacado)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Importe en Ventanilla:', margin, yPosition);
  yPosition += 6;
  
  doc.setFontSize(16);
  const totalText = formatCurrency(cashTotal);
  doc.text(totalText, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  drawSeparator('-');
  yPosition += 2;

  // Reservaciones Cobradas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Reservaciones Cobradas:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${bookingsCount} reservas`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Reservas Activas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Reservas Activas:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${activeCount} reservas`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Reservas Canceladas
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Reservas Canceladas:', margin, yPosition);
  yPosition += 5;
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`${cancelledCount} reservas`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Pie de página
  drawSeparator('=');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text(
    `Generado: ${format(now, 'dd/MM/yyyy HH:mm', { locale: es })}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 5;
  drawSeparator('=');

  // Ajustar altura del documento al contenido
  const finalHeight = yPosition + margin;
  doc.internal.pageSize.height = finalHeight;

  // Guardar PDF
  doc.save(fileName);
}
