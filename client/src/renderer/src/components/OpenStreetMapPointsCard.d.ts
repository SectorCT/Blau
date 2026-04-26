import type { GemstatLocation } from '../utils/api';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
type OpenStreetMapPointsCardProps = {
    points: GemstatLocation[];
    selectedLocationId?: string | null;
    onSelectPoint?: (point: GemstatLocation) => void;
};
export default function OpenStreetMapPointsCard({ points, selectedLocationId, onSelectPoint }: OpenStreetMapPointsCardProps): React.JSX.Element;
export {};
