export type BarcelonaPresetParameter = {
  parameterCode: string
  parameterName: string
  unit: string
  value: number
}

export type BarcelonaMeasurementPreset = {
  id: string
  name: string
  description: string
  temperature: number
  ph: number
  parameters: BarcelonaPresetParameter[]
  coordinates: { lat: number; lng: number }
}

export const BARCELONA_MEASUREMENT_PRESETS: BarcelonaMeasurementPreset[] = [
  {
    id: 'barceloneta',
    name: 'Barceloneta Beach',
    description: 'Mediterranean coastal water with elevated microplastics.',
    temperature: 18.5,
    ph: 8.1,
    parameters: [
      { parameterCode: 'pe', parameterName: 'Polyethylene (PE)', unit: 'ug/l', value: 120.0 },
      { parameterCode: 'pp', parameterName: 'Polypropylene (PP)', unit: 'ug/l', value: 55.0 },
      { parameterCode: 'ps', parameterName: 'Polystyrene (PS)', unit: 'ug/l', value: 35.0 },
      { parameterCode: 'pet', parameterName: 'PET', unit: 'ug/l', value: 22.0 },
      { parameterCode: 'nylon', parameterName: 'Nylon fiber', unit: 'ug/l', value: 18.0 },
      { parameterCode: 'Na-Dis', parameterName: 'Sodium', unit: 'mg/l', value: 10800 },
      { parameterCode: 'Cl-Dis', parameterName: 'Chloride', unit: 'mg/l', value: 19400 },
      { parameterCode: 'Mg-Dis', parameterName: 'Magnesium', unit: 'mg/l', value: 1290 },
      { parameterCode: 'Ca-Dis', parameterName: 'Calcium', unit: 'mg/l', value: 412 },
      { parameterCode: 'SO4-Dis', parameterName: 'Sulfate', unit: 'mg/l', value: 2710 },
    ],
    coordinates: { lat: 41.3784, lng: 2.1915 },
  },
  {
    id: 'llobregat',
    name: 'Llobregat Intake',
    description: 'Pre-treatment river intake with mixed industrial/agri pollutants.',
    temperature: 16.0,
    ph: 7.8,
    parameters: [
      { parameterCode: 'NO3N', parameterName: 'Nitrate', unit: 'mg/l', value: 32.0 },
      { parameterCode: 'DRP', parameterName: 'Orthophosphate', unit: 'mg/l', value: 0.45 },
      { parameterCode: 'diclofenac', parameterName: 'Diclofenac', unit: 'mg/l', value: 0.0012 },
      { parameterCode: 'carbamazepine', parameterName: 'Carbamazepine', unit: 'mg/l', value: 0.0008 },
      { parameterCode: 'atrazine', parameterName: 'Atrazine', unit: 'mg/l', value: 0.0003 },
      { parameterCode: 'Cu-Dis', parameterName: 'Copper', unit: 'mg/l', value: 0.015 },
      { parameterCode: 'Zn-Dis', parameterName: 'Zinc', unit: 'mg/l', value: 0.042 },
      { parameterCode: 'Pb-Dis', parameterName: 'Lead', unit: 'mg/l', value: 0.003 },
      { parameterCode: 'pe', parameterName: 'Polyethylene (PE)', unit: 'ug/l', value: 8.5 },
      { parameterCode: 'pp', parameterName: 'Polypropylene', unit: 'ug/l', value: 4.2 },
    ],
    coordinates: { lat: 41.3756, lng: 2.058 },
  },
  {
    id: 'eixample',
    name: 'Eixample Tap Water',
    description: 'Post-desalination profile suited for enrichment demonstrations.',
    temperature: 20.0,
    ph: 7.2,
    parameters: [
      { parameterCode: 'Ca-Dis', parameterName: 'Calcium', unit: 'mg/l', value: 25.0 },
      { parameterCode: 'Mg-Dis', parameterName: 'Magnesium', unit: 'mg/l', value: 2.5 },
      { parameterCode: 'Na-Dis', parameterName: 'Sodium', unit: 'mg/l', value: 35.0 },
      { parameterCode: 'K-Dis', parameterName: 'Potassium', unit: 'mg/l', value: 0.8 },
      { parameterCode: 'Cl-Dis', parameterName: 'Chloride', unit: 'mg/l', value: 50.0 },
      { parameterCode: 'SO4-Dis', parameterName: 'Sulfate', unit: 'mg/l', value: 20.0 },
    ],
    coordinates: { lat: 41.3926, lng: 2.1615 },
  },
  {
    id: 'port',
    name: 'Port of Barcelona',
    description: 'Harbor water with heavy metals, PAHs, hydrocarbons and plastics.',
    temperature: 19.0,
    ph: 7.9,
    parameters: [
      { parameterCode: 'Pb-Dis', parameterName: 'Lead', unit: 'mg/l', value: 0.025 },
      { parameterCode: 'Cu-Dis', parameterName: 'Copper', unit: 'mg/l', value: 0.085 },
      { parameterCode: 'Zn-Dis', parameterName: 'Zinc', unit: 'mg/l', value: 0.12 },
      { parameterCode: 'Hg-Dis', parameterName: 'Mercury', unit: 'mg/l', value: 0.0004 },
      { parameterCode: 'Sn-Tot', parameterName: 'Tin (tributyltin)', unit: 'mg/l', value: 0.008 },
      { parameterCode: 'BAP', parameterName: 'Benzo[a]pyrene', unit: 'mg/l', value: 0.0001 },
      { parameterCode: 'FLAH', parameterName: 'Fluoranthene', unit: 'mg/l', value: 0.0003 },
      { parameterCode: 'pe', parameterName: 'Polyethylene (PE)', unit: 'ug/l', value: 45.0 },
      { parameterCode: 'ps', parameterName: 'Polystyrene (PS)', unit: 'ug/l', value: 30.0 },
      { parameterCode: 'HC-Tot', parameterName: 'Total hydrocarbons', unit: 'mg/l', value: 0.5 },
    ],
    coordinates: { lat: 41.375, lng: 2.178 },
  },
]
