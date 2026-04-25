from pydantic import BaseModel, Field
from typing import Any, Optional


class MeasurementParam(BaseModel):
    name: str
    value: float
    unit: str | None = None


class EnrichmentConfig(BaseModel):
    enabled: bool = False
    minerals: list[str] = []  # keys from ENRICHMENT_MINERALS


class GenerateRequest(BaseModel):
    measurementId: str
    temperature: float = Field(default=25.0, ge=-5.0, le=100.0)
    ph: float = Field(default=7.0, ge=0.0, le=14.0)
    params: list[MeasurementParam] = []
    useQuantumComputer: bool = False
    enrichment: EnrichmentConfig = Field(default_factory=EnrichmentConfig)


class FilterStatus(BaseModel):
    filterId: str
    status: str
    updatedAt: Optional[str] = None


class AtomPosition(BaseModel):
    id: int
    x: float
    y: float
    z: float
    element: str


class LayerInfo(BaseModel):
    """Per-pollutant layer within a stacked multi-layer filter."""
    pollutant: str
    pollutantSymbol: str
    poreSize: float
    layerThickness: float
    latticeSpacing: float
    materialType: str
    bindingEnergy: float
    removalEfficiency: float
    method: str = "hf"
    mode: str = "filtration"          # "filtration" or "enrichment"
    releaseRate: Optional[float] = None   # enrichment layers only
    targetConcentration: Optional[str] = None  # e.g. "20-80 mg/L"
    atomPositions: list[AtomPosition] = []
    connections: list[dict[str, Any]] = []
    mergedPollutants: list[str] = []


class FilterInfo(BaseModel):
    poreSize: float
    layerThickness: float
    latticeSpacing: float
    materialType: str
    bindingEnergy: float
    removalEfficiency: float
    pollutant: str
    pollutantSymbol: str
    method: str = "hf"
    executionTarget: str = "simulator"
    usedQuantumComputer: bool = False
    atomPositions: list[AtomPosition]
    # Each connection: {"from": int, "to": int, "order": int}
    # "from" is a reserved keyword so stored as plain dicts, not a nested model.
    connections: list[dict[str, Any]] = []
    layers: list[LayerInfo] = []
    enrichmentSummary: dict[str, Any] = {}


class FilterDetails(BaseModel):
    filterId: str
    measurementId: str
    status: str
    createdAt: str
    updatedAt: str
    filterInfo: Optional[FilterInfo] = None
    errorMessage: Optional[str] = None
