import { LitElement, html, css } from 'lit';
import { formatNewSCD } from './mbg-format-scd.js';
import { RULES, SEVERITY_LABELS, validateSCL } from './mbg-validate-scl.js';

import '@material/web/dialog/dialog.js';
import '@material/web/list/list.js';
import '@material/web/list/list-item.js';
import '@material/web/button/outlined-button.js';
import '@material/web/button/text-button.js';
import '@material/web/radio/radio.js';
import '@material/web/icon/icon.js';

const EXTENSION_TYPES = [
  { value: '.cid', label: 'CID' },
  { value: '.icd', label: 'ICD' },
  { value: '.iid', label: 'IID' },
];

const STATUS_ICONS = {
  passed: 'check_circle',
  warning: 'warning',
  error: 'error',
};

function renderStatusIcon(status) {
  const glyph = STATUS_ICONS[status] ?? 'radio_button_unchecked';
  return html`
    <md-icon slot="icon" class="status-icon ${status ?? 'none'}"
      >${glyph}</md-icon
    >
  `;
}

function renderRuleCard(rule) {
  return html`
    <li class="rule-card">
      <div class="rule-header">
        <span class="rule-id">${rule.id}</span>
        <span class="rule-title">${rule.title}</span>
        <span class="rule-severity ${rule.severity}"
          >${SEVERITY_LABELS[rule.severity]}</span
        >
      </div>
      <p class="rule-why">${rule.why}</p>
      <div class="rule-meta">${rule.element}</div>
    </li>
  `;
}

function meinbergFirst(a, b) {
  if (a.toLowerCase().startsWith('meinberg')) return -1;
  if (b.toLowerCase().startsWith('meinberg')) return 1;
  return 0;
}

function groupIedsByManufacturer(doc) {
  const iedsByManufacturer = {};
  doc?.querySelectorAll(':root > IED').forEach(ied => {
    const manufacturer = ied.getAttribute('manufacturer')
      ? ied.getAttribute('manufacturer')
      : 'Undefined';
    if (!iedsByManufacturer[manufacturer])
      iedsByManufacturer[manufacturer] = [];
    iedsByManufacturer[manufacturer].push(ied);
  });
  const manufacturers = Object.keys(iedsByManufacturer).sort(meinbergFirst);
  return { manufacturers, iedsByManufacturer };
}

function cloneAttributes(destElement, sourceElement) {
  const attributes = Array.prototype.slice.call(sourceElement.attributes);
  attributes.forEach(attr => destElement.setAttribute(attr.name, attr.value));
}

/** Helper function to extract the communication details about the IED */
function extractCommunication(ied) {
  // fetch the Communication section from the parent SCD file
  const comm = ied.ownerDocument
    .querySelector(':root>Communication')
    ?.cloneNode(true);

  // return if it does not exist
  if (typeof comm === 'undefined') {
    return comm;
  }

  // create an array of ConnectedAP elements NOT related to the requested IED.
  const notConnAPs = Array.from(
    comm.querySelectorAll(
      `ConnectedAP:not([iedName="${ied.getAttribute('name')}"])`,
    ),
  );

  // filter out the elements that are not related to the requested IED
  notConnAPs.forEach(notConnAP => {
    const subnet = notConnAP.closest('SubNetwork');
    subnet.removeChild(notConnAP);
    if (!subnet.querySelector('ConnectedAP')) {
      comm.removeChild(subnet);
    }
  });

  return comm;
}

/* Helper function to recursively get all DA and nested BDA types */
function getNestedEltsInDaTypes(templates, daTypeElement, allDATypes = []) {
  const daTypeId = daTypeElement.getAttribute('id');
  if (!allDATypes.includes(daTypeId)) {
    allDATypes.push(daTypeId);
  }
  Array.from(daTypeElement.querySelectorAll('BDA')).forEach(bda => {
    const bdaTypeId = bda.getAttribute('type');
    if (bdaTypeId && !allDATypes.includes(bdaTypeId)) {
      allDATypes.push(bdaTypeId);
      const bdaTypeElement = templates.querySelector(
        `DAType[id="${bdaTypeId}"]`,
      );
      if (bdaTypeElement) {
        getNestedEltsInDaTypes(templates, bdaTypeElement, allDATypes);
      }
    }
  });
  return allDATypes;
}

/* Helper function to recursively get all DO and nested SDO and DA types */
function getNestedEltsInDoTypes(
  templates,
  doTypeElement,
  allDOTypes = [],
  daTypes = [],
) {
  const doTypeId = doTypeElement.getAttribute('id');
  if (!allDOTypes.includes(doTypeId)) {
    allDOTypes.push(doTypeId);
  }

  Array.from(doTypeElement.querySelectorAll('DA')).forEach(da => {
    const daTypeId = da.getAttribute('type');
    if (daTypeId && !daTypes.includes(daTypeId)) {
      daTypes.push(daTypeId);
    }
  });

  Array.from(doTypeElement.querySelectorAll('SDO')).forEach(sdo => {
    const sdoTypeId = sdo.getAttribute('type');
    if (sdoTypeId && !allDOTypes.includes(sdoTypeId)) {
      allDOTypes.push(sdoTypeId);
      const sdoTypeElement = templates.querySelector(
        `DOType[id="${sdoTypeId}"]`,
      );
      if (sdoTypeElement) {
        getNestedEltsInDoTypes(templates, sdoTypeElement, allDOTypes, daTypes);
      }
    }
  });

  return [allDOTypes, daTypes];
}

/** Helper function to extract data type templates used by the IED */
function extractTemplates(ied) {
  const templates = ied.ownerDocument
    .querySelector(':root>DataTypeTemplates')
    ?.cloneNode(true);

  const lnTypes = [];
  Array.from(ied.querySelectorAll('LN0, LN')).forEach(ln => {
    if (!lnTypes.includes(ln.getAttribute('lnType'))) {
      lnTypes.push(ln.getAttribute('lnType'));
    }
  });

  // get the initial list of DO types
  const doTypes = [];
  const daTypes = [];
  lnTypes.forEach(ln => {
    const lnType = templates.querySelector(`LNodeType[id="${ln}"]`);
    if (lnType) {
      Array.from(lnType.querySelectorAll('DO')).forEach(doType => {
        const doTypeId = doType.getAttribute('type');
        if (!doTypes.includes(doTypeId)) {
          const doTypeElement = templates.querySelector(
            `DOType[id="${doTypeId}"]`,
          );
          if (doTypeElement) {
            // find all nested DA and SDO types in each DO type
            getNestedEltsInDoTypes(templates, doTypeElement, doTypes, daTypes);
          }
        }
      });
    }
  });

  daTypes.forEach(daType => {
    const daTypeElement = templates.querySelector(`DAType[id="${daType}"]`);
    if (daTypeElement) {
      getNestedEltsInDaTypes(templates, daTypeElement, daTypes);
    }
  });

  // combine all found types into one array
  const foundTypes = [...lnTypes, ...doTypes, ...daTypes];

  // remove all types not used by the requested IED
  Array.from(
    templates.querySelectorAll('LNodeType, DOType, DAType, EnumType'),
  ).forEach(element => {
    if (!foundTypes.includes(element.getAttribute('id'))) {
      templates.removeChild(element);
    }
  });

  return templates;
}

/** Helper function to create a doc with the IED and its related information */
function extractIED(ied) {
  const doc = document.implementation.createDocument(
    'http://www.iec.ch/61850/2003/SCL',
    'SCL',
  );

  // ensure schema revision and namespace definitions are transferred
  const scl = ied.ownerDocument.documentElement;
  cloneAttributes(doc.documentElement, scl);

  // extract the requested IED and its related information
  const header = ied.ownerDocument
    .querySelector(':root>Header')
    ?.cloneNode(true);
  const comm = extractCommunication(ied);
  const iedElement = ied.cloneNode(true);
  const templates = extractTemplates(ied);

  // add elements to the new document
  if (typeof header !== 'undefined') {
    doc.documentElement.appendChild(header);
  }
  if (typeof comm !== 'undefined') {
    doc.documentElement.appendChild(comm);
  }
  doc.documentElement.appendChild(iedElement);
  if (typeof templates !== 'undefined') {
    doc.documentElement.appendChild(templates);
  }

  return formatNewSCD(doc);
}

/** Helper function to download a CID file for the requested IED */
function downloadIED(ied, extensionType) {
  // use blob to handle files of any size
  const extractedIED = extractIED(ied);
  const blob = new Blob([extractedIED], { type: 'application/xml' });
  const blobURL = URL.createObjectURL(blob);

  const hiddenElement = document.createElement('a');
  hiddenElement.href = blobURL;
  hiddenElement.target = '_blank';
  hiddenElement.download = `${ied.getAttribute('name')}${extensionType}`;
  document.body.appendChild(hiddenElement);
  hiddenElement.click();
  document.body.removeChild(hiddenElement);
}

/** Web Component to extract an IED and download it in a separate CID file */
export default class MbgIcdExtractor extends LitElement {
  static properties = {
    doc: {},
    selectedIED: { type: Object },
    extensionType: { type: String },
    editCount: { type: Number },
    showValidationRules: { type: Boolean },
    validationResults: { type: Array },
    extensionStatuses: { type: Object },
  };

  constructor() {
    super();
    // set default extension type
    this.extensionType = '.cid';
    // set default validation rules visibility
    this.showValidationRules = false;
    // rules the selected IED currently fails, populated on download attempt
    this.validationResults = [];
    // per-extension-type validation status for the selected IED
    this.extensionStatuses = {};
  }

  run() {
    this.shadowRoot.querySelector('md-dialog').show();
  }

  willUpdate() {
    if (this.showValidationRules) return;
    if (this.selectedIED && this.doc?.contains(this.selectedIED)) return;

    const { manufacturers, iedsByManufacturer } = groupIedsByManufacturer(
      this.doc,
    );

    // default to the first listed IED
    const firstIed = iedsByManufacturer[manufacturers[0]]?.[0];
    if (firstIed) {
      this.selectedIED = firstIed;
      this._updateExtensionStatuses();
    }
  }

  _toggleDownloadButton(hide) {
    const downloadButton = this.shadowRoot.querySelector('.download-ied');
    if (downloadButton) {
      downloadButton.style.display = hide ? 'none' : 'block';
    }
  }

  displayValidationRules() {
    this.showValidationRules = !this.showValidationRules;
    this.validationResults = [];
    this._toggleDownloadButton(this.showValidationRules);
  }

  _updateExtensionStatuses() {
    if (!this.selectedIED) {
      this.extensionStatuses = {};
      return;
    }

    const extractedIED = extractIED(this.selectedIED);
    const statuses = {};

    // compute pass/warning/error status for every extension type
    EXTENSION_TYPES.forEach(({ value }) => {
      const results = validateSCL(extractedIED, value);
      const failingIds = new Set(
        results.filter(result => !result.passed).map(result => result.id),
      );
      const rules = RULES[value].filter(rule => failingIds.has(rule.id));
      let status = 'passed';
      if (rules.some(rule => rule.severity === 'error')) {
        status = 'error';
      } else if (rules.length > 0) {
        status = 'warning';
      }
      statuses[value] = { status, rules };
    });
    this.extensionStatuses = statuses;
  }

  _handleIedSelection(e) {
    const selectedRadio = e.target;
    if (selectedRadio) {
      const iedName = selectedRadio.getAttribute('value');
      this.selectedIED = this.doc?.querySelector(
        `:root > IED[name="${iedName}"]`,
      );
    }
    this.validationResults = [];
    this._updateExtensionStatuses();
  }

  _handleExtensionSelection(e) {
    const selectedButton = e.currentTarget;
    if (selectedButton) {
      this.extensionType = selectedButton.getAttribute('value');
    }
    this.validationResults = [];
  }

  _handleDownload() {
    if (!this.selectedIED) return;

    const status = this.extensionStatuses[this.extensionType];
    if (!status || status.status !== 'error') {
      downloadIED(this.selectedIED, this.extensionType);
      return;
    }

    this.validationResults = status.rules;
  }

  _renderExtensionStatusDetails() {
    const status = this.extensionStatuses[this.extensionType];
    if (!status || status.rules.length === 0) return '';

    const label = this.extensionType.slice(1).toUpperCase();
    const count =
      status.rules.length === 1 ? '1 issue' : `${status.rules.length} issues`;

    return html`
      <details class="status-details">
        <summary class="status-summary ${status.status}">
          ${count} found for ${label}
          <md-icon class="status-chevron">expand_more</md-icon>
        </summary>
        <ul class="validation-rules-list">
          ${status.rules.map(renderRuleCard)}
        </ul>
      </details>
    `;
  }

  _handleContinueDownload() {
    downloadIED(this.selectedIED, this.extensionType);
    this.validationResults = [];
  }

  _handleBackToSelection() {
    this.validationResults = [];
  }

  renderContent(manufacturers, iedsByManufacturer) {
    if (this.showValidationRules) {
      return html`
        <div slot="content" class="validation-rules">
          <ul class="validation-rules-list">
            ${RULES[this.extensionType].map(renderRuleCard)}
          </ul>
        </div>
      `;
    }

    if (this.validationResults.length > 0) {
      const hasBlockingResult = this.validationResults.some(
        rule => rule.severity === 'error',
      );
      const ruleCount =
        this.validationResults.length === 1
          ? '1 validation rule'
          : `${this.validationResults.length} validation rules`;

      return html`
        <div slot="content" class="validation-rules">
          <p
            class="validation-summary ${hasBlockingResult
              ? 'error'
              : 'warning'}"
          >
            This ${this.extensionType.slice(1).toUpperCase()} file doesn't pass
            ${ruleCount}:
          </p>
          <ul class="validation-rules-list">
            ${this.validationResults.map(renderRuleCard)}
          </ul>
        </div>
      `;
    }

    return html`
      <form slot="content">
        ${manufacturers.map(
          manufacturer => html`
            <div>
              <div slot="headline" class="manufacturer">${manufacturer}</div>
              ${iedsByManufacturer[manufacturer].map(ied => {
                const description = ied.getAttribute('desc');
                return html`
                  <label class="ied-option">
                    <md-radio
                      name="ied"
                      value="${ied.getAttribute('name')}"
                      aria-label="${ied.getAttribute('name')}"
                      touch-target="wrapper"
                      ?checked=${this.selectedIED === ied}
                      @change=${this._handleIedSelection}
                    ></md-radio>
                    <span class="ied-text">
                      <span class="ied-name">${ied.getAttribute('name')}</span>
                      ${description
                        ? html`<span class="ied-description"
                            >${description}</span
                          >`
                        : ''}
                    </span>
                  </label>
                `;
              })}
            </div>
          `,
        )}
      </form>
    `;
  }

  render() {
    const { manufacturers, iedsByManufacturer } = groupIedsByManufacturer(
      this.doc,
    );

    return html`
      <md-dialog class="ied-extractor">
        <div slot="headline" class="headline">
          IED Extractor
          <md-text-button
            id="validation-rules"
            @click=${this.displayValidationRules}
            >${this.showValidationRules
              ? 'Back'
              : 'Validation Rules'}</md-text-button
          >
        </div>

        ${this.renderContent(manufacturers, iedsByManufacturer)}

        <div slot="actions" class="actions">
          <p>Select a file extension:</p>
          <form
            id="file-extension"
            slot="content"
            role="group"
            aria-label="Export file extension"
          >
            ${EXTENSION_TYPES.map(
              ({ value, label }) => html`
                <md-outlined-button
                  class=${this.extensionType === value ? 'selected' : ''}
                  type="button"
                  name="extension"
                  value=${value}
                  aria-label=${label}
                  aria-pressed=${this.extensionType === value}
                  touch-target="wrapper"
                  @click=${this._handleExtensionSelection}
                  >${renderStatusIcon(this.extensionStatuses[value]?.status)}
                  ${label}</md-outlined-button
                >
              `,
            )}
          </form>
          ${this._renderExtensionStatusDetails()}
          <div class="action-buttons">
            ${this.validationResults.length > 0
              ? html`
                  <md-text-button
                    class="back-to-selection"
                    @click=${this._handleBackToSelection}
                    >Back</md-text-button
                  >
                  <md-text-button
                    class="continue-anyway"
                    @click=${this._handleContinueDownload}
                    >Continue anyway</md-text-button
                  >
                `
              : html`
                  <md-text-button
                    class="download-ied"
                    ?disabled=${!this.selectedIED}
                    ?hidden=${this.showValidationRules}
                    @click=${this._handleDownload}
                    >Download</md-text-button
                  >
                  <md-text-button
                    class="close-extractor"
                    @click=${() =>
                      this.shadowRoot.querySelector('md-dialog').close()}
                    >Close</md-text-button
                  >
                `}
          </div>
        </div>
      </md-dialog>
    `;
  }

  static styles = css`
    * {
      --md-sys-color-surface-container-high: var(--oscd-base2);
      --md-sys-color-surface: var(--oscd-base2);
      --md-sys-color-on-surface: var(--oscd-base01);
      --md-sys-color-on-surface-variant: var(--oscd-base01);
      --md-sys-color-primary: var(--oscd-primary);

      --md-dialog-container-shape: 16px;

      --md-text-button-container-shape: 8px;
      --md-text-button-container-height: 32px;

      --md-outlined-button-label-text-color: var(--md-sys-color-on-surface);

      --mbg-ied-warning-color: #9a6700;
      --mbg-ied-success-color: #2e7d32;
    }

    .ied-extractor {
      width: 100%;
      max-width: 560px;
    }

    div.manufacturer {
      color: var(--oscd-base00);
    }

    div.actions {
      display: flex;
      flex-flow: column;
    }

    .actions p {
      margin-top: auto;
      margin-bottom: auto;
      font: 14px var(--oscd-text-font);
      color: var(--oscd-base00);
    }

    #validation-rules {
      --md-text-button-leading-space: 6px;
      --md-text-button-trailing-space: 6px;
      --md-text-button-container-shape: 6px;
      --md-text-button-container-height: auto;
      --md-text-button-label-text-weight: 400;
    }

    #file-extension {
      display: flex;
      align-items: center;
      width: 100%;
      margin-bottom: auto;
      gap: 8px;
    }

    #file-extension > md-outlined-button {
      flex: 1;
    }

    #file-extension > md-outlined-button.selected {
      --md-outlined-button-label-text-color: var(--md-sys-color-primary);
      --md-outlined-button-outline-color: var(--md-sys-color-primary);
      --md-outlined-button-outline-width: 2px;
    }

    .status-icon {
      --md-icon-size: 18px;
    }

    .status-icon.passed {
      color: var(--mbg-ied-success-color);
    }

    .status-icon.warning {
      color: var(--mbg-ied-warning-color);
    }

    .status-icon.error {
      color: var(--md-sys-color-error, #c62828);
    }

    .status-icon.none {
      color: var(--oscd-base00);
    }

    .status-details {
      margin: 4px 0 0;
      border-radius: 12px;
      border: 1px solid color-mix(in srgb, var(--oscd-base01) 12%, transparent);
      overflow: hidden;
    }

    .status-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      cursor: pointer;
      font: 13px var(--oscd-text-font);
      list-style: none;
    }

    .status-summary::-webkit-details-marker {
      display: none;
    }

    .status-summary::marker {
      content: '';
    }

    .status-summary.warning {
      color: var(--mbg-ied-warning-color);
      background: color-mix(
        in srgb,
        var(--mbg-ied-warning-color) 15%,
        transparent
      );
    }

    .status-summary.error {
      color: var(--md-sys-color-error, #c62828);
      background: color-mix(
        in srgb,
        var(--md-sys-color-error, #c62828) 15%,
        transparent
      );
    }

    .status-chevron {
      --md-icon-size: 18px;
      margin-left: auto;
      transition: transform 0.15s ease;
    }

    .status-details[open] .status-chevron {
      transform: rotate(180deg);
    }

    .status-details .validation-rules-list {
      padding: 8px;
    }

    .ied-option {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0.5rem 0;
      cursor: pointer;
    }

    .ied-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .ied-name {
      font-size: 16px;
    }

    .ied-description {
      color: var(--oscd-base00);
      font-size: 12px;
    }

    label {
      font-family: var(--oscd-theme-text-font, 'Roboto');
      color: var(--oscd-base01);
    }

    .headline,
    .action-buttons {
      display: flex;
      justify-content: space-between;
    }

    .validation-rules-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .rule-card {
      font-family: var(--oscd-theme-text-font, 'Roboto');
      border-radius: 12px;
      padding: 12px 16px;
      background: color-mix(in srgb, var(--oscd-base01) 6%, transparent);
    }

    .rule-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rule-id {
      font-family: monospace;
      font-size: 12px;
      color: var(--oscd-base00);
    }

    .rule-title {
      flex: 1;
      font-size: 15px;
      font-weight: 600;
      color: var(--oscd-base01);
    }

    .rule-severity {
      flex-shrink: 0;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 12px;
      line-height: 1.4;
    }

    .rule-severity.error {
      color: var(--md-sys-color-error, #c62828);
      background: color-mix(
        in srgb,
        var(--md-sys-color-error, #c62828) 15%,
        transparent
      );
    }

    .rule-severity.warning {
      color: var(--mbg-ied-warning-color);
      background: color-mix(
        in srgb,
        var(--mbg-ied-warning-color) 15%,
        transparent
      );
    }

    .rule-card .rule-why {
      margin: 6px 0 4px;
      font-size: 13px;
      line-height: 1.4;
      color: var(--oscd-base01);
    }

    .rule-meta {
      font-size: 10px;
      color: var(--oscd-base00);
    }

    .validation-summary {
      margin: 0 0 8px;
      font: 14px var(--oscd-text-font);
    }

    .validation-summary.error {
      color: var(--md-sys-color-error, #c62828);
    }

    .validation-summary.warning {
      color: var(--mbg-ied-warning-color);
    }

    .close-extractor {
      --md-sys-color-primary: var(--md-sys-color-error, red);
    }

    .continue-anyway {
      --md-sys-color-primary: var(--mbg-ied-warning-color);
    }
  `;
}
