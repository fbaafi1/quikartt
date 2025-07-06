
'use client';

import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Order } from './types';
import { format } from 'date-fns';

// To satisfy TypeScript, since jspdf-autotable extends the jsPDF instance.
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateInvoicePdf = (order: Order) => {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('QuiKart', 14, 22);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Your one-stop shop in Ghana!', 14, 30);

  // Invoice Title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 190, 22, { align: 'right' });

  // Order Details Separator
  doc.setLineWidth(0.5);
  doc.line(14, 40, 196, 40);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Order ID:', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(order.id, 40, 48);

  doc.setFont('helvetica', 'bold');
  doc.text('Order Date:', 14, 54);
  doc.setFont('helvetica', 'normal');
  doc.text(format(new Date(order.orderDate), 'PPP'), 40, 54);

  // Customer Details
  const customerName = order.user_profiles?.name || 'Guest Customer';
  const address = order.shippingAddress;

  doc.setFont('helvetica', 'bold');
  doc.text('Bill To:', 190, 48, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(customerName, 190, 54, { align: 'right' });
  if (address) {
    doc.text(`${address.street}, ${address.city}`, 190, 60, { align: 'right' });
    doc.text(`${address.region}, ${address.country}`, 190, 66, { align: 'right' });
  }

  // Items Table
  const tableColumn = ["Item Description", "Quantity", "Unit Price", "Total"];
  const tableRows: (string | number)[][] = [];

  order.items.forEach(item => {
    const itemData = [
      item.name,
      item.quantity,
      `GH₵ ${item.price.toFixed(2)}`,
      `GH₵ ${(item.price * item.quantity).toFixed(2)}`
    ];
    tableRows.push(itemData);
  });

  doc.autoTable({
    startY: 80,
    head: [tableColumn],
    body: tableRows,
    theme: 'striped',
    headStyles: { fillColor: [255, 149, 0] }, // Primary orange color from theme
    styles: { font: 'helvetica', fontSize: 10 },
    didDrawPage: (data) => {
        // Footer for each page
        const pageCount = doc.getNumberOfPages();
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(`Page ${data.pageNumber} of ${pageCount}`, data.settings.margin.left, doc.internal.pageSize.height - 10);
        doc.text('Thank you for your purchase!', doc.internal.pageSize.width - data.settings.margin.right, doc.internal.pageSize.height - 10, { align: 'right' });
    },
  });

  const finalY = (doc as any).autoTable.previous.finalY;

  // Total
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total Amount:', 150, finalY + 15, { align: 'right' });
  doc.text(`GH₵ ${order.totalAmount.toFixed(2)}`, 190, finalY + 15, { align: 'right' });
  
  // Download the PDF
  doc.save(`Invoice-${order.id.substring(0, 8)}.pdf`);
};
