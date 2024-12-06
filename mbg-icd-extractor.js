import { LitElement, html, css } from 'lit';
import { formatNewSCD } from './mbg-format-scd.js';

import '@material/web/dialog/dialog.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/button/text-button.js';

function meinbergFirst(a, b) {
  if (a.toLowerCase().startsWith('meinberg')) return -1;
  if (b.toLowerCase().startsWith('meinberg')) return 1;
  return 0;
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
    // if the SubNetwork has no more ConnectedAP elements, remove it
    if (!subnet.querySelector('ConnectedAP')) {
      comm.removeChild(subnet);
    }
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

  return formatNewSCD(doc);
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
  hiddenElement.download = `${ied.getAttribute('name')}.cid`;
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
    const iedsByManufacturer = [];
    this.doc?.querySelectorAll(':root > IED').forEach(ied => {
      const manufacturer = ied.getAttribute('manufacturer')
        ? ied.getAttribute('manufacturer')
        : 'Undefined';
      if (!iedsByManufacturer[manufacturer])
        iedsByManufacturer[manufacturer] = [];
      iedsByManufacturer[manufacturer].push(ied);
    });
    const manufacturers = Object.keys(iedsByManufacturer).sort(meinbergFirst);

    return html`
      <md-dialog>
        <div slot="headline">Choose the IED</div>
        <md-list slot="content">
          ${manufacturers.map(
            manufacturer => html`
              <md-list-group>
                <div slot="headline" class="manufacturer">${manufacturer}</div>
                ${iedsByManufacturer[manufacturer].map(
                  ied => html`
                    <md-list-item
                      type="button"
                      @click=${() => downloadIED(ied)}
                    >
                      ${ied.getAttribute('name')}
                    </md-list-item>
                  `,
                )}
              </md-list-group>
            `,
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

    div.manufacturer {
      color: var(--oscd-base00);
    }
  `;
}
