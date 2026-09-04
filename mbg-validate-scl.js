export const RULES = {
  '.icd': [
    {
      id: 'ICD-01',
      severity: 'error',
      element: 'IED@name',
      title: 'IED name must be TEMPLATE',
      why: 'An ICD describes a device type, not an installed instance. The reserved name marks it as unbound.',
    },
    {
      id: 'ICD-02',
      severity: 'error',
      element: 'SCL',
      title: 'Exactly one IED element',
      why: 'A type description covers a single device. Extraction always produces one, so this is a guard against hand edits.',
    },
    {
      id: 'ICD-03',
      severity: 'error',
      element: 'Header',
      title: 'Header carries version and revision',
      why: 'The configurator uses these to detect when a vendor ships an updated type.',
    },
    {
      id: 'ICD-04',
      severity: 'error',
      element: 'DataTypeTemplates',
      title: 'DataTypeTemplates section present',
      why: 'Without the type definitions the file describes nothing a configurator can instantiate.',
    },
    {
      id: 'ICD-05',
      severity: 'error',
      element: 'Process, Line, Substation',
      title: 'Process/Line/Substation top-level name must be TEMPLATE',
      why: 'A functional topology section is optional in a type file, but when included its highest-level name marks it as a template rather than a project-specific single line diagram.',
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
    },
  ],
  '.iid': [
    {
      id: 'IID-01',
      severity: 'error',
      element: 'SCL',
      title: 'Exactly one IED element',
      why: 'An IID carries the instantiated configuration of one device being returned to the system configurator.',
    },
    {
      id: 'IID-02',
      severity: 'error',
      element: 'IED@name',
      title: 'IED name must not be TEMPLATE',
      why: 'An instance file needs the project name assigned by the system configurator.',
    },
    {
      id: 'IID-03',
      severity: 'error',
      element: 'Header@id',
      title: 'Header ID is present',
      why: 'The system configurator matches the returned instance back to the project by this identifier.',
    },
    {
      id: 'IID-04',
      severity: 'warning',
      element: 'Header',
      title: 'Header carries version and revision',
      why: 'Lets the configurator tell which round trip a returned instance came from.',
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
    },
    {
      id: 'CID-02',
      severity: 'error',
      element: 'Communication',
      title: 'ConnectedAP for this IED',
      why: 'The device cannot be commissioned without its own access point in the Communication section.',
    },
    {
      id: 'CID-03',
      severity: 'error',
      element: 'IED@name',
      title: 'IED name must not be TEMPLATE',
      why: 'A configured device carries its project name, never the reserved type name.',
    },
    {
      id: 'CID-04',
      severity: 'error',
      element: 'Substation',
      title: 'Substation section names must be project-specific if present',
      why: 'A Substation section related to this IED is optional, but when included its names must reflect the actual project rather than the TEMPLATE placeholder used in type files.',
    },
    {
      id: 'CID-05',
      severity: 'warning',
      element: 'Header',
      title: 'Header carries version and revision',
      why: 'Commissioning records need to state which configuration revision went onto the device.',
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
