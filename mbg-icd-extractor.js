import { LitElement, html } from 'lit';
import '@material/web/dialog/dialog.js';

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
        <div slot="headline">Choose your favorite pet</div>
        <form id="form" slot="content" method="dialog">
          <label>
            <md-radio
              name="pet"
              value="cats"
              aria-label="Cats"
              touch-target="wrapper"
              checked
            ></md-radio>
            <span aria-hidden="true">Cats</span>
          </label>
          <label>
            <md-radio
              name="pet"
              value="dogs"
              aria-label="Dogs"
              touch-target="wrapper"
            ></md-radio>
            <span aria-hidden="true">Dogs</span>
          </label>
          <label>
            <md-radio
              name="pet"
              value="birds"
              aria-label="Birds"
              touch-target="wrapper"
            ></md-radio>
            <span aria-hidden="true">Birds</span>
          </label>
        </form>
        <div slot="actions">
          <md-text-button form="form" value="cancel">Cancel</md-text-button>
          <md-text-button form="form" value="ok">OK</md-text-button>
        </div>
      </md-dialog>
    `;
  }
}
