import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type {
  IndicatorId,
  RegionId,
  RegionsGeoJsonResponse,
} from '../types/apiContract.ts';

interface TogoLeafletMapProps {
  geojson: RegionsGeoJsonResponse | null;
  selectedRegionId: RegionId | null;
  indicator: IndicatorId;
  regionValues: Partial<Record<RegionId, number | null>>;
  tileUrlTemplate?: string;
  maxNativeZoom?: number;
  overlayOpacity?: number;
  onMapClickCoordinate?: (lon: number, lat: number) => void;
  onSelectRegion?: (regionId: RegionId) => void;
  heightClassName?: string;
  interactive?: boolean;
}

function getColorForRegion(indicator: IndicatorId, value: number | null | undefined): string {
  if (value === null || value === undefined) return '#CBD5E1';

  if (indicator === 'rainfall') {
    if (value >= 220) return '#0C4A6E';
    if (value >= 120) return '#0E7490';
    if (value >= 50) return '#38BDF8';
    return '#BAE6FD';
  }
  if (indicator === 'greenness') {
    if (value >= 0.75) return '#14532D';
    if (value >= 0.6) return '#2E7D4B';
    if (value >= 0.4) return '#86BA90';
    return '#E2E8D5';
  }
  if (indicator === 'lst') {
    if (value >= 33) return '#7C2D12';
    if (value >= 30) return '#C2410C';
    if (value >= 27) return '#EA580C';
    return '#FDBA74';
  }
  // elevation
  if (value >= 350) return '#0F2942';
  if (value >= 250) return '#475569';
  if (value >= 100) return '#94A3B8';
  return '#E2E8F0';
}

export function TogoLeafletMap({
  geojson,
  selectedRegionId,
  indicator,
  regionValues,
  tileUrlTemplate,
  maxNativeZoom = 8,
  overlayOpacity = 0.65,
  onMapClickCoordinate,
  onSelectRegion,
  heightClassName = 'h-[500px]',
  interactive = true,
}: TogoLeafletMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);
  const geoLayerRef = useRef<L.GeoJSON | null>(null);
  const clickHandlerRef = useRef(onMapClickCoordinate);
  clickHandlerRef.current = onMapClickCoordinate;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [8.6195, 0.8248],
      zoom: 7,
      minZoom: 6,
      maxZoom: 11,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
    });

    // Basemap: Esri World Light Gray (no API key). CARTO basemaps now return an "API KEY REQUIRED" tile.
    const esri = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';
    L.tileLayer(`${esri}/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}`, {
      attribution: 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors',
      maxZoom: 16,
    }).addTo(map);
    L.tileLayer(`${esri}/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}`, {
      maxZoom: 16,
      pane: 'shadowPane', // place names above the data overlays
    }).addTo(map);

    if (interactive) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        clickHandlerRef.current?.(e.latlng.lng, e.latlng.lat);
      });
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      overlayLayerRef.current = null;
      geoLayerRef.current = null;
    };
  }, [interactive]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    if (tileUrlTemplate) {
      const layer = L.tileLayer(tileUrlTemplate, {
        maxNativeZoom,
        maxZoom: 11,
        opacity: overlayOpacity,
        attribution: 'NASA GIBS',
      });
      layer.addTo(map);
      overlayLayerRef.current = layer;
    }
  }, [tileUrlTemplate, maxNativeZoom, overlayOpacity]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (geoLayerRef.current) {
      map.removeLayer(geoLayerRef.current);
      geoLayerRef.current = null;
    }

    if (!geojson) return;

    const layer = L.geoJSON(geojson as any, {
      style: (feature) => {
        const rid = feature?.properties?.id as RegionId;
        const isSelected = rid === selectedRegionId;
        const val = regionValues[rid];
        return {
          color: isSelected ? '#0F2942' : '#475569',
          weight: isSelected ? 3 : 1.5,
          fillColor: getColorForRegion(indicator, val),
          fillOpacity: tileUrlTemplate ? 0.25 : 0.62,
        };
      },
      onEachFeature: (feature, featureLayer) => {
        const rid = feature?.properties?.id as RegionId;
        const name = feature?.properties?.name || rid;
        const val = regionValues[rid];
        const unit =
          indicator === 'rainfall'
            ? 'mm'
            : indicator === 'greenness'
            ? 'index'
            : indicator === 'lst'
            ? '°C'
            : 'm';

        featureLayer.bindTooltip(
          `<div style="font-family: Plus Jakarta Sans, sans-serif; font-size: 12px;">
            <strong>${name}</strong>${val !== null && val !== undefined ? ` · <span style="font-family: JetBrains Mono, monospace;">${val} ${unit}</span>` : ''}
          </div>`,
          { sticky: true }
        );

        featureLayer.on('mouseover', () => {
          (featureLayer as L.Path).setStyle({ weight: 3.5, color: '#0F2942' });
        });

        featureLayer.on('mouseout', () => {
          const isSelected = rid === selectedRegionId;
          (featureLayer as L.Path).setStyle({
            weight: isSelected ? 3 : 1.5,
            color: isSelected ? '#0F2942' : '#475569',
          });
        });

        featureLayer.on('click', (e: L.LeafletMouseEvent) => {
          if (onMapClickCoordinate) {
            L.DomEvent.stopPropagation(e);
            onMapClickCoordinate(e.latlng.lng, e.latlng.lat);
          } else if (onSelectRegion) {
            L.DomEvent.stopPropagation(e);
            onSelectRegion(rid);
          }
        });
      },
    });

    layer.addTo(map);
    geoLayerRef.current = layer;
  }, [geojson, selectedRegionId, indicator, regionValues, tileUrlTemplate, onMapClickCoordinate, onSelectRegion]);

  return (
    <div
      ref={containerRef}
      className={`relative z-0 isolate w-full ${heightClassName} border border-[#DCE3E1] rounded overflow-hidden`}
      aria-label="Interactive Map of Togo"
    />
  );
}
