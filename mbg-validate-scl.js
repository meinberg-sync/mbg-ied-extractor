function hasVersionAndRevision(doc) {
  const header = doc.querySelector(':root > Header');
  return (
    !!header &&
    header.hasAttribute('version') &&
    header.hasAttribute('revision')
  );
}

export const RULES = {
  '.icd': [
    {
      id: 'ICD-01',
      severity: 'error',
      element: 'IED@name',
      title: 'IED name must be TEMPLATE',
      why: 'An ICD describes a device type, not an installed instance. The reserved name marks it as unbound.',
      check: doc =>
        doc.querySelector(':root > IED')?.getAttribute('name') === 'TEMPLATE',
    },
    {
      id: 'ICD-02',
      severity: 'error',
      element: 'SCL',
      title: 'Exactly one IED element',
      why: 'A type description covers a single device. Extraction always produces one, so this is a guard against hand edits.',
      check: doc => doc.querySelectorAll(':root > IED').length === 1,
    },
    {
      id: 'ICD-03',
      severity: 'error',
      element: 'Header',
      title: 'Header carries version and revision',
      why: 'The configurator uses these to detect when a vendor ships an updated type.',
      check: hasVersionAndRevision,
    },
    {
      id: 'ICD-04',
      severity: 'error',
      element: 'DataTypeTemplates',
      title: 'DataTypeTemplates section present',
      why: 'Without the type definitions the file describes nothing a configurator can instantiate.',
      check: doc => !!doc.querySelector(':root > DataTypeTemplates'),
    },
    {
      id: 'ICD-05',
      severity: 'error',
      element: 'Process, Line, Substation',
      title: 'Process/Line/Substation top-level name must be TEMPLATE',
      why: 'A functional topology section is optional in a type file, but when included its highest-level name marks it as a template rather than a project-specific single line diagram.',
      check: doc =>
        Array.from(
          doc.querySelectorAll(
            ':root > Process, :root > Line, :root > Substation',
          ),
        ).every(section => section.getAttribute('name') === 'TEMPLATE'),
    },
    {
      id: 'ICD-06',
      severity: 'warning',
      element: 'ConnectedAP',
      title:
        'Communication section is optional and may define default addresses',
      why: "Default addresses aren't required in a type file, but a specific SCSM may make some address parts mandatory — check the applicable SCSM before stripping them.",
    },
    {
      id: 'ICD-07',
      severity: 'warning',
      element: 'LNode',
      title:
        'LN-to-equipment bindings must match the intended process topology',
      why: 'When a process TEMPLATE is defined, each bound logical node must be compatible with the equipment type it references (e.g. a CSWI bound to a CBR controls a circuit breaker; a CILO bound to a line disconnector implements its interlocking logic).',
      // TODO: Requires a logical-node-to-equipment-type compatibility table
    },
  ],
  '.iid': [
    {
      id: 'IID-01',
      severity: 'error',
      element: 'SCL',
      title: 'Exactly one IED element',
      why: 'An IID carries the instantiated configuration of one device being returned to the system configurator.',
      check: doc => doc.querySelectorAll(':root > IED').length === 1,
    },
    {
      id: 'IID-02',
      severity: 'error',
      element: 'IED@name',
      title: 'IED name must not be TEMPLATE',
      why: 'An instance file needs the project name assigned by the system configurator.',
      check: doc =>
        doc.querySelector(':root > IED')?.getAttribute('name') !== 'TEMPLATE',
    },
    {
      id: 'IID-03',
      severity: 'error',
      element: 'Header@id',
      title: 'Header ID is present',
      why: 'The system configurator matches the returned instance back to the project by this identifier.',
      check: doc => !!doc.querySelector(':root > Header')?.getAttribute('id'),
    },
    {
      id: 'IID-04',
      severity: 'warning',
      element: 'Header',
      title: 'Header carries version and revision',
      why: 'Lets the configurator tell which round trip a returned instance came from.',
      check: hasVersionAndRevision,
    },
    {
      id: 'IID-05',
      severity: 'warning',
      element: 'ConnectedAP',
      title: 'Project-specific addresses may already be assigned',
      why: 'Unlike a type file, an IID may carry the network addresses already allocated to this IED for the project.',
    },
    {
      id: 'IID-06',
      severity: 'warning',
      element: 'LNode',
      title:
        'Substation section may already bind LNs to the single line diagram',
      why: "The project's single line topology may already reference this IED's logical nodes ahead of system engineering.",
    },
    {
      id: 'IID-07',
      severity: 'warning',
      element: 'DataSet',
      title:
        'DataSets and control blocks must match the system tool once engineered',
      why: 'On first instantiation they may ship as vendor defaults, but once the project has been engineered, any DataSet or control block definitions must be identical to what the system tool holds.',
    },
    {
      id: 'IID-08',
      severity: 'warning',
      element: 'ExtRef',
      title: 'Unresolved ExtRef bindings are expected mid-engineering',
      why: 'Input sections may reference DATA sources that are not yet bound. Existing ExtRef bindings must stay identical to those from the previously imported SCD; only intAddr links may be added.',
    },
  ],
  '.cid': [
    {
      id: 'CID-01',
      severity: 'error',
      element: 'SCL',
      title: 'Exactly one IED element',
      why: 'A CID configures one physical device for download.',
      check: doc => doc.querySelectorAll(':root > IED').length === 1,
    },
    {
      id: 'CID-02',
      severity: 'error',
      element: 'Communication',
      title: 'ConnectedAP for this IED',
      why: 'The device cannot be commissioned without its own access point in the Communication section.',
      check: doc => {
        const iedName = doc.querySelector(':root > IED')?.getAttribute('name');
        return !!doc.querySelector(
          `:root > Communication ConnectedAP[iedName="${iedName}"]`,
        );
      },
    },
    {
      id: 'CID-03',
      severity: 'error',
      element: 'IED@name',
      title: 'IED name must not be TEMPLATE',
      why: 'A configured device carries its project name, never the reserved type name.',
      check: doc =>
        doc.querySelector(':root > IED')?.getAttribute('name') !== 'TEMPLATE',
    },
    {
      id: 'CID-04',
      severity: 'error',
      element: 'Substation',
      title: 'Substation section names must be project-specific if present',
      why: 'A Substation section related to this IED is optional, but when included its names must reflect the actual project rather than the TEMPLATE placeholder used in type files.',
      check: doc =>
        Array.from(doc.querySelectorAll(':root > Substation')).every(
          substation => substation.getAttribute('name') !== 'TEMPLATE',
        ),
    },
    {
      id: 'CID-05',
      severity: 'warning',
      element: 'Header',
      title: 'Header carries version and revision',
      why: 'Commissioning records need to state which configuration revision went onto the device.',
      check: hasVersionAndRevision,
    },
    {
      id: 'CID-06',
      severity: 'warning',
      element: 'LNode',
      title: 'Substation section with LNode bindings aids traceability',
      why: "Including the device's LNode bindings in the Substation section keeps its role in the single line diagram traceable after download, though the section itself is optional.",
    },
    {
      id: 'CID-07',
      severity: 'warning',
      element: 'File',
      title: 'Prefer RFC 1952 if the file is compressed',
      why: 'Compression of the CID is optional, but RFC 1952 (gzip) is the preferred method when it is applied.',
    },
    {
      id: 'CID-08',
      severity: 'warning',
      element: 'SCL',
      title: 'A CID alone may not fully configure the device',
      why: 'Additional vendor-specific data — relation of internal signals to HW terminals, IEC 61131-3 or other program code, or local control panel configuration — may still need to be loaded separately.',
    },
  ],
};

export const SEVERITY_LABELS = {
  error: 'blocking',
  warning: 'warning',
};

export function validateSCL(xml, fileType) {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');

  if (doc.querySelector('parsererror')) {
    return [
      {
        id: 'XML-01',
        severity: 'error',
        title: 'The generated file is not valid XML',
        passed: false,
      },
    ];
  }

  return (RULES[fileType] ?? [])
    .filter(rule => typeof rule.check === 'function')
    .map(rule => ({
      id: rule.id,
      severity: rule.severity,
      title: rule.title,
      passed: rule.check(doc),
    }));
}
