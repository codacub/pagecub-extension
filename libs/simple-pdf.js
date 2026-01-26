/**
 * PageCub PDF Generator
 * Creates well-formatted PDF documents from webpage content
 * Uses improved text handling and proper character encoding
 */

class PagePDF {
  constructor() {
    this.pageWidth = 595.28;  // A4 width in points
    this.pageHeight = 841.89; // A4 height in points
    this.margin = 50;
    this.contentWidth = this.pageWidth - (2 * this.margin);
    this.currentY = this.pageHeight - this.margin;
    this.fontSize = 11;
    this.lineHeight = 16;
    this.objects = [];
    this.pageContents = [];
    this.currentPageContent = '';
    this.fontMap = {};
  }

  // Convert Unicode string to PDF-safe string (WinAnsiEncoding)
  encodeText(text) {
    if (!text) return '';

    // Character mapping for common Unicode chars to WinAnsi
    const charMap = {
      '\u2018': "'",   // Left single quote
      '\u2019': "'",   // Right single quote
      '\u201C': '"',   // Left double quote
      '\u201D': '"',   // Right double quote
      '\u2014': '--',  // Em dash
      '\u2013': '-',   // En dash
      '\u2026': '...', // Ellipsis
      '\u00A0': ' ',   // Non-breaking space
      '\u2022': '*',   // Bullet
      '\u00B7': '*',   // Middle dot
      '\u2023': '>',   // Triangle bullet
      '\u2043': '-',   // Hyphen bullet
      '\u00AB': '<<',  // Left guillemet
      '\u00BB': '>>',  // Right guillemet
      '\u2039': '<',   // Single left guillemet
      '\u203A': '>',   // Single right guillemet
      '\u201A': ',',   // Single low quote
      '\u201E': ',,',  // Double low quote
      '\u2020': '+',   // Dagger
      '\u2021': '++',  // Double dagger
      '\u00AE': '(R)', // Registered
      '\u00A9': '(C)', // Copyright
      '\u2122': '(TM)',// Trademark
      '\u00B0': 'deg', // Degree
      '\u00BC': '1/4', // One quarter
      '\u00BD': '1/2', // One half
      '\u00BE': '3/4', // Three quarters
    };

    let result = '';
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const code = char.charCodeAt(0);

      if (charMap[char]) {
        result += charMap[char];
      } else if (code < 128) {
        // ASCII - safe as-is, but escape PDF special chars
        if (char === '\\') result += '\\\\';
        else if (char === '(') result += '\\(';
        else if (char === ')') result += '\\)';
        else if (char === '\r') result += '';
        else if (char === '\n') result += '';
        else if (char === '\t') result += '    ';
        else result += char;
      } else if (code >= 128 && code <= 255) {
        // Extended ASCII - use octal escape
        result += '\\' + code.toString(8).padStart(3, '0');
      } else {
        // Other Unicode - try to transliterate or skip
        result += '?';
      }
    }
    return result;
  }

  // Word wrap text
  wrapText(text, maxWidth = 85) {
    if (!text) return [];
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const lines = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      if (testLine.length <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        // Handle very long words
        if (word.length > maxWidth) {
          for (let i = 0; i < word.length; i += maxWidth) {
            lines.push(word.substring(i, Math.min(i + maxWidth, word.length)));
          }
          currentLine = '';
        } else {
          currentLine = word;
        }
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Add text at position
  addText(text, x, y, options = {}) {
    const fontSize = options.fontSize || this.fontSize;
    const bold = options.bold || false;
    const gray = options.gray || false;

    const fontRef = bold ? '/F2' : '/F1';
    const colorCmd = gray ? '0.4 0.4 0.4 rg' : '0 0 0 rg';
    const encoded = this.encodeText(text);

    this.currentPageContent += `${colorCmd}\n`;
    this.currentPageContent += `BT\n`;
    this.currentPageContent += `${fontRef} ${fontSize} Tf\n`;
    this.currentPageContent += `${x.toFixed(2)} ${y.toFixed(2)} Td\n`;
    this.currentPageContent += `(${encoded}) Tj\n`;
    this.currentPageContent += `ET\n`;
  }

  // Add a line
  addLine(x1, y1, x2, y2) {
    this.currentPageContent += '0.8 0.8 0.8 RG\n';
    this.currentPageContent += '0.5 w\n';
    this.currentPageContent += `${x1.toFixed(2)} ${y1.toFixed(2)} m\n`;
    this.currentPageContent += `${x2.toFixed(2)} ${y2.toFixed(2)} l\n`;
    this.currentPageContent += 'S\n';
  }

  // Start new page
  newPage() {
    if (this.currentPageContent) {
      this.pageContents.push(this.currentPageContent);
    }
    this.currentPageContent = '';
    this.currentY = this.pageHeight - this.margin;
  }

  // Check if need new page
  checkNewPage(neededHeight = 30) {
    if (this.currentY < this.margin + neededHeight) {
      this.newPage();
      return true;
    }
    return false;
  }

  // Add title
  addTitle(text) {
    this.checkNewPage(40);
    const lines = this.wrapText(text, 70);
    for (const line of lines) {
      this.addText(line, this.margin, this.currentY, { fontSize: 18, bold: true });
      this.currentY -= 24;
    }
    this.currentY -= 10;
  }

  // Add metadata
  addMeta(label, value) {
    this.checkNewPage();
    const text = `${label}: ${value}`;
    const truncated = text.length > 100 ? text.substring(0, 97) + '...' : text;
    this.addText(truncated, this.margin, this.currentY, { fontSize: 9, gray: true });
    this.currentY -= 14;
  }

  // Add separator line
  addSeparator() {
    this.checkNewPage();
    this.addLine(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
    this.currentY -= 20;
  }

  // Add heading
  addHeading(text, level = 2) {
    this.currentY -= 10;
    this.checkNewPage(30);
    const fontSize = level === 1 ? 16 : (level === 2 ? 14 : 12);
    const lines = this.wrapText(text, level === 1 ? 65 : 75);
    for (const line of lines) {
      this.addText(line, this.margin, this.currentY, { fontSize, bold: true });
      this.currentY -= fontSize + 6;
    }
    this.currentY -= 4;
  }

  // Add paragraph
  addParagraph(text) {
    if (!text || !text.trim()) {
      this.currentY -= this.lineHeight * 0.5;
      return;
    }

    const lines = this.wrapText(text.trim(), 90);
    for (const line of lines) {
      this.checkNewPage();
      this.addText(line, this.margin, this.currentY, { fontSize: this.fontSize });
      this.currentY -= this.lineHeight;
    }
    this.currentY -= this.lineHeight * 0.3;
  }

  // Add body text (handles multiple paragraphs)
  addBody(text) {
    if (!text) return;

    // Split by double newlines for paragraphs, single newlines within paragraphs
    const paragraphs = text.split(/\n\s*\n/);

    for (const para of paragraphs) {
      if (!para.trim()) continue;

      // Check if this looks like a heading (short, possibly uppercase or starts with #)
      const trimmed = para.trim();
      if (trimmed.startsWith('#')) {
        const level = (trimmed.match(/^#+/) || [''])[0].length;
        const headingText = trimmed.replace(/^#+\s*/, '');
        this.addHeading(headingText, Math.min(level, 3));
      } else if (trimmed.length < 80 && /^[A-Z][^.!?]*$/.test(trimmed)) {
        // Looks like a heading (short, starts with capital, no ending punctuation)
        this.addHeading(trimmed, 2);
      } else {
        // Regular paragraph - join single newlines
        const normalized = para.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        this.addParagraph(normalized);
      }
    }
  }

  // Generate PDF
  generate() {
    // Finalize current page
    if (this.currentPageContent) {
      this.pageContents.push(this.currentPageContent);
    }

    if (this.pageContents.length === 0) {
      this.pageContents.push('');
    }

    const objects = [];

    // Object 1: Catalog
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');

    // Object 2: Pages (placeholder)
    objects.push(null);

    // Object 3: Font Helvetica
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');

    // Object 4: Font Helvetica-Bold
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');

    const pageObjNums = [];
    let nextObj = 5;

    // Create page objects
    for (const content of this.pageContents) {
      // Stream object
      const streamObj = nextObj++;
      objects.push(`<< /Length ${content.length} >>\nstream\n${content}endstream`);

      // Page object
      const pageObj = nextObj++;
      objects.push(
        `<< /Type /Page /Parent 2 0 R ` +
        `/MediaBox [0 0 ${this.pageWidth.toFixed(2)} ${this.pageHeight.toFixed(2)}] ` +
        `/Contents ${streamObj} 0 R ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> >>`
      );
      pageObjNums.push(pageObj);
    }

    // Fill in Pages object
    objects[1] = `<< /Type /Pages /Kids [${pageObjNums.map(n => n + ' 0 R').join(' ')}] /Count ${pageObjNums.length} >>`;

    // Build PDF
    let pdf = '%PDF-1.4\n';
    pdf += '%\xE2\xE3\xCF\xD3\n';

    const offsets = [];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }

    // Xref
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
    pdf += '%%EOF\n';

    return pdf;
  }

  // Create PDF from content
  static fromContent(content) {
    const pdf = new PagePDF();

    // Title
    pdf.addTitle(content.title || 'Untitled');

    // Metadata
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
      try {
        pdf.addMeta('Saved', new Date(content.timestamp).toLocaleString());
      } catch (e) {
        pdf.addMeta('Saved', content.timestamp);
      }
    }

    pdf.addSeparator();

    // Body
    if (content.bodyText) {
      pdf.addBody(content.bodyText);
    }

    return pdf.generate();
  }
}

// Also keep SimplePDF as alias for compatibility
window.SimplePDF = PagePDF;
window.PagePDF = PagePDF;

console.log('PageCub: PDF library loaded');
