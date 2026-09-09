import { extractIED } from './mbg-parse-scl.js';

/** Helper function to download a CID file for the requested IED */
export function downloadIED(ied, extensionType) {
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
