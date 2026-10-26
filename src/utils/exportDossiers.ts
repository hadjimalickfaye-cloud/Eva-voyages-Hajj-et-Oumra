import { jsPDF } from 'jspdf';
import { PilgrimDossier, AgencyConfig } from '../types';

interface ExportOptions {
  dossiers: PilgrimDossier[];
  agencyConfig: AgencyConfig;
  filterLabel?: string;
  maskFinancials?: boolean;
}

/**
 * Format a number as FCFA string
 */
const fmtFCFA = (val: number): string => {
  return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';
};

/**
 * 1. EXPORT TO CSV (with UTF-8 BOM for Excel compatibility)
 */
export const exportDossiersToCsv = ({ dossiers, maskFinancials }: ExportOptions): void => {
  const headers = [
    'Code Dossier',
    'Nom',
    'Prenom',
    'Sexe',
    'Telephone',
    'Email',
    'Passeport',
    'Expiration Passeport',
    'Nationalite',
    'Package',
    'Type Voyage',
    'Type Chambre',
    'Statut Dossier',
    ...(maskFinancials
      ? ['Statut Inscription']
      : [
          'Statut Paiement',
          'Montant Paye (FCFA)',
          'Montant Total (FCFA)',
          'Solde Restant (FCFA)',
        ]),
    'Groupe WhatsApp',
    'Contact Urgence',
    'Tel Urgence',
    'Date Inscription',
  ];

  const rows = dossiers.map((d) => {
    const payStatus =
      d.payment.remainingBalanceFCFA === 0
        ? 'SOLDE'
        : d.payment.amountPaidFCFA > 0
        ? 'ACOMPTE_PARTIEL'
        : 'NON_PAYE';

    return [
      `"${d.trackingCode}"`,
      `"${(d.personalInfo.lastName || '').replace(/"/g, '""')}"`,
      `"${(d.personalInfo.firstName || '').replace(/"/g, '""')}"`,
      `"${d.personalInfo.gender || 'M'}"`,
      `"${d.personalInfo.phone || ''}"`,
      `"${d.personalInfo.email || ''}"`,
      `"${d.personalInfo.passportNumber || ''}"`,
      `"${d.personalInfo.passportExpiry || ''}"`,
      `"${d.personalInfo.nationality || 'Sénégalaise'}"`,
      `"${(d.packageSnapshot.title || '').replace(/"/g, '""')}"`,
      `"${d.packageSnapshot.type || 'HAJJ'}"`,
      `"${d.packageSnapshot.roomType || 'standard'}"`,
      `"${d.workflowStatus}"`,
      ...(maskFinancials
        ? ['"ENREGISTRE"']
        : [
            `"${payStatus}"`,
            d.payment.amountPaidFCFA || 0,
            d.payment.totalAmountFCFA || 0,
            d.payment.remainingBalanceFCFA || 0,
          ]),
      `"${d.whatsappStatus || 'PENDING'}"`,
      `"${(d.personalInfo.emergencyContactName || '').replace(/"/g, '""')}"`,
      `"${d.personalInfo.emergencyContactPhone || ''}"`,
      `"${d.createdAt ? new Date(d.createdAt).toLocaleDateString('fr-FR') : ''}"`,
    ].join(';');
  });

  // \uFEFF is the UTF-8 Byte Order Mark (BOM) so Excel opens UTF-8 text with accents correctly
  const csvContent = '\uFEFF' + headers.join(';') + '\n' + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `EVA_VOYAGES_Export_Pelerins_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 2. EXPORT TO EXCEL (.xls HTML table spreadsheet compatible natively with Microsoft Excel and LibreOffice)
 */
export const exportDossiersToExcel = ({ dossiers, agencyConfig, filterLabel }: ExportOptions): void => {
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const totalPaid = dossiers.reduce((acc, d) => acc + (d.payment.amountPaidFCFA || 0), 0);
  const totalDue = dossiers.reduce((acc, d) => acc + (d.payment.totalAmountFCFA || 0), 0);
  const totalBalance = Math.max(0, totalDue - totalPaid);

  let tableRows = '';
  dossiers.forEach((d, idx) => {
    const payStatusText =
      d.payment.remainingBalanceFCFA === 0
        ? 'SOLDE (100%)'
        : d.payment.amountPaidFCFA > 0
        ? 'ACOMPTE'
        : 'NON PAYE';
    const payStatusColor =
      d.payment.remainingBalanceFCFA === 0
        ? '#047857'
        : d.payment.amountPaidFCFA > 0
        ? '#b45309'
        : '#b91c1c';

    tableRows += `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
        <td style="font-family: monospace; font-weight: bold; border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">${d.trackingCode}</td>
        <td style="font-weight: bold; border: 1px solid #e2e8f0; padding: 6px 8px;">${d.personalInfo.lastName.toUpperCase()}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px;">${d.personalInfo.firstName}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">${d.personalInfo.gender || 'M'}</td>
        <td style="font-family: monospace; border: 1px solid #e2e8f0; padding: 6px 8px;">${d.personalInfo.phone}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px;">${d.personalInfo.email || '-'}</td>
        <td style="font-family: monospace; font-weight: bold; border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">${d.personalInfo.passportNumber || 'En attente'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px;">${d.packageSnapshot.title}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center; font-weight: bold;">${d.packageSnapshot.type}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">Chambre ${d.packageSnapshot.roomType || 'Standard'}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">${d.workflowStatus}</td>
        <td style="font-weight: bold; color: ${payStatusColor}; border: 1px solid #e2e8f0; padding: 6px 8px; text-align: center;">${payStatusText}</td>
        <td style="font-family: monospace; text-align: right; border: 1px solid #e2e8f0; padding: 6px 8px; font-weight: bold; color: #047857;">${d.payment.amountPaidFCFA}</td>
        <td style="font-family: monospace; text-align: right; border: 1px solid #e2e8f0; padding: 6px 8px;">${d.payment.totalAmountFCFA}</td>
        <td style="font-family: monospace; text-align: right; border: 1px solid #e2e8f0; padding: 6px 8px; color: ${d.payment.remainingBalanceFCFA > 0 ? '#b91c1c' : '#047857'}; font-weight: bold;">${d.payment.remainingBalanceFCFA}</td>
        <td style="border: 1px solid #e2e8f0; padding: 6px 8px;">${d.personalInfo.emergencyContactName || '-'} (${d.personalInfo.emergencyContactPhone || '-'})</td>
      </tr>
    `;
  });

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Pelerins EVA Voyages</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
          th { background-color: #0b2d52; color: #ffffff; font-weight: bold; border: 1px solid #0b2d52; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <table border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 15px;">
          <tr>
            <td colspan="6" style="font-size: 16pt; font-weight: bold; color: #0b2d52;">${agencyConfig.name || 'EVA VOYAGES SÉNÉGAL'}</td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 10pt; color: #64748b;">AGENCE OFFICIELLE AGRÉÉE HAJJ & OUMRA - LICENCE N° ${agencyConfig.licenseNumber || '2024-SN-DKR-089'}</td>
          </tr>
          <tr>
            <td colspan="6" style="font-size: 10pt; color: #64748b;">Avenue Cheikh Anta Diop, Dakar | Tél: ${agencyConfig.phone || '+221 78 639 10 00'} | Date d'exportation: ${dateStr}</td>
          </tr>
          ${filterLabel ? `<tr><td colspan="6" style="font-size: 10pt; font-weight: bold; color: #f15a24;">Filtre appliqué: ${filterLabel}</td></tr>` : ''}
          <tr><td colspan="6"></td></tr>
          <tr>
            <td colspan="2" style="background-color: #f1f5f9; padding: 6px; font-weight: bold;">Total Pèlerins : ${dossiers.length}</td>
            <td colspan="2" style="background-color: #dcfce7; padding: 6px; font-weight: bold; color: #047857;">Total Encaissé : ${fmtFCFA(totalPaid)}</td>
            <td colspan="2" style="background-color: #fee2e2; padding: 6px; font-weight: bold; color: #991b1b;">Solde Restant : ${fmtFCFA(totalBalance)}</td>
          </tr>
        </table>

        <table border="1" cellpadding="0" cellspacing="0" style="border-collapse: collapse; width: 100%;">
          <thead>
            <tr>
              <th style="background-color: #0b2d52; color: #ffffff;">Code Dossier</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Nom</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Prénom</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Sexe</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Téléphone</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Email</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Passeport</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Package</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Type</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Hébergement</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Statut Workflow</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Statut Paiement</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Payé (FCFA)</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Total (FCFA)</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Solde (FCFA)</th>
              <th style="background-color: #0b2d52; color: #ffffff;">Contact Urgence</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </body>
    </html>
  `;

  const blob = new Blob([excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `EVA_VOYAGES_Cohorte_Pelerins_${new Date().toISOString().slice(0, 10)}.xls`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * 3. EXPORT TO OFFICIAL PDF REPORT (Landscape A4, multipage with header, statistics, and clean striped table)
 */
export const exportDossiersToPdf = ({ dossiers, agencyConfig, filterLabel }: ExportOptions): jsPDF => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const darkNavy = [11, 45, 82]; // #0b2d52
  const navy = [19, 92, 165]; // #135ca5
  const orange = [241, 90, 36]; // #f15a24
  const emerald = [4, 120, 87]; // #047857
  const slateDark = [30, 41, 59];
  const lightBg = [248, 250, 252];
  const borderGray = [226, 232, 240];

  const totalPaid = dossiers.reduce((acc, d) => acc + (d.payment.amountPaidFCFA || 0), 0);
  const totalDue = dossiers.reduce((acc, d) => acc + (d.payment.totalAmountFCFA || 0), 0);
  const totalBalance = Math.max(0, totalDue - totalPaid);

  const dateStr = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Header Banner
  const drawHeader = (pageNum: number, totalPagesEst: number) => {
    doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.rect(0, 0, pageWidth, 22, 'F');

    doc.setFillColor(orange[0], orange[1], orange[2]);
    doc.rect(0, 22, pageWidth, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text(agencyConfig.name || 'EVA VOYAGES SÉNÉGAL', margin, 9);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(219, 234, 254);
    doc.text(
      `RAPPORT OFFICIEL DE COHORTE PÈLERINS HAJJ & OUMRA · AGRÉMENT N° ${agencyConfig.licenseNumber || '2024-SN-DKR-089'}`,
      margin,
      14
    );
    doc.text(
      `Siège : Avenue Cheikh Anta Diop, Dakar · Ligne Directe : ${agencyConfig.phone || '+221 78 639 10 00'}`,
      margin,
      18.5
    );

    // Right-side badge
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`Édité le : ${dateStr}`, pageWidth - margin, 11, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(219, 234, 254);
    doc.text(`Page ${pageNum}`, pageWidth - margin, 17, { align: 'right' });
  };

  // Draw Page 1 header
  let currentPage = 1;
  drawHeader(currentPage, 1);

  // Statistics Summary Cards on Page 1
  let y = 28;
  const cardW = (contentWidth - 9) / 4;

  const drawKpi = (x: number, title: string, val: string, sub: string, bgColor: number[], textColor: number[]) => {
    doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.roundedRect(x, y, cardW, 14, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(textColor[0], textColor[1], textColor[2]);
    doc.text(title.toUpperCase(), x + 3, y + 4.5);

    doc.setFontSize(10);
    doc.text(val, x + 3, y + 9.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(sub, x + 3, y + 12.8);
  };

  drawKpi(margin, 'Total Pèlerins', `${dossiers.length} inscrits`, filterLabel || 'Tous critères', [241, 245, 249], [15, 23, 42]);
  drawKpi(margin + cardW + 3, 'Total Encaissé', fmtFCFA(totalPaid), 'Wave, OM & Guichet', [240, 253, 244], [4, 120, 87]);
  drawKpi(margin + (cardW + 3) * 2, 'Solde Restant Dû', fmtFCFA(totalBalance), 'Créance à recouvrer', [254, 242, 242], [185, 28, 28]);
  drawKpi(
    margin + (cardW + 3) * 3,
    'Taux de Recouvrement',
    totalDue > 0 ? `${Math.round((totalPaid / totalDue) * 100)}%` : '100%',
    `Total Objectif: ${fmtFCFA(totalDue)}`,
    [239, 246, 255],
    [30, 64, 175]
  );

  y += 18;

  // Table Columns Definition
  const cols = [
    { label: 'Code', width: 28, align: 'left' },
    { label: 'Pèlerin (Nom & Prénom)', width: 48, align: 'left' },
    { label: 'Téléphone', width: 30, align: 'left' },
    { label: 'Passeport', width: 26, align: 'left' },
    { label: 'Package & Formule', width: 50, align: 'left' },
    { label: 'Statut Dossier', width: 32, align: 'left' },
    { label: 'Payé (FCFA)', width: 28, align: 'right' },
    { label: 'Reste (FCFA)', width: 31, align: 'right' },
  ];

  const drawTableHeader = (curY: number) => {
    doc.setFillColor(navy[0], navy[1], navy[2]);
    doc.roundedRect(margin, curY, contentWidth, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let curX = margin + 2;
    cols.forEach((c) => {
      if (c.align === 'right') {
        doc.text(c.label, curX + c.width - 4, curY + 4.5, { align: 'right' });
      } else {
        doc.text(c.label, curX, curY + 4.5);
      }
      curX += c.width;
    });
  };

  drawTableHeader(y);
  y += 7.5;

  // Table Rows Loop
  const rowHeight = 7;
  const maxY = pageHeight - 16;

  dossiers.forEach((d, idx) => {
    // Check if new page is needed
    if (y + rowHeight > maxY) {
      doc.addPage('a4', 'landscape');
      currentPage++;
      drawHeader(currentPage, 1);
      y = 28;
      drawTableHeader(y);
      y += 7.5;
    }

    // Row Background (Zebra striped)
    if (idx % 2 === 0) {
      doc.setFillColor(255, 255, 255);
    } else {
      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
    }
    doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
    doc.rect(margin, y, contentWidth, rowHeight, 'FD');

    let curX = margin + 2;
    doc.setFontSize(7);

    // 1. Code
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(d.trackingCode, curX, y + 4.6);
    curX += cols[0].width;

    // 2. Name
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    const fullName = `${d.personalInfo.lastName.toUpperCase()} ${d.personalInfo.firstName}`.slice(0, 26);
    doc.text(fullName, curX, y + 4.6);
    curX += cols[1].width;

    // 3. Phone
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text(d.personalInfo.phone || '-', curX, y + 4.6);
    curX += cols[2].width;

    // 4. Passport
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
    doc.text(d.personalInfo.passportNumber || 'En attente', curX, y + 4.6);
    curX += cols[3].width;

    // 5. Package
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    const pkgText = `${d.packageSnapshot.type === 'HAJJ' ? '🕋 ' : '🌙 '}${d.packageSnapshot.title}`.slice(0, 28);
    doc.text(pkgText, curX, y + 4.6);
    curX += cols[4].width;

    // 6. Status
    doc.setFont('helvetica', 'bold');
    if (d.workflowStatus === 'READY_FOR_DEPARTURE' || d.workflowStatus === 'COMPLETED') {
      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    } else if (d.workflowStatus === 'DOCUMENTS_PENDING') {
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setTextColor(navy[0], navy[1], navy[2]);
    }
    const statusMap: Record<string, string> = {
      DOCUMENTS_PENDING: 'Doc. Manquants',
      UNDER_REVIEW: 'En Examen',
      DOCUMENTS_APPROVED: 'Docs Validés',
      FLIGHT_TICKET_ISSUED: 'Vol Confirmé',
      READY_FOR_DEPARTURE: 'Prêt Départ',
      COMPLETED: 'Accompli',
    };
    doc.text(statusMap[d.workflowStatus] || d.workflowStatus, curX, y + 4.6);
    curX += cols[5].width;

    // 7. Amount Paid
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    doc.text(new Intl.NumberFormat('fr-FR').format(d.payment.amountPaidFCFA), curX + cols[6].width - 4, y + 4.6, {
      align: 'right',
    });
    curX += cols[6].width;

    // 8. Balance
    const rem = d.payment.remainingBalanceFCFA;
    doc.setFont('helvetica', 'bold');
    if (rem > 0) {
      doc.setTextColor(orange[0], orange[1], orange[2]);
    } else {
      doc.setTextColor(emerald[0], emerald[1], emerald[2]);
    }
    doc.text(rem === 0 ? 'SOLDÉ' : new Intl.NumberFormat('fr-FR').format(rem), curX + cols[7].width - 4, y + 4.6, {
      align: 'right',
    });

    y += rowHeight;
  });

  // Footer stamp
  y += 4;
  if (y + 10 <= pageHeight - 5) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Ce document officiel certifie l'état de la cohorte émis par la direction des opérations EVA VOYAGES. Contact agence : ${agencyConfig.phone || '+221 78 639 10 00'} · Email : ${agencyConfig.email || 'contact@evavoyages.com'}.`,
      margin,
      pageHeight - 8
    );
  }

  doc.save(`EVA_VOYAGES_Rapport_Pelerins_${new Date().toISOString().slice(0, 10)}.pdf`);
  return doc;
};
