import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { divIcon, point } from 'leaflet';
import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import { useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import FullscreenLoadingScreen from './FullscreenLoadingScreen';
const POINT_ICON = divIcon({
    html: '<div style="width:8px;height:8px;background:#ff5a3c;border:1px solid rgba(0,0,0,0.55);border-radius:999px;"></div>',
    className: 'tgif-point-icon',
    iconSize: point(8, 8, true),
});
const SELECTED_POINT_ICON = divIcon({
    html: '<div style="width:12px;height:12px;background:#2563eb;border:2px solid white;box-shadow:0 0 0 2px #1d4ed8;border-radius:999px;"></div>',
    className: 'tgif-point-icon-selected',
    iconSize: point(12, 12, true),
});
const getDefaultCenter = (points) => {
    const first = points.find((p) => typeof p.latitude === 'number' && typeof p.longitude === 'number');
    return first ? [first.latitude, first.longitude] : [42.6977, 23.3219];
};
const getBoundsExpression = (points) => {
    let minLat = Number.POSITIVE_INFINITY;
    let maxLat = Number.NEGATIVE_INFINITY;
    let minLon = Number.POSITIVE_INFINITY;
    let maxLon = Number.NEGATIVE_INFINITY;
    for (const p of points) {
        if (typeof p.latitude !== 'number' || typeof p.longitude !== 'number')
            continue;
        minLat = Math.min(minLat, p.latitude);
        maxLat = Math.max(maxLat, p.latitude);
        minLon = Math.min(minLon, p.longitude);
        maxLon = Math.max(maxLon, p.longitude);
    }
    if (!Number.isFinite(minLat) || !Number.isFinite(minLon))
        return null;
    return [
        [minLat, minLon],
        [maxLat, maxLon]
    ];
};
function FitPointsBounds({ points }) {
    const map = useMap();
    useEffect(() => {
        const bounds = getBoundsExpression(points);
        if (!bounds)
            return;
        // Keep it clamped so world-sized test data still shows everything.
        map.fitBounds(bounds, { padding: [16, 16], maxZoom: 2 });
    }, [map, points]);
    return null;
}
function InvalidateOnResize() {
    const map = useMap();
    useEffect(() => {
        const onResize = () => {
            map.invalidateSize();
        };
        window.addEventListener('resize', onResize);
        // Ensure correct first layout when parent size changes quickly.
        const timeout = setTimeout(onResize, 0);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', onResize);
        };
    }, [map]);
    return null;
}
const getWrappedRenderPoints = (points) => {
    const renderPoints = [];
    for (const p of points) {
        const lat = p.latitude;
        const lon = p.longitude;
        if (!Number.isFinite(lat) || !Number.isFinite(lon))
            continue;
        renderPoints.push({ key: `${p.locationId}-w0`, lat, lon, source: p });
    }
    return renderPoints;
};
export default function OpenStreetMapPointsCard({ points, selectedLocationId = null, onSelectPoint }) {
    const center = useMemo(() => getDefaultCenter(points), [points]);
    const renderPoints = useMemo(() => getWrappedRenderPoints(points), [points]);
    const [tilesFailed, setTilesFailed] = useState(false);
    const [tilesLoading, setTilesLoading] = useState(true);
    const lastSelectRef = useRef(null);
    const emitSelectPoint = useCallback((point) => {
        const now = Date.now();
        const last = lastSelectRef.current;
        // One gesture can trigger multiple Leaflet events (touchstart/mousedown/click).
        // Debounce identical station selections very briefly to prevent duplicate callbacks.
        if (last && last.locationId === point.locationId && now - last.atMs < 300) {
            return;
        }
        lastSelectRef.current = { locationId: point.locationId, atMs: now };
        onSelectPoint?.(point);
    }, [onSelectPoint]);
    return (_jsxs("div", { style: { position: 'relative', width: '100%', height: '100%' }, children: [_jsxs(MapContainer, { center: center, zoom: 2, minZoom: 2, maxZoom: 18, maxBounds: [
                    [-85, -180],
                    [85, 180]
                ], maxBoundsViscosity: 1.0, worldCopyJump: true, style: { width: '100%', height: '100%' }, scrollWheelZoom: true, children: [_jsx(InvalidateOnResize, {}), points.length ? _jsx(FitPointsBounds, { points: points }) : null, _jsx(TileLayer, { url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", attribution: "\u00A9 OpenStreetMap contributors", eventHandlers: {
                            tileerror: () => {
                                console.warn('[OSM] Tile failed to load');
                                setTilesFailed(true);
                                setTilesLoading(false);
                            },
                            load: () => {
                                // Tile layer triggers `load` repeatedly; we only care that at least one succeeded.
                                setTilesLoading(false);
                            }
                        } }), _jsx(MarkerClusterGroup, { chunkedLoading: true, chunkInterval: 200, chunkDelay: 50, animate: true, animateAddingMarkers: false, spiderfyOnMaxZoom: false, showCoverageOnHover: false, maxClusterRadius: 60, children: renderPoints.map((p) => (_jsx(Marker, { position: [p.lat, p.lon], icon: selectedLocationId === p.source.locationId ? SELECTED_POINT_ICON : POINT_ICON, eventHandlers: {
                                mousedown: () => {
                                    emitSelectPoint(p.source);
                                },
                                click: () => {
                                    emitSelectPoint(p.source);
                                },
                            } }, p.key))) })] }), tilesLoading && !tilesFailed ? (_jsx(FullscreenLoadingScreen, { title: "Loading map tiles\u2026", fixed: false })) : null, tilesFailed ? (_jsx("div", { style: {
                    position: 'absolute',
                    left: 12,
                    top: 12,
                    padding: '8px 10px',
                    borderRadius: 10,
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    fontSize: 12
                }, children: "OSM tiles failed to load. Showing markers only." })) : null] }));
}
