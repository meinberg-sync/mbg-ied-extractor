import { LitElement, html } from 'lit';
import '@material/web/dialog/dialog.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';

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

  // create an array of all ConnectedAP elements in the Communication section
  const connAPs = Array.from(
    ied.ownerDocument.querySelectorAll(
      `:root>Communication>SubNetwork>ConnectedAP[iedName="${ied.getAttribute('name')}"]`,
    ),
  );

  // for each ConnectedAP, clone its SubNetwork and append it to the Communication section
  connAPs.forEach(connAP => {
    const subnet = connAP.closest('SubNetwork');
    let clonedSubnet = comm.querySelector(
      `SubNetwork[name="${subnet.getAttribute('name')}"]`,
    );
    if (!clonedSubnet) {
      clonedSubnet = subnet.cloneNode(false);
      comm.appendChild(clonedSubnet);
    }
    const clonedConnAP = connAP.cloneNode(true);
    clonedSubnet.appendChild(clonedConnAP);
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

  // TODO: wrap the XML doc with a pretty-printed version
  return new XMLSerializer().serializeToString(doc);
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
            this.doc?.querySelectorAll('IED[manufacturer^="Meinberg"]'),
          ).map(
            ied =>
              html`<md-list-item type="button" @click=${() => downloadIED(ied)}
                >${ied.getAttribute('name')}</md-list-item
              >`,
          )}
        </md-list>
        <div slot="actions">
          <md-text-button form="form" value="cancel">Cancel</md-text-button>
          <md-text-button form="form" value="ok">OK</md-text-button>
        </div>
      </md-dialog>
    `;
  }
}
