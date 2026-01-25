/**
 * SimplePDF - Minimal PDF generator for PageCub
 * Creates basic text-based PDF documents without external dependencies
 */

class SimplePDF {
  constructor() {
    this.objects = [];
    this.pages = [];
    this.currentPage = null;
    this.fontSize = 12;
    this.lineHeight = 14;
    this.margin = 50;
    this.pageWidth = 595; // A4 width in points
    this.pageHeight = 842; // A4 height in points
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }

  // Escape special PDF characters
  escape(text) {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\x00-\x1f\x7f-\xff]/g, '');
  }

  // Word wrap text to fit within content width
  wrapText(text, maxCharsPerLine = 80) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Add a new page
  addPage() {
    this.currentPage = {
      content: [],
      y: this.pageHeight - this.margin
    };
    this.pages.push(this.currentPage);
  }

  // Add title text
  addTitle(text) {
    if (!this.currentPage) this.addPage();

    const escaped = this.escape(text);
    this.currentPage.content.push({
      type: 'text',
      text: escaped,
      x: this.margin,
      y: this.currentPage.y,
      fontSize: 18,
      bold: true
    });
    this.currentPage.y -= 30;
  }

  // Add metadata line
  addMeta(label, value) {
    if (!this.currentPage) this.addPage();

    const escaped = this.escape(`${label}: ${value}`);
    this.currentPage.content.push({
      type: 'text',
      text: escaped,
      x: this.margin,
      y: this.currentPage.y,
      fontSize: 10,
      color: '0.4 0.4 0.4'
    });
    this.currentPage.y -= 14;
  }

  // Add a horizontal line
  addLine() {
    if (!this.currentPage) this.addPage();

    this.currentPage.content.push({
      type: 'line',
      x1: this.margin,
      y1: this.currentPage.y,
      x2: this.pageWidth - this.margin,
      y2: this.currentPage.y
    });
    this.currentPage.y -= 20;
  }

  // Add body text with word wrap
  addText(text) {
    if (!this.currentPage) this.addPage();

    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph.trim() === '') {
        this.currentPage.y -= this.lineHeight;
        continue;
      }

      const lines = this.wrapText(paragraph, 85);

      for (const line of lines) {
        // Check if we need a new page
        if (this.currentPage.y < this.margin + 50) {
          this.addPage();
        }

        const escaped = this.escape(line);
        this.currentPage.content.push({
          type: 'text',
          text: escaped,
          x: this.margin,
          y: this.currentPage.y,
          fontSize: this.fontSize
        });
        this.currentPage.y -= this.lineHeight;
      }
    }
  }

  // Generate PDF content
  generate() {
    let pdf = '%PDF-1.4\n';
    let objectNumber = 1;
    const offsets = [];

    // Helper to add object
    const addObject = (content) => {
      offsets.push(pdf.length);
      pdf += `${objectNumber} 0 obj\n${content}\nendobj\n`;
      return objectNumber++;
    };

    // Catalog
    const catalogObj = addObject('<< /Type /Catalog /Pages 2 0 R >>');

    // Pages object (will be updated)
    const pagesObjNum = objectNumber;
    offsets.push(pdf.length);
    pdf += `${objectNumber} 0 obj\n<< /Type /Pages /Kids [`;
    const pageRefs = [];
    objectNumber++;

    // Font
    const fontObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    const fontBoldObj = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    // Generate each page
    for (const page of this.pages) {
      // Page content stream
      let stream = 'BT\n';

      for (const item of page.content) {
        if (item.type === 'text') {
          const font = item.bold ? `/F2 ${item.fontSize}` : `/F1 ${item.fontSize}`;
          if (item.color) {
            stream += `${item.color} rg\n`;
          } else {
            stream += '0 0 0 rg\n';
          }
          stream += `${font} Tf\n`;
          stream += `${item.x} ${item.y} Td\n`;
          stream += `(${item.text}) Tj\n`;
          stream += `${-item.x} ${-item.y} Td\n`;
        }
      }
      stream += 'ET\n';

      // Draw lines
      for (const item of page.content) {
        if (item.type === 'line') {
          stream += `0.7 0.7 0.7 RG\n`;
          stream += `1 w\n`;
          stream += `${item.x1} ${item.y1} m\n`;
          stream += `${item.x2} ${item.y2} l\n`;
          stream += 'S\n';
        }
      }

      const streamObj = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);

      // Page object
      const pageObj = addObject(
        `<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] ` +
        `/Contents ${streamObj} 0 R /Resources << /Font << /F1 ${fontObj} 0 R /F2 ${fontBoldObj} 0 R >> >> >>`
      );
      pageRefs.push(`${pageObj} 0 R`);
    }

    // Update pages object
    const pagesContent = `<< /Type /Pages /Kids [${pageRefs.join(' ')}] /Count ${this.pages.length} >>`;
    const pagesStart = offsets[1];
    const oldPagesObj = `${pagesObjNum} 0 obj\n<< /Type /Pages /Kids [`;
    pdf = pdf.substring(0, pagesStart) + `${pagesObjNum} 0 obj\n${pagesContent}\nendobj\n` +
          pdf.substring(pdf.indexOf('endobj\n', pagesStart) + 7);

    // Recalculate offsets (simplified - just rebuild)
    // For simplicity, we'll regenerate the entire PDF properly
    return this.generateClean();
  }

  // Clean generation without offset issues
  generateClean() {
    const objects = [];

    // Object 1: Catalog
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');

    // Object 2: Pages (placeholder, will be filled in)
    let pagesObj = '<< /Type /Pages /Kids [';

    // Object 3: Font
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    // Object 4: Font Bold
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

    const pageObjNumbers = [];
    let nextObjNum = 5;

    // Generate pages
    for (const page of this.pages) {
      // Build content stream
      let stream = 'BT\n';

      for (const item of page.content) {
        if (item.type === 'text') {
          const font = item.bold ? `/F2 ${item.fontSize}` : `/F1 ${item.fontSize}`;
          if (item.color) {
            stream += `${item.color} rg\n`;
          } else {
            stream += '0 0 0 rg\n';
          }
          stream += `${font} Tf\n`;
          stream += `${item.x} ${item.y} Td\n`;
          stream += `(${item.text}) Tj\n`;
          stream += `${-item.x} ${-item.y} Td\n`;
        }
      }
      stream += 'ET\n';

      // Draw lines
      for (const item of page.content) {
        if (item.type === 'line') {
          stream += `0.7 0.7 0.7 RG\n`;
          stream += `1 w\n`;
          stream += `${item.x1} ${item.y1} m\n`;
          stream += `${item.x2} ${item.y2} l\n`;
          stream += 'S\n';
        }
      }

      // Content stream object
      const streamObjNum = nextObjNum++;
      objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);

      // Page object
      const pageObjNum = nextObjNum++;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] ` +
        `/Contents ${streamObjNum} 0 R /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
      );
      pageObjNumbers.push(pageObjNum);
    }

    // Update pages object
    pagesObj += pageObjNumbers.map(n => `${n} 0 R`).join(' ');
    pagesObj += `] /Count ${this.pages.length} >>`;
    objects[1] = pagesObj;

    // Build PDF
    let pdf = '%PDF-1.4\n';
    const offsets = [];

    for (let i = 0; i < objects.length; i++) {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }

    // Cross-reference table
    const xrefOffset = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (const offset of offsets) {
      pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefOffset}\n`;
    pdf += '%%EOF';

    return pdf;
  }

  // Create PDF from page content
  static fromContent(content) {
    const pdf = new SimplePDF();

    pdf.addPage();
    pdf.addTitle(content.title || 'Untitled');
    pdf.currentPage.y -= 10;

    if (content.author && content.author !== 'Unknown') {
      pdf.addMeta('Author', content.author);
    }
    if (content.url) {
      pdf.addMeta('Source', content.url);
    }
    if (content.publishDate) {
      pdf.addMeta('Date', content.publishDate);
    }
    if (content.timestamp) {
      pdf.addMeta('Saved', content.timestamp);
    }

    pdf.currentPage.y -= 10;
    pdf.addLine();
    pdf.currentPage.y -= 10;

    if (content.bodyText) {
      pdf.addText(content.bodyText);
    }

    return pdf.generateClean();
  }
}

// Make available globally
window.SimplePDF = SimplePDF;

console.log('PageCub: SimplePDF library loaded');
