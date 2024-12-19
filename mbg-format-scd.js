/** Helper function to identify escape XML entities in a string */
function escapeXML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/* Helper function to normalize CDATA content */
function normalizeCDATA(content) {
  // Replace CRLF (\r\n) and CR (\r) with LF (\n)
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Helper function to format attributes */
function formatAttributes(element) {
  return Array.from(element.attributes)
    .map(attr => `${attr.name}="${escapeXML(attr.value)}"`)
    .join(' ');
}

/** Helper function to recursively format tags */
function formatNode(node, indentLevel = 0) {
  const INDENT = '  ';
  const indent = INDENT.repeat(indentLevel);

  if (node.nodeType === Node.TEXT_NODE) {
    const textContent = node.textContent.trim();
    return textContent ? escapeXML(textContent) : null;
  }

  if (node.nodeType === Node.CDATA_SECTION_NODE) {
    const content = normalizeCDATA(node.nodeValue);
    return `${indent}<![CDATA[${content}]]>`;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const { tagName } = node;
    const attributes = formatAttributes(node);
    const children = Array.from(node.childNodes);

    // Special handling for <Private> tags with CDATA content
    if (
      tagName === 'Private' &&
      children.some(child => child.nodeType === Node.CDATA_SECTION_NODE)
    ) {
      const openingTag = attributes
        ? `${indent}<${tagName} ${attributes}>`
        : `${indent}<${tagName}>`;
      const cdataNode = children.find(
        child => child.nodeType === Node.CDATA_SECTION_NODE,
      );
      const cdataContent = formatNode(cdataNode, indentLevel + 1);
      return `${openingTag}\n${cdataContent}\n${indent}</${tagName}>`;
    }

    // Handle self-closing tags
    if (children.length === 0) {
      return attributes
        ? `${indent}<${tagName} ${attributes}/>`
        : `${indent}<${tagName}/>`;
    }

    // Check if element has a single text node with a value
    if (
      children.length === 1 &&
      children[0].nodeType === Node.TEXT_NODE &&
      children[0].textContent.trim()
    ) {
      const textContent = escapeXML(children[0].textContent.trim());
      return attributes
        ? `${indent}<${tagName} ${attributes}>${textContent}</${tagName}>`
        : `${indent}<${tagName}>${textContent}</${tagName}>`;
    }

    // Otherwise, format opening tag, children, and closing tag
    const openingTag = attributes
      ? `${indent}<${tagName} ${attributes}>`
      : `${indent}<${tagName}>`;
    const closingTag = `${indent}</${tagName}>`;
    const formattedChildren = children
      .map(child => formatNode(child, indentLevel + 1))
      .filter(child => child !== null)
      .join('\n');
    return `${openingTag}\n${formattedChildren}\n${closingTag}`;
  }

  return null;
}

/** Helper function to convert input to a Document if it is a string */
function getDocument(input) {
  let doc;

  if (typeof input === 'string') {
    // If it is a string, parse and check for errors
    const parser = new DOMParser();
    doc = parser.parseFromString(input, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Invalid XML string provided.');
    }
  } else if (input instanceof Document) {
    doc = input;
  } else {
    throw new Error('Input must be a valid XML string or Document.');
  }

  return doc;
}

/**
 * Public helper function to fix formatting of a new SCD/CID/ICD document
 * @param {string|Document} input The XML string or Document to be formatted
 */
export function formatNewSCD(input) {
  const doc = getDocument(input);

  // Start formatting from the document's root
  const root = doc.documentElement;
  const formatted = `${formatNode(root)}\n`;

  // Prepend the XML declaration if it is missing
  const xmlDeclaration = '<?xml version="1.0" encoding="utf-8"?>\n';
  if (!formatted.startsWith(xmlDeclaration)) {
    return xmlDeclaration + formatted;
  }
  return formatted;
}
