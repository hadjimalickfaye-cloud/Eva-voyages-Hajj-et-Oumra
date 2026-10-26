import { jsPDF } from 'jspdf';
import { PilgrimDossier, AgencyConfig } from '../types';

interface GenerateFicheOptions {
  dossier: PilgrimDossier;
  agencyConfig: AgencyConfig;
  autoDownload?: boolean;
}

export const generateFicheRenseignementsPdf = ({
  dossier,
  agencyConfig,
  autoDownload = true,
}: GenerateFicheOptions): jsPDF => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const darkNavy = [11, 45, 82]; // #0b2d52
  const navy = [19, 92, 165]; // #135ca5
  const orange = [241, 90, 36]; // #f15a24
  const emerald = [4, 120, 87]; // #047857
  const slateDark = [30, 41, 59];
  const lightBg = [248, 250, 252];
  const borderGray = [203, 213, 225];

  // Helper currency
  const fmt = (val: number) => {
    return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA';
  };

  // Header Banner
  doc.setFillColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Orange line
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.rect(0, 28, pageWidth, 2, 'F');

  // Header texts
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(agencyConfig.name || 'EVA VOYAGES SÉNÉGAL', margin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(219, 234, 254);
  doc.text(
    `AGENCE OFFICIELLE AGRÉÉE HAJJ & OUMRA · LICENCE N° ${agencyConfig.licenseNumber || '2024-SN-DKR-089'}`,
    margin,
    16.5
  );
  doc.text(
    `Avenue Cheikh Anta Diop, Dakar · Tél Caisse & Assistance : ${agencyConfig.phone || '+221 78 639 10 00'} · Email : ${agencyConfig.email || 'contact@evavoyages.com'}`,
    margin,
    21.5
  );

  // Right-aligned official pill
  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.roundedRect(pageWidth - margin - 48, 7, 48, 14, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('DOCUMENT OFFICIEL', pageWidth - margin - 24, 12.5, { align: 'center' });
  doc.setFontSize(6.5);
  doc.text('FICHE PÈLERIN CERTIFIÉE', pageWidth - margin - 24, 17, { align: 'center' });

  // Title Strip
  let y = 36;
  doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('FICHE INDIVIDUELLE DE RENSEIGNEMENTS DU PÈLERIN', margin + 5, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`Identifiant Dossier : `, margin + 5, y + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(dossier.trackingCode, margin + 34, y + 13.5);

  const datePrinted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Date d'émission : `, margin + 78, y + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(datePrinted, margin + 102, y + 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(`Session : `, pageWidth - margin - 40, y + 13.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text(dossier.packageSnapshot.season || '1447H / 2026', pageWidth - margin - 26, y + 13.5);

  // SECTION 1: CIVIL IDENTITY & PHOTO (2 Columns: Left 72%, Right Photo 28%)
  y = 59;
  const photoBoxW = 34;
  const photoBoxH = 42;
  const infoColW = contentWidth - photoBoxW - 4;

  // Box Left: Civil Info
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, infoColW, 46, 2, 2, 'FD');

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(margin, y, infoColW, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('1. ÉTAT CIVIL & IDENTITÉ BIOMÉTRIQUE DU PÈLERIN', margin + 4, y + 4.2);

  const pInfo = dossier.personalInfo;
  let py = y + 11;
  const printPair = (l1: string, v1: string, l2: string, v2: string, curY: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(l1, margin + 4, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(v1 || '-', margin + 30, curY);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(l2, margin + 74, curY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
    doc.text(v2 || '-', margin + 104, curY);
  };

  printPair(
    'Nom de Famille :',
    (pInfo.lastName || '').toUpperCase(),
    'Prénom(s) :',
    pInfo.firstName || '',
    py
  );
  py += 6.5;
  printPair(
    'Sexe / Genre :',
    pInfo.gender === 'F' ? 'Féminin' : 'Masculin',
    'Nationalité :',
    pInfo.nationality || 'Sénégalaise',
    py
  );
  py += 6.5;
  printPair(
    'Date de Naissance :',
    pInfo.dateOfBirth || '-',
    'Lieu de Naissance :',
    pInfo.placeOfBirth || 'Dakar',
    py
  );
  py += 6.5;
  printPair(
    'Passeport N° :',
    pInfo.passportNumber || 'En cours',
    'Validité Expiration :',
    pInfo.passportExpiry || 'Conforme',
    py
  );
  py += 6.5;
  printPair(
    'Téléphone Principal :',
    pInfo.phone || '-',
    'Email Contact :',
    pInfo.email || 'N/A',
    py
  );
  py += 6.5;
  printPair(
    'Ville / Résidence :',
    `${pInfo.city || 'Dakar'}, ${pInfo.country || 'Sénégal'}`,
    'Adresse Domicile :',
    (pInfo.address || '-').slice(0, 22),
    py
  );

  // Box Right: Photo d'identité
  const photoX = margin + infoColW + 4;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(photoX, y, photoBoxW, 46, 2, 2, 'FD');

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(photoX, y, photoBoxW, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text('PHOTO PÈLERIN', photoX + photoBoxW / 2, y + 4.2, { align: 'center' });

  // Photo placeholder/box
  const photoFrameX = photoX + 4;
  const photoFrameY = y + 8.5;
  const photoFrameW = photoBoxW - 8;
  const photoFrameH = 34;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.rect(photoFrameX, photoFrameY, photoFrameW, photoFrameH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('PHOTO D\'IDENTITÉ', photoFrameX + photoFrameW / 2, photoFrameY + 14, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('FOND BLANC', photoFrameX + photoFrameW / 2, photoFrameY + 18, { align: 'center' });
  doc.text('HOMOLOGUÉE', photoFrameX + photoFrameW / 2, photoFrameY + 22, { align: 'center' });

  doc.setFontSize(5);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text('MINISTÈRE DU HAJJ', photoFrameX + photoFrameW / 2, photoFrameY + 29, { align: 'center' });

  // SECTION 2: HEALTH, EMERGENCY & MAHRAM
  y = 110;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 27, 2, 2, 'FD');

  doc.setFillColor(orange[0], orange[1], orange[2]);
  doc.roundedRect(margin, y, contentWidth, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('2. SANTÉ, VACCINATIONS & CONTACT D\'URGENCE (SÉCURITÉ DÉLÉGATION)', margin + 4, y + 4.2);

  let hy = y + 11.5;
  doc.setFontSize(7.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Groupe Sanguin :', margin + 4, hy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(pInfo.bloodGroup || 'O+', margin + 30, hy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Contact d\'Urgence :', margin + 65, hy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(pInfo.emergencyContactName || 'Membre famille', margin + 98, hy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Tél Urgence :', margin + 140, hy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(pInfo.emergencyContactPhone || pInfo.phone, margin + 160, hy);

  hy += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Lien de Parenté :', margin + 4, hy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(pInfo.emergencyContactRelation || 'Famille proche', margin + 30, hy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Mahram / Tuteur :', margin + 65, hy);
  if (pInfo.mahramName) {
    doc.setTextColor(180, 83, 9);
  } else {
    doc.setTextColor(100, 116, 139);
  }
  doc.text(pInfo.mahramName || 'Non requis / Encadrement délégation', margin + 98, hy);

  hy += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Aptitude Médicale :', margin + 4, hy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text('Apte au voyage · Vaccins Méningite A/C/Y/W135 & Fièvre Jaune exigés', margin + 30, hy);

  // SECTION 3: PACKAGE DETAILS & FLIGHT / VISA
  y = 142;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFillColor(navy[0], navy[1], navy[2]);
  doc.roundedRect(margin, y, contentWidth, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('3. FORFAIT DE PÈLERINAGE, TITRES DE TRANSPORT & VISA NUSUK', margin + 4, y + 4.2);

  let fy = y + 11.5;
  doc.setFontSize(7.5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Formule Retenue :', margin + 4, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(`${dossier.packageSnapshot.type === 'HAJJ' ? 'HAJJ 1447H' : 'OUMRA'} - ${dossier.packageSnapshot.title}`, margin + 34, fy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Type Chambre :', margin + 130, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Chambre ${dossier.packageSnapshot.roomType || 'Standard'}`, margin + 155, fy);

  fy += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Dates Prévues :', margin + 4, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`Du ${dossier.packageSnapshot.departureDate || 'Mai 2026'} au ${dossier.packageSnapshot.returnDate || 'Juin 2026'}`, margin + 34, fy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Hébergement Makkah :', margin + 110, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text('Hôtel 5★ Proche Haram', margin + 145, fy);

  fy += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Compagnie Vol :', margin + 4, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(dossier.flightDetails?.airline || 'Air Sénégal / Saudia Airlines', margin + 34, fy);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('N° Vol & PNR :', margin + 110, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(slateDark[0], slateDark[1], slateDark[2]);
  doc.text(`${dossier.flightDetails?.flightNumber || 'SV-492'} · PNR: ${dossier.flightDetails?.pnr || 'Confirmé'}`, margin + 145, fy);

  fy += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Visa Électronique :', margin + 4, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(
    `Visa N° ${dossier.visaDetails?.visaNumber || 'KSA-EV-2026'} (Plateforme Nusuk Masar)`,
    margin + 34,
    fy
  );

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Groupe WhatsApp :', margin + 110, fy);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(dossier.whatsappStatus === 'JOINED' ? 'Inscrit & Actif' : 'Invitation délivrée', margin + 145, fy);

  // SECTION 4: FINANCIAL ACCOUNT SUMMARY
  y = 181;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setFillColor(emerald[0], emerald[1], emerald[2]);
  doc.roundedRect(margin, y, contentWidth, 6, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('4. SITUATION COMPTABLE & RÈGLEMENT DU FORFAIT', margin + 4, y + 4.2);

  const totalCost = dossier.payment.totalAmountFCFA;
  const paidCost = dossier.payment.amountPaidFCFA;
  const remainingCost = Math.max(0, dossier.payment.remainingBalanceFCFA);

  let py2 = y + 11.5;
  doc.setFontSize(8);

  // Row 1: Total Package
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Montant Global Garanti du Forfait :', margin + 4, py2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text(fmt(totalCost), margin + 65, py2);

  // Row 2: Paid Amount
  py2 += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Total Versements Encaissés :', margin + 4, py2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text(fmt(paidCost), margin + 65, py2);

  // Row 3: Remaining Balance
  py2 += 6.5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Solde Restant Dû :', margin + 4, py2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(remainingCost > 0 ? orange[0] : emerald[0], remainingCost > 0 ? orange[1] : emerald[1], remainingCost > 0 ? orange[2] : emerald[2]);
  doc.text(remainingCost === 0 ? 'Dossier 100% Soldé' : fmt(remainingCost), margin + 65, py2);

  // Right-side box for payment methods & agency counter voucher
  const rightBoxX = margin + 105;
  const rightBoxW = contentWidth - 105 - 4;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(rightBoxX, y + 8, rightBoxW, 26, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(darkNavy[0], darkNavy[1], darkNavy[2]);
  doc.text('MODES DE RÈGLEMENT AUTORISÉS', rightBoxX + rightBoxW / 2, y + 12.5, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(75, 85, 99);
  doc.text('• Wave Sénégal (Marchand Officiel EVA)', rightBoxX + 4, y + 18);
  doc.text('• Orange Money Sénégal (#144#391#)', rightBoxX + 4, y + 23);
  doc.text('• Guichet Siège EVA Voyages (Espèces / TPE)', rightBoxX + 4, y + 28);

  // SECTION 5: SIGNATURES, CACHET CIRCULAIRE OFFICIEL & QR CODE
  y = 224;
  const stampBoxW = (contentWidth - 8) / 2;

  // Box Pilgrim Signature
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(margin, y, stampBoxW, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(75, 85, 99);
  doc.text('SIGNATURE DU PÈLERIN SOUSCRIPTEUR', margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text('Mention manuscrite "Lu et approuvé - Engagement au pèlerinage"', margin + 4, y + 11);

  // Box Agency Official Seal & Director Visa
  const stampX = margin + stampBoxW + 8;
  doc.setFillColor(250, 250, 250);
  doc.setDrawColor(borderGray[0], borderGray[1], borderGray[2]);
  doc.roundedRect(stampX, y, stampBoxW, 36, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('DIRECTION DES OPÉRATIONS & CACHET OFFICIEL', stampX + 4, y + 6);

  // Circular Stamp
  const circleCenterX = stampX + stampBoxW - 20;
  const circleCenterY = y + 20;
  doc.setDrawColor(navy[0], navy[1], navy[2]);
  doc.setLineWidth(0.6);
  doc.circle(circleCenterX, circleCenterY, 12);
  doc.setDrawColor(orange[0], orange[1], orange[2]);
  doc.setLineWidth(0.3);
  doc.circle(circleCenterX, circleCenterY, 9.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(navy[0], navy[1], navy[2]);
  doc.text('EVA VOYAGES SÉNÉGAL', circleCenterX, circleCenterY - 4, { align: 'center' });
  doc.setFontSize(6);
  doc.setTextColor(orange[0], orange[1], orange[2]);
  doc.text('DOSSIER CONFORME', circleCenterX, circleCenterY, { align: 'center' });
  doc.setFontSize(4.5);
  doc.setTextColor(emerald[0], emerald[1], emerald[2]);
  doc.text('HAJJ & OUMRA 1447H', circleCenterX, circleCenterY + 3.8, { align: 'center' });
  doc.setFontSize(3.8);
  doc.setTextColor(75, 85, 99);
  doc.text('DAKAR - PLATEAU', circleCenterX, circleCenterY + 6.8, { align: 'center' });

  // Verification QR note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Identifiant d'authentification : ${dossier.trackingCode}`, stampX + 4, y + 14);
  doc.text('Validé par la commission administrative', stampX + 4, y + 19);
  doc.text(`Contact d'urgence agence : ${agencyConfig.phone || '+221 78 639 10 00'}`, stampX + 4, y + 24);

  // Legal footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  const legalNotice = `Cette fiche officielle de renseignements est dressée en exécution des conventions de voyage aux Lieux Saints de l'Islam régies par la Délégation Générale au Pèlerinage et le Ministère du Hajj & Umrah (Royaume d'Arabie Saoudite). Document strictement personnel. Délivré par ${agencyConfig.name || 'EVA VOYAGES SÉNÉGAL'}.`;
  doc.text(legalNotice, margin, pageHeight - 8, { maxWidth: contentWidth, align: 'justify' });

  if (autoDownload) {
    const cleanName = `${dossier.personalInfo.lastName}_${dossier.personalInfo.firstName}`.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Fiche_Renseignements_${dossier.trackingCode}_${cleanName}.pdf`);
  }

  return doc;
};
