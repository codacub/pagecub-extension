/**
 * SimplePDF - Minimal PDF generator for PageCub
 * Creates basic text-based PDF documents without external dependencies
 */

class SimplePDF {
  constructor() {
    this.pages = [];
    this.currentPage = null;
    this.fontSize = 11;
    this.lineHeight = 14;
    this.margin = 50;
    this.pageWidth = 595; // A4 width in points
    this.pageHeight = 842; // A4 height in points
  }

  // Escape special PDF characters and handle encoding
  escape(text) {
    if (!text) return '';
    return String(text)
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[\x00-\x1f\x7f-\xff]/g, char => {
        // Convert non-ASCII to octal escape
        return '\\' + char.charCodeAt(0).toString(8).padStart(3, '0');
      });
  }

  // Word wrap text to fit within content width
  wrapText(text, maxCharsPerLine = 90) {
    if (!text) return [];
    const words = text.split(/\s+/);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      if (!word) continue;
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length <= maxCharsPerLine) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // Handle very long words by breaking them
        if (word.length > maxCharsPerLine) {
          let remaining = word;
          while (remaining.length > maxCharsPerLine) {
            lines.push(remaining.substring(0, maxCharsPerLine));
            remaining = remaining.substring(maxCharsPerLine);
          }
          currentLine = remaining;
        } else {
          currentLine = word;
        }
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
    this.currentPage.content.push({
      type: 'text',
      text: this.escape(text),
      x: this.margin,
      y: this.currentPage.y,
      fontSize: 16,
      bold: true
    });
    this.currentPage.y -= 28;
  }

  // Add metadata line
  addMeta(label, value) {
    if (!this.currentPage) this.addPage();
    this.currentPage.content.push({
      type: 'text',
      text: this.escape(`${label}: ${value}`),
      x: this.margin,
      y: this.currentPage.y,
      fontSize: 9,
      gray: true
    });
    this.currentPage.y -= 12;
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
    this.currentPage.y -= 15;
  }

  // Add body text with word wrap
  addText(text) {
    if (!this.currentPage) this.addPage();
    if (!text) return;

    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (!paragraph || paragraph.trim() === '') {
        this.currentPage.y -= this.lineHeight * 0.5;
        continue;
      }

      const lines = this.wrapText(paragraph.trim(), 90);

      for (const line of lines) {
        // Check if we need a new page
        if (this.currentPage.y < this.margin + 30) {
          this.addPage();
        }

        this.currentPage.content.push({
          type: 'text',
          text: this.escape(line),
          x: this.margin,
          y: this.currentPage.y,
          fontSize: this.fontSize
        });
        this.currentPage.y -= this.lineHeight;
      }
    }
  }

  // Generate valid PDF content
  generateClean() {
    // Build all objects first, then calculate offsets
    const objectContents = [];

    // We'll build: Catalog, Pages, Font1, Font2, then for each page: Stream, Page
    // Object 1: Catalog (references Pages at object 2)
    objectContents.push('<< /Type /Catalog /Pages 2 0 R >>');

    // Object 2: Pages - placeholder, we'll fill in the Kids later
    objectContents.push(null); // Will be replaced

    // Object 3: Font (Helvetica)
    objectContents.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

    // Object 4: Font Bold (Helvetica-Bold)
    objectContents.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const pageObjectNumbers = [];
    let nextObjNum = 5;

    // Generate each page
    for (const page of this.pages) {
      // Build content stream
      let stream = '';

      for (const item of page.content) {
        if (item.type === 'text') {
          // Set color
          if (item.gray) {
            stream += '0.4 0.4 0.4 rg\n';
          } else {
            stream += '0 0 0 rg\n';
          }
          // Set font
          const fontRef = item.bold ? '/F2' : '/F1';
          stream += `BT\n`;
          stream += `${fontRef} ${item.fontSize} Tf\n`;
          stream += `${item.x} ${item.y} Td\n`;
          stream += `(${item.text}) Tj\n`;
          stream += `ET\n`;
        } else if (item.type === 'line') {
          stream += '0.8 0.8 0.8 RG\n';
          stream += '0.5 w\n';
          stream += `${item.x1} ${item.y1} m\n`;
          stream += `${item.x2} ${item.y2} l\n`;
          stream += 'S\n';
        }
      }

      // Stream object
      const streamObjNum = nextObjNum++;
      objectContents.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);

      // Page object
      const pageObjNum = nextObjNum++;
      objectContents.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] ` +
        `/Contents ${streamObjNum} 0 R ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
      );
      pageObjectNumbers.push(pageObjNum);
    }

    // Now fill in the Pages object (object 2)
    const kidsStr = pageObjectNumbers.map(n => `${n} 0 R`).join(' ');
    objectContents[1] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${this.pages.length} >>`;

    // Build the PDF string with correct byte offsets
    let pdf = '%PDF-1.4\n';
    // Add binary comment to indicate binary content (helps some readers)
    pdf += '%\xE2\xE3\xCF\xD3\n';

    const offsets = [];

    for (let i = 0; i < objectContents.length; i++) {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n`;
      pdf += objectContents[i];
      pdf += '\nendobj\n';
    }

    // Cross-reference table
    const xrefOffset = pdf.length;
    pdf += 'xref\n';
    pdf += `0 ${objectContents.length + 1}\n`;
    pdf += '0000000000 65535 f \n';

    for (const offset of offsets) {
      pdf += offset.toString().padStart(10, '0') + ' 00000 n \n';
    }

    // Trailer
    pdf += 'trailer\n';
    pdf += `<< /Size ${objectContents.length + 1} /Root 1 0 R >>\n`;
    pdf += 'startxref\n';
    pdf += `${xrefOffset}\n`;
    pdf += '%%EOF\n';

    return pdf;
  }

  // Create PDF from page content
  static fromContent(content) {
    const pdf = new SimplePDF();

    pdf.addPage();

    // Title
    if (content.title) {
      pdf.addTitle(content.title);
    } else {
      pdf.addTitle('Untitled');
    }

    pdf.currentPage.y -= 5;

    // Metadata
    if (content.author && content.author !== 'Unknown') {
      pdf.addMeta('Author', content.author);
    }
    if (content.url) {
      // Truncate very long URLs
      const url = content.url.length > 100 ? content.url.substring(0, 100) + '...' : content.url;
      pdf.addMeta('Source', url);
    }
    if (content.publishDate) {
      pdf.addMeta('Date', content.publishDate);
    }
    if (content.timestamp) {
      pdf.addMeta('Saved', new Date(content.timestamp).toLocaleString());
    }

    pdf.currentPage.y -= 5;
    pdf.addLine();
    pdf.currentPage.y -= 5;

    // Body text
    if (content.bodyText) {
      pdf.addText(content.bodyText);
    }

    return pdf.generateClean();
  }
}

// Make available globally
window.SimplePDF = SimplePDF;

console.log('PageCub: SimplePDF library loaded');
