import PDFDocument from 'pdfkit';

/**
 * Enhanced Health Report PDF Generator
 * Handles multi-page content with automatic page breaks and proper formatting
 */

class HealthReportPDFGenerator {
  constructor() {
    this.doc = null;
    this.pageWidth = 0;
    this.pageHeight = 0;
    this.margin = 50;
    this.currentY = 0;
    this.colors = {
      primary: '#F97316',
      secondary: '#FDBA74',
      success: '#22C55E',
      warning: '#EAB308',
      danger: '#EF4444',
      text: '#1F2937',
      lightText: '#6B7280',
      border: '#E5E7EB',
      background: '#F9FAFB'
    };
  }

  // Helper function to check if content fits on current page
  checkPageBreak(requiredHeight, addNewPage = true) {
    if (this.currentY + requiredHeight > this.pageHeight - this.margin) {
      if (addNewPage) {
        this.doc.addPage();
        this.currentY = this.margin;
      }
      return true;
    }
    return false;
  }

  // Draw header with logo and title
  drawHeader() {
    // Orange background header
    this.doc.rect(0, 0, this.pageWidth, 150).fill(this.colors.primary);
    
    // Logo
    this.doc.fontSize(32).font('Helvetica-Bold');
    const relWidth = this.doc.widthOfString('Rel');
    const ivWidth = this.doc.widthOfString('iv');
    const totalLogoWidth = relWidth + ivWidth;
    const logoStartX = (this.pageWidth - totalLogoWidth) / 2;
    
    this.doc.fillColor('#FFFFFF')
           .text('Rel', logoStartX, 50, { continued: true })
           .fillColor('#000000')
           .text('iv');
    
    // Title
    this.doc.fontSize(18)
           .fillColor('#FFFFFF')
           .font('Helvetica')
           .text('Health Screening Report', 0, 90, { align: 'center' });
    
    this.currentY = 170;
  }

  // Draw section header with underline
  drawSectionHeader(title, marginTop = 20) {
    this.checkPageBreak(50);
    
    this.currentY += marginTop;
    this.doc.fillColor(this.colors.text)
           .fontSize(16)
           .font('Helvetica-Bold')
           .text(title, this.margin, this.currentY);
    
    this.currentY += 25;
    this.doc.moveTo(this.margin, this.currentY)
           .lineTo(this.pageWidth - this.margin, this.currentY)
           .stroke(this.colors.secondary);
    
    this.currentY += 15;
  }

  // Draw patient information section
  drawPatientInfo(patient) {
    this.drawSectionHeader('Patient Information');
    
    const infoHeight = 80;
    this.checkPageBreak(infoHeight);
    
    const col1X = this.margin;
    const col2X = this.pageWidth / 2 + 50;
    
    this.doc.fontSize(12).fillColor(this.colors.text);
    
    // Left column
    this.doc.font('Helvetica-Bold').text('Name:', col1X, this.currentY);
    this.doc.font('Helvetica').text(patient.name || 'N/A', col1X + 50, this.currentY);
    
    this.doc.font('Helvetica-Bold').text('Gender:', col1X, this.currentY + 20);
    this.doc.font('Helvetica').text(patient.gender || 'N/A', col1X + 50, this.currentY + 20);
    
    this.doc.font('Helvetica-Bold').text('Email:', col1X, this.currentY + 40);
    this.doc.font('Helvetica').text(patient.email || 'N/A', col1X + 40, this.currentY + 40);
    
    // Right column
    this.doc.font('Helvetica-Bold').text('Age:', col2X, this.currentY);
    this.doc.font('Helvetica').text(patient.age || 'N/A', col2X + 35, this.currentY);
    
    this.doc.font('Helvetica-Bold').text('Phone:', col2X, this.currentY + 20);
    this.doc.font('Helvetica').text(patient.phone || 'N/A', col2X + 45, this.currentY + 20);
    
    this.currentY += 80;
  }

  // Get color based on health status
  getStatusColor(status) {
    const lowerStatus = status.toLowerCase();
    if (lowerStatus.includes('normal') || lowerStatus.includes('good')) {
      return this.colors.success;
    }
    if (lowerStatus.includes('elevated') || lowerStatus.includes('borderline') || 
        lowerStatus.includes('moderate')) {
      return this.colors.warning;
    }
    return this.colors.danger;
  }

  // Draw vital card
  drawVitalCard(x, y, width, height, vital) {
    // Card background
    this.doc.roundedRect(x, y, width, height, 10)
           .fillAndStroke('#FFFFFF', this.colors.border);
    
    const textX = x + 10;
    const textY = y + 10;
    
    // Label
    this.doc.fontSize(10)
           .fillColor(this.colors.lightText)
           .font('Helvetica')
           .text(vital.label, textX, textY);
    
    // Value
    this.doc.fontSize(24)
           .fillColor(this.colors.text)
           .font('Helvetica-Bold')
           .text(vital.value, textX, textY + 15);
    
    // Status
    if (vital.status) {
      this.doc.fontSize(12)
             .fillColor(this.getStatusColor(vital.status))
             .font('Helvetica')
             .text(vital.status, textX, textY + 45);
    }
    
    // Note/Advice
    if (vital.note) {
      this.doc.fontSize(10)
             .fillColor(this.colors.text)
             .font('Helvetica')
             .text(vital.note, textX, textY + 60, { 
               width: width - 20,
               height: 50,
               ellipsis: true
             });
    }
  }

  // Draw vitals section with cards
  drawVitals(vitals, computed) {
    this.drawSectionHeader('Health Vitals');
    
    const vitalsData = [
      {
        label: 'Blood Pressure',
        value: `${vitals.systolic || '—'}/${vitals.diastolic || '—'} mmHg`,
        status: computed.bp.label,
        note: computed.bp.advice
      },
      {
        label: 'Oxygen Saturation (SpO₂)',
        value: `${vitals.spo2 || '—'} %`,
        status: computed.spo2.label,
        note: computed.spo2.advice
      },
      {
        label: 'Pulse Rate',
        value: `${vitals.pulse || '—'} BPM`,
        status: computed.pulse.label,
        note: computed.pulse.advice
      },
      {
        label: 'Body Temperature',
        value: `${vitals.tempF || '—'} °F`,
        status: computed.temp.label,
        note: computed.temp.advice
      }
    ];
    
    const cardWidth = 240;
    const cardHeight = 120;
    const cardMargin = 15;
    const startXCol1 = this.margin;
    const startXCol2 = startXCol1 + cardWidth + cardMargin;
    
    for (let i = 0; i < vitalsData.length; i++) {
      const vital = vitalsData[i];
      
      // Check if we need a new page
      this.checkPageBreak(cardHeight + 20);
      
      const xPos = i % 2 === 0 ? startXCol1 : startXCol2;
      
      this.drawVitalCard(xPos, this.currentY, cardWidth, cardHeight, vital);
      
      // Move to next row after every 2 cards
      if (i % 2 !== 0) {
        this.currentY += cardHeight + 20;
      }
    }
    
    // If odd number of cards, adjust position
    if (vitalsData.length % 2 !== 0) {
      this.currentY += cardHeight + 20;
    }
  }

  // Draw visual acuity section
  drawVisualAcuity(computed) {
    const cardHeight = 100;
    this.checkPageBreak(cardHeight + 20);
    
    this.doc.roundedRect(this.margin, this.currentY, this.pageWidth - 2 * this.margin, cardHeight, 10)
           .fillAndStroke('#FFFFFF', this.colors.border);
    
    const textX = this.margin + 10;
    const textY = this.currentY + 10;
    
    this.doc.fontSize(10)
           .fillColor(this.colors.lightText)
           .text('Visual Acuity', textX, textY);
    
    this.doc.fontSize(24)
           .fillColor(this.colors.text)
           .font('Helvetica-Bold')
           .text(computed.eyes.summary, textX, textY + 15);
    
    this.doc.fontSize(12)
           .fillColor(this.getStatusColor(computed.eyes.label))
           .font('Helvetica')
           .text(computed.eyes.label, textX, textY + 45);
    
    this.doc.fontSize(10)
           .fillColor(this.colors.text)
           .font('Helvetica')
           .text(computed.eyes.note, textX, textY + 60, { 
             width: this.pageWidth - 2 * this.margin - 20 
           });
    
    this.currentY += cardHeight + 20;
  }

  // Draw body composition section
  drawBodyComposition(bodyComposition) {
    if (!bodyComposition) return;
    
    this.drawSectionHeader('Body Composition Analysis');
    
    const compositions = [
      { label: 'BMI', value: bodyComposition.bmi?.toFixed(1) || 'N/A', unit: '' },
      { label: 'Body Fat', value: bodyComposition.fat_percent?.toFixed(1) || 'N/A', unit: '%' },
      { label: 'Muscle Mass', value: bodyComposition.muscle_mass?.toFixed(1) || 'N/A', unit: 'kg' },
      { label: 'Water Content', value: bodyComposition.water_percent?.toFixed(1) || 'N/A', unit: '%' },
      { label: 'Bone Mass', value: bodyComposition.bone_mass?.toFixed(1) || 'N/A', unit: 'kg' },
      { label: 'BMR', value: bodyComposition.bmr?.toFixed(0) || 'N/A', unit: 'kcal' }
    ];
    
    const itemsPerRow = 3;
    const cardWidth = (this.pageWidth - 2 * this.margin - 2 * 15) / itemsPerRow;
    const cardHeight = 80;
    
    for (let i = 0; i < compositions.length; i++) {
      const comp = compositions[i];
      
      if (i % itemsPerRow === 0) {
        this.checkPageBreak(cardHeight + 20);
      }
      
      const xPos = this.margin + (i % itemsPerRow) * (cardWidth + 15);
      const yPos = this.currentY;
      
      // Draw mini card
      this.doc.roundedRect(xPos, yPos, cardWidth, cardHeight, 8)
             .fillAndStroke('#FFFFFF', this.colors.border);
      
      this.doc.fontSize(9)
             .fillColor(this.colors.lightText)
             .text(comp.label, xPos + 8, yPos + 8);
      
      this.doc.fontSize(18)
             .fillColor(this.colors.text)
             .font('Helvetica-Bold')
             .text(`${comp.value}${comp.unit}`, xPos + 8, yPos + 25);
      
      // Move to next row after completing a row
      if ((i + 1) % itemsPerRow === 0 || i === compositions.length - 1) {
        this.currentY += cardHeight + 15;
      }
    }
  }

  // Draw personalized summary section
  drawPersonalizedSummary(vitals, computed, bodyComposition, patient) {
    this.drawSectionHeader('Personalized Health Summary');
    
    const summaryPoints = this.generateSummaryPoints(vitals, computed, bodyComposition, patient);
    
    for (const point of summaryPoints) {
      const pointHeight = this.estimateTextHeight(point, this.pageWidth - 2 * this.margin - 40);
      this.checkPageBreak(pointHeight + 10);
      
      this.doc.fontSize(11)
             .fillColor(this.colors.text)
             .font('Helvetica')
             .text('• ', this.margin + 10, this.currentY);
      
      this.doc.text(point, this.margin + 25, this.currentY, {
        width: this.pageWidth - 2 * this.margin - 40,
        align: 'left'
      });
      
      this.currentY += pointHeight + 8;
    }
  }

  // Generate summary points based on health data
  generateSummaryPoints(vitals, computed, bodyComposition, patient) {
    const points = [];
    
    // Blood Pressure Summary
    points.push(`Blood Pressure: ${vitals.systolic || '—'}/${vitals.diastolic || '—'} mmHg - ${computed.bp.label}. ${computed.bp.advice}`);
    
    // SpO2 Summary
    points.push(`Oxygen Saturation: ${vitals.spo2 || '—'}% - ${computed.spo2.label}. ${computed.spo2.advice}`);
    
    // Pulse Summary
    points.push(`Pulse Rate: ${vitals.pulse || '—'} BPM - ${computed.pulse.label}. ${computed.pulse.advice}`);
    
    // Temperature Summary
    points.push(`Body Temperature: ${vitals.tempF || '—'} °F - ${computed.temp.label}. ${computed.temp.advice}`);
    
    // Vision Summary
    points.push(`Visual Acuity: ${computed.eyes.summary}. ${computed.eyes.note}`);
    
    // BMI if available
    if (bodyComposition && bodyComposition.bmi) {
      const bmiStatus = bodyComposition.bmi < 18.5 ? 'Underweight' : 
                       bodyComposition.bmi <= 24.9 ? 'Normal' : 
                       bodyComposition.bmi <= 29.9 ? 'Overweight' : 'Obese';
      points.push(`BMI: ${bodyComposition.bmi.toFixed(1)} (${bmiStatus}). Maintain a balanced diet and regular exercise routine.`);
    }
    
    return points;
  }

  // Estimate text height for proper spacing
  estimateTextHeight(text, width) {
    const fontSize = 11;
    const lineHeight = fontSize * 1.2;
    const charWidth = fontSize * 0.6;
    const charsPerLine = Math.floor(width / charWidth);
    const lines = Math.ceil(text.length / charsPerLine);
    return lines * lineHeight;
  }

  // Draw footer with disclaimers and eco stats
  drawFooter(ecoStats) {
    const footerHeight = 80;
    
    // Ensure footer is on the page
    if (this.currentY + footerHeight > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
    
    // Position footer at bottom of page
    const footerY = this.pageHeight - footerHeight;
    
    this.doc.fontSize(8)
           .fillColor(this.colors.lightText)
           .text('This report is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.', 
                 this.margin, footerY, { align: 'center' });
    
    this.doc.text(`© ${new Date().getFullYear()} Reliv. All rights reserved.`, 
                  this.margin, footerY + 15, { align: 'center' });
    
    if (ecoStats) {
      this.doc.text(`Fun Fact: Your digital choice saved ~${ecoStats.individual.water}L of water & ~${ecoStats.individual.co2}g of CO2. Collectively, our users have saved ~${ecoStats.total.water}L of water, ~${ecoStats.total.co2}g of CO2, and ~${ecoStats.total.paper} sheets of paper!`, 
                    this.margin, footerY + 35, { align: 'center', width: this.pageWidth - 2 * this.margin });
    }
  }

  // Main generation function
  generateReport(healthData, bodyCompositionData, ecoStats) {
    return new Promise((resolve) => {
      this.doc = new PDFDocument({ 
        size: 'A4', 
        layout: 'portrait', 
        margin: this.margin 
      });
      
      const buffers = [];
      this.doc.on('data', buffers.push.bind(buffers));
      this.doc.on('end', () => resolve(Buffer.concat(buffers)));
      
      // Set up page dimensions
      this.pageWidth = this.doc.page.width;
      this.pageHeight = this.doc.page.height;
      this.currentY = this.margin;
      
      const { patient, vitals } = healthData;
      
      // Compute health assessments
      const computed = {
        bp: this.assessBP(vitals.systolic, vitals.diastolic),
        spo2: this.assessSpO2(vitals.spo2),
        pulse: this.assessPulse(vitals.pulse),
        temp: this.assessTempF(vitals.tempF),
        eyes: this.assessEyes(vitals.leftEye, vitals.rightEye)
      };
      
      // Draw all sections
      this.drawHeader();
      this.drawPatientInfo(patient);
      this.drawVitals(vitals, computed);
      this.drawVisualAcuity(computed);
      
      if (bodyCompositionData) {
        this.drawBodyComposition(bodyCompositionData);
      }
      
      this.drawPersonalizedSummary(vitals, computed, bodyCompositionData, patient);
      this.drawFooter(ecoStats);
      
      this.doc.end();
    });
  }

  // Health assessment functions (same as in your original code)
  assessBP(sys, dia) {
    const s = Number(sys), d = Number(dia);
    if (!s || !d) return { label: '—', advice: 'No BP values provided.' };
    if (s < 120 && d < 80) return { label: 'Normal', advice: 'Good: Keep up a healthy lifestyle.' };
    if (s < 130 && d < 80) return { label: 'Elevated', advice: 'Keep a check: Monitor regularly; consider diet/exercise.' };
    if ((s >= 130 && s <= 139) || (d >= 80 && d <= 89)) return { label: 'Hypertension Stage 1', advice: 'Alert: Consult a clinician; lifestyle changes recommended.' };
    if (s >= 140 || d >= 90) return { label: 'Hypertension Stage 2', advice: 'Alert: Seek medical advice soon.' };
    return { label: '—', advice: 'Check values.' };
  }

  assessSpO2(spo2) {
    const v = Number(spo2);
    if (!v) return { label: '—', advice: 'No SpO₂ value provided.' };
    if (v >= 95) return { label: 'Normal', advice: 'Good: Oxygen saturation is within normal range.' };
    if (v >= 90) return { label: 'Borderline', advice: 'Keep a check: Monitor; if symptoms occur, contact a clinician.' };
    return { label: 'Low', advice: 'Alert: Low oxygen level; seek care if persistent.' };
  }

  assessPulse(pulse) {
    const v = Number(pulse);
    if (!v) return { label: '—', advice: 'No pulse value provided.' };
    if (v >= 60 && v <= 100) return { label: 'Normal', advice: 'Good: Resting heart rate is within normal range.' };
    if (v < 60) return { label: 'Bradycardia', advice: 'Keep a check: Could be normal for athletes; else, monitor.' };
    return { label: 'Tachycardia', advice: 'Alert: High heart rate; consider rest and consult if persistent.' };
  }

  assessTempF(t) {
    const v = Number(t);
    if (!v) return { label: '—', advice: 'No temperature provided.' };
    if (v < 97) return { label: 'Low', advice: 'Alert: Slightly low; ensure warmth and re-check.' };
    if (v <= 99) return { label: 'Normal', advice: 'Good: Within normal range.' };
    if (v <= 100.4) return { label: 'Elevated', advice: 'Keep a check: Monitor, rest, and stay hydrated.' };
    if (v <= 103) return { label: 'Fever', advice: 'Alert: Fever; monitor, rest, stay hydrated, and consult if persistent.' };
    if (v <= 104) return { label: 'High Fever', advice: 'Alert: High fever; seek medical attention.' };
    return { label: 'Critical', advice: 'Emergency: Very high temperature; immediate care needed.' };
  }

  getSnellenEquivalent(line) {
    const lines = { 1: 200, 2: 100, 3: 70, 4: 50, 5: 40, 6: 30, 7: 25, 8: 20, 9: 15 };
    return lines[line] || '—';
  }

  assessEyes(left, right) {
    if (!left && !right) return { summary: '—', note: 'No eyesight input provided.', label: '—' };
    
    const l = this.getSnellenEquivalent(left);
    const r = this.getSnellenEquivalent(right);
    const summary = `Left: 20/${l}, Right: 20/${r}`;
    const minLine = Math.min(left || 0, right || 0);
    
    let label, note;
    if (minLine >= 8) {
      label = 'Normal';
      note = 'Good: Visual acuity is within normal range.';
    } else if (minLine >= 6) {
      label = 'Moderate';
      note = 'Keep a check: May need corrective lenses; consult an optometrist.';
    } else {
      label = 'Poor';
      note = 'Alert: Poor visual acuity; seek professional eye care.';
    }
    
    return { summary, note, label };
  }
}

// Export the generator function for use in your server
export function generateEnhancedReportPdf(healthData, bodyCompositionData, ecoStats) {
  const generator = new HealthReportPDFGenerator();
  return generator.generateReport(healthData, bodyCompositionData, ecoStats);
}