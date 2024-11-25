import { LitElement, html } from 'lit';
import '@material/web/dialog/dialog.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';

function extractCommunication(ied) {
  const comm = ied.ownerDocument.querySelector(':root>Communication');
  const connAPs = Array.from(
    ied.ownerDocument.querySelectorAll(
      `:root>Communication>SubNetwork>ConnectedAP[iedName="${ied.getAttribute('name')}"]`,
    ),
  );
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

function extractIED(ied) {
  const doc = document.implementation.createDocument(
    'http://www.iec.ch/61850/2003/SCL',
    'SCL',
  );
  doc.documentElement.appendChild(extractCommunication(ied));
  doc.documentElement.appendChild(ied.cloneNode(true));
  doc.documentElement.appendChild(
    ied.ownerDocument.querySelector(':root>DataTypeTemplates')?.cloneNode(true),
  );
  // TODO: wrap the XML doc with a pretty-printed version
  return new XMLSerializer().serializeToString(doc);
}

function downloadIED(ied) {
  const hiddenElement = document.createElement('a');
  hiddenElement.href = `data:application/xml,${encodeURI(extractIED(ied))}`;
  hiddenElement.target = '_blank';
  hiddenElement.download = `${ied.getAttribute('name')}.xml`;
  document.body.appendChild(hiddenElement);
  hiddenElement.click();
  document.body.removeChild(hiddenElement);
}

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
