import { LitElement, html, css } from 'lit';
import '@material/web/dialog/dialog.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/button/text-button.js';

/**
 * Pretty prints an XML document or a serialized XML string.
 * @param {Document | string} input An XML document or a serialized XML string.
 * @returns {string}
 */
function prettyPrintXML(input) {
  let xmlString;

  // If input is an XML document, serialize it to a string.
  if (input instanceof Document) {
    const serializer = new XMLSerializer();
    xmlString = serializer.serializeToString(input);
  } else if (typeof input === 'string') {
    xmlString = input;
  } else {
    throw new Error(
      'Input must be an XML Document or a serialized XML string.',
    );
  }

  // Format the XML string.
  const formatted = [];
  const regex = /(<[^>]+>|[^<]+)/g; // Matches XML tags or text content.
  const tab = '\t'; // Tab for indentation.
  let level = 0;

  // Break XML into individual parts (tags and text content).
  xmlString.replace(regex, match => {
    if (match.startsWith('</')) {
      // Closing tag - decrease indentation level.
      level -= 1;
      formatted.push(`${tab.repeat(level)}${match}`);
    } else if (match.startsWith('<') && match.endsWith('/>')) {
      // Self-closing tag - no change in indentation.
      formatted.push(`${tab.repeat(level)}${match}`);
    } else if (match.startsWith('<')) {
      // Opening tag - add tag and increase indentation level.
      formatted.push(`${tab.repeat(level)}${match}`);
      level += 1;
    } else {
      // Text content - preserve indentation at the current level.
      const trimmedContent = match.trim();
      if (trimmedContent) {
        formatted.push(`${tab.repeat(level)}${trimmedContent}`);
      }
    }
  });

  // Join formatted lines with newlines.
  return formatted.join('\n');
}

/**
 * Takes the IED requested by the user, extracts the Communication section and its contents from the parent file,
 * and a clone of this section with the relevant information.
 *
 * @param {element} ied The <IED /> element from a ICD/CID/SCD file
 * @returns The <Communication /> element with all subnetworks related to the requested IED
 */
function extractCommunication(ied) {
  // fetch the Communication section from the parent file
  const comm = ied.ownerDocument.querySelector(':root>Communication');

  // create an array of ConnectedAP elements NOT related to the requested IED.
  const notConnAPs = Array.from(
    ied.ownerDocument.querySelectorAll(
      `:root>Communication>SubNetwork>ConnectedAP:not([iedName="${ied.getAttribute('name')}"])`,
    ),
  );

  // for each ConnectedAP that is NOT related to the requested IED, remove it and its subnetwork from the Communication section
  notConnAPs.forEach(notConnAP => {
    const subnet = notConnAP.closest('SubNetwork');
    subnet.removeChild(notConnAP);
    comm.removeChild(subnet);
  });

  return comm;
}

/**
 * Creates an XML document containing the requested IED element and its related information from the ICD/CID/SCD file
 *
 * @param {element} ied The <IED /> element from a ICD/CID/SCD file
 * @returns An XML document serialized as a string containing the requested IED
 */
function extractIED(ied) {
  // create a new XML document
  const doc = document.implementation.createDocument(
    'http://www.iec.ch/61850/2003/SCL',
    'SCL',
  );

  // append the requested IED and its related information
  doc.documentElement.appendChild(extractCommunication(ied));
  doc.documentElement.appendChild(ied.cloneNode(true));
  doc.documentElement.appendChild(
    ied.ownerDocument.querySelector(':root>DataTypeTemplates')?.cloneNode(true),
  );

  // return the XML doc with a pretty-printed version
  return prettyPrintXML(doc);
}

/**
 * Creates an XML document containing the requested IED element and its related information from the ICD/CID/SCD file,
 * and then downloads it to the user's device
 *
 * @param {element} ied The <IED /> element from a ICD/CID/SCD file
 */
function downloadIED(ied) {
  const hiddenElement = document.createElement('a');
  hiddenElement.href = `data:application/xml,${encodeURI(extractIED(ied))}`;
  hiddenElement.target = '_blank';
  hiddenElement.download = `${ied.getAttribute('name')}.xml`;
  document.body.appendChild(hiddenElement);
  hiddenElement.click();
  document.body.removeChild(hiddenElement);
}

/**
 * This OpenSCD plugin allows the user to select which IED they want to extract from their SCD file.
 * After selection, the IED is extracted and downloaded to the user's device in an XML file.
 */
export default class MbgIcdExtractor extends LitElement {
  static properties = {
    doc: {},
  };

  run() {
    this.shadowRoot.querySelector('md-dialog').show();
  }

  render() {
    return html`
      <md-dialog>
        <div slot="headline">Choose the IED</div>
        <md-list slot="content">
          ${Array.from(
            this.doc?.querySelectorAll('IED[manufacturer^="Meinberg"]') ?? [],
          ).map(
            ied =>
              html`<md-list-item type="button" @click=${() => downloadIED(ied)}
                >${ied.getAttribute('name')}</md-list-item
              >`,
          )}
        </md-list>
        <div slot="actions">
          <md-text-button
            @click=${() => this.shadowRoot.querySelector('md-dialog').close()}
            >Close</md-text-button
          >
        </div>
      </md-dialog>
    `;
  }

  static styles = css`
    * {
      --md-sys-color-surface-container-high: var(--oscd-base2);
      --md-sys-color-surface: var(--oscd-base2);
      --md-sys-color-on-surface: var(--oscd-base01);
      --md-sys-color-primary: var(--oscd-primary);
    }
  `;
}
