import type { VisualSource } from '../types/visualSystem'

export const visualSources: VisualSource[] = [
  {
    id: 'machado-2009',
    title: 'A Physiologically-based Model for Simulation of Color Vision Deficiency',
    authors: 'Machado, Oliveira, Fernandes',
    year: 2009,
    doi: '10.1109/TVCG.2009.113',
    usedFor: ['Color deficiency severity interpolation', 'Display transform reference'],
    limitations:
      'Educational display model in imaging pipeline; not a personal clinical diagnosis or absolute retinal measurement.',
  },
  {
    id: 'brettel-vienot-mollon-1997',
    title: 'Computerized Simulation of Color Appearance for Dichromats',
    authors: 'Brettel, Vienot, Mollon',
    year: 1997,
    usedFor: ['Dichromat endpoint assumptions', 'Confusion direction references'],
    limitations:
      'Model family reference for endpoint behavior; exact implementation choices affect appearance and are display-dependent.',
  },
  {
    id: 'glasser-2016-hcp-mmp',
    title: 'A Multi-modal Parcellation of Human Cerebral Cortex',
    authors: 'Glasser et al.',
    year: 2016,
    doi: '10.1038/nature18933',
    datasetUrl: 'https://balsa.wustl.edu/study/show/RVVG',
    usedFor: ['Visual cortical area labels', 'Hierarchy context for atlas window'],
    limitations:
      'Current MVP uses schematic geometry with atlas-aligned labels, not full-resolution cortical mesh visualization.',
  },
  {
    id: 'benson-2018-hcp-7t-retinotopy',
    title: 'The Human Connectome Project 7 Tesla Retinotopy Dataset',
    authors: 'Benson et al.',
    year: 2018,
    datasetUrl: 'https://balsa.wustl.edu/study/show/9Zkk',
    usedFor: ['Retinotopy explanatory overlays', 'Visual field to cortex mapping rationale'],
    limitations:
      'This console does not perform participant-specific pRF fitting and should be interpreted as conceptual educational mapping.',
  },
  {
    id: 'openneuro-visual',
    title: 'OpenNeuro Visual Task Collections',
    authors: 'OpenNeuro contributors',
    year: 2026,
    datasetUrl: 'https://openneuro.org',
    usedFor: ['Future extension targets', 'Public reproducibility orientation'],
    limitations:
      'Dataset schemas vary across studies and are not directly loaded in this MVP scene implementation.',
  },
]
