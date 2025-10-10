import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface PDFExportOptions {
  title: string;
  subtitle?: string;
  data: any[];
  columns: { header: string; dataKey: string; width?: number }[];
  summary?: { label: string; value: string }[];
  generatedBy?: string;
  fileName: string;
  orientation?: 'portrait' | 'landscape';
  tableWidthPercent?: number;
}

export function exportToPDF(options: PDFExportOptions) {
  const { title, subtitle, data, columns, summary, generatedBy, fileName, orientation = 'portrait', tableWidthPercent = 0.98 } = options;
  
  const doc = new jsPDF({
    orientation: orientation,
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.width;
  const margin = 14;
  let yPosition = margin;

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  if (subtitle) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 15;
  }

  // Date generated
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  const now = new Date();
  doc.text(
    `Generado el: ${format(now, 'dd/MM/yyyy HH:mm', { locale: es })}`,
    pageWidth - margin,
    yPosition,
    { align: 'right' }
  );
  yPosition += 10;

  if (generatedBy) {
    doc.text(`Por: ${generatedBy}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;
  } else {
    yPosition += 10;
  }

  // Summary section
  if (summary && summary.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen', margin, yPosition);
    yPosition += 10;

    summary.forEach((item) => {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(item.label, margin, yPosition);
      doc.setFont('helvetica', 'bold');
      doc.text(item.value, pageWidth - margin, yPosition, { align: 'right' });
      yPosition += 8;
    });
    yPosition += 10;
  }

  // Table
  const tableColumns = columns.map(col => ({
    header: col.header,
    dataKey: col.dataKey,
    width: col.width
  }));

  // Calculate table width based on percentage
  const availableWidth = pageWidth - (margin * 2);
  const tableWidth = availableWidth * tableWidthPercent;

  autoTable(doc, {
    startY: yPosition,
    head: [tableColumns.map(col => col.header)],
    body: data.map(row => 
      tableColumns.map(col => {
        const value = row[col.dataKey];
        // Format currency values
        if (col.dataKey.includes('amount') || col.dataKey.includes('total')) {
          return typeof value === 'number' ? formatCurrency(value) : value || 'N/A';
        }
        // Format dates
        if (col.dataKey.includes('date') || col.dataKey.includes('time')) {
          return value ? format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es }) : 'N/A';
        }
        return value || 'N/A';
      })
    ),
    styles: {
      fontSize: orientation === 'landscape' ? 7 : 8,
      cellPadding: 2,
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: orientation === 'landscape' ? 8 : 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [248, 248, 248],
    },
    margin: { left: margin, right: margin },
    tableWidth: tableWidth,
    columnStyles: tableColumns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      if (col.dataKey.includes('amount') || col.dataKey.includes('total')) {
        acc[index] = { ...acc[index], halign: 'right' };
      }
      return acc;
    }, {} as any),
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  // Save the PDF
  doc.save(fileName);
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(amount);
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: es });
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: es });
}