import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  User,
  Phone,
  Clock,
  Battery,
  Navigation,
  ShieldCheck,
  CalendarCheck,
  Coins,
  Banknote,
  Layers,
  MapPin
} from 'lucide-react';

// Custom colored SVG pin generator for Leaflet
const createEmployeeIcon = (isWorking, isSelected = false) => {
  const fillColor = isWorking ? '#10B981' : '#64748B';
  const strokeColor = isSelected ? '#DC2626' : '#0B1329';
  const size = isSelected ? 38 : 32;

  const svgHtml = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center;">
      <svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3" fill="#ffffff"></circle>
      </svg>
      ${isWorking ? `<span style="position: absolute; top: -2px; right: -2px; width: 9px; height: 9px; background-color: #34D399; border-radius: 50%; box-shadow: 0 0 8px #34D399; animation: pulse 2s infinite;"></span>` : ''}
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: 'custom-emp-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

const createVisitIcon = (purpose) => {
  return L.divIcon({
    html: `
      <div style="width: 26px; height: 26px; background: #3B82F6; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        <span style="color: white; font-size: 13px; font-weight: bold;">V</span>
      </div>
    `,
    className: 'custom-visit-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

const createGoldIcon = () => {
  return L.divIcon({
    html: `
      <div style="width: 26px; height: 26px; background: #DC2626; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        <span style="color: #ffffff; font-size: 13px; font-weight: bold;">G</span>
      </div>
    `,
    className: 'custom-gold-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

const createCashIcon = () => {
  return L.divIcon({
    html: `
      <div style="width: 26px; height: 26px; background: #10B981; border: 2px solid #ffffff; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(0,0,0,0.5);">
        <span style="color: white; font-size: 13px; font-weight: bold;">₹</span>
      </div>
    `,
    className: 'custom-cash-marker',
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

const breadcrumbIcon = L.divIcon({
  html: `<div style="width: 10px; height: 10px; background: #D4AF37; border: 2px solid #0B1329; border-radius: 50%; box-shadow: 0 0 5px #D4AF37;"></div>`,
  className: 'breadcrumb-pin',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

const shiftStartIcon = L.divIcon({
  html: `
    <div style="width: 24px; height: 24px; background: #10B981; border: 2px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.7); font-size: 11px; color: white;">
      ▶
    </div>
  `,
  className: 'shift-start-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

const shiftEndIcon = L.divIcon({
  html: `
    <div style="width: 24px; height: 24px; background: #EF4444; border: 2px solid #FFFFFF; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.7); font-size: 11px; color: white;">
      ■
    </div>
  `,
  className: 'shift-end-pin',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  popupAnchor: [0, -12]
});

// Component to dynamically fit map bounds or fly to target
const ChangeMapView = ({ markers, breadcrumbs, visits, gold, cash, flyToCoord }) => {
  const map = useMap();

  useEffect(() => {
    if (flyToCoord && flyToCoord.lat && flyToCoord.lng) {
      map.flyTo([flyToCoord.lat, flyToCoord.lng], 16, { duration: 1 });
      return;
    }

    const points = [];
    markers.forEach(m => {
      if (m.latitude && m.longitude) points.push([m.latitude, m.longitude]);
    });
    breadcrumbs.forEach(b => {
      if (b.latitude && b.longitude) points.push([b.latitude, b.longitude]);
    });
    visits.forEach(v => {
      if (v.latitude && v.longitude) points.push([v.latitude, v.longitude]);
    });
    gold.forEach(g => {
      if (g.latitude && g.longitude) points.push([g.latitude, g.longitude]);
    });
    cash.forEach(c => {
      if (c.latitude && c.longitude) points.push([c.latitude, c.longitude]);
    });

    if (points.length > 0) {
      if (points.length === 1) {
        map.setView(points[0], 14);
      } else {
        const bounds = L.latLngBounds(points);
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
      }
    }
  }, [markers, breadcrumbs, visits, gold, cash, flyToCoord, map]);

  return null;
};

const GpsMap = ({
  employees = [],
  breadcrumbs = [],
  visits = [],
  goldCollections = [],
  cashCollections = [],
  selectedEmployee = null,
  onSelectEmployee = () => {},
  flyToCoord = null,
  height = '550px'
}) => {
  const defaultCenter = [13.0418, 80.2341];

  // Layer toggles
  const [showEmployees, setShowEmployees] = useState(true);
  const [showTrail, setShowTrail] = useState(true);
  const [showVisits, setShowVisits] = useState(true);
  const [showCollections, setShowCollections] = useState(true);

  const validMarkers = employees.filter(emp => emp.latitude && emp.longitude);

  const polylineCoords = breadcrumbs
    .filter(b => b.latitude && b.longitude)
    .map(b => [b.latitude, b.longitude]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[#1a2c5b] bg-[#0b1329] shadow-2xl" style={{ height }}>
      {/* Top Left: Status Telemetry Pill */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-[#090f22]/95 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-[#1a2c5b] shadow-xl text-xs">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-semibold">{employees.filter(e => e.is_working).length} Active On Field</span>
        </div>
        <span className="text-slate-600">|</span>
        <div className="flex items-center gap-1.5 text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span>{employees.filter(e => !e.is_working).length} Off Duty</span>
        </div>
        {breadcrumbs.length > 0 && (
          <>
            <span className="text-slate-600">|</span>
            <span className="text-amber-400 font-medium">
              Trail: {breadcrumbs.length} Pings
            </span>
          </>
        )}
      </div>

      {/* Top Right: Layer Visibility Control Panel */}
      <div className="absolute top-3 right-3 z-[1000] bg-[#090f22]/95 backdrop-blur-md px-3 py-2 rounded-xl border border-[#1a2c5b] shadow-xl text-[11px] space-y-1">
        <div className="flex items-center gap-1 font-semibold text-slate-300 pb-1 border-b border-[#1a2c5b]">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span>Map Overlays</span>
        </div>
        <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            checked={showEmployees}
            onChange={(e) => setShowEmployees(e.target.checked)}
            className="rounded border-[#1a2c5b] text-emerald-500"
          />
          <span>Staff Pins ({validMarkers.length})</span>
        </label>
        {breadcrumbs.length > 0 && (
          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showTrail}
              onChange={(e) => setShowTrail(e.target.checked)}
              className="rounded border-[#1a2c5b] text-amber-500"
            />
            <span>Movement Route Trail</span>
          </label>
        )}
        {visits.length > 0 && (
          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showVisits}
              onChange={(e) => setShowVisits(e.target.checked)}
              className="rounded border-[#1a2c5b] text-blue-500"
            />
            <span>Customer Visits ({visits.length})</span>
          </label>
        )}
        {(goldCollections.length > 0 || cashCollections.length > 0) && (
          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer hover:text-white">
            <input
              type="checkbox"
              checked={showCollections}
              onChange={(e) => setShowCollections(e.target.checked)}
              className="rounded border-[#1a2c5b] text-amber-500"
            />
            <span>Collections ({goldCollections.length + cashCollections.length})</span>
          </label>
        )}
      </div>

      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <ChangeMapView
          markers={showEmployees ? validMarkers : []}
          breadcrumbs={showTrail ? breadcrumbs : []}
          visits={showVisits ? visits : []}
          gold={showCollections ? goldCollections : []}
          cash={showCollections ? cashCollections : []}
          flyToCoord={flyToCoord}
        />

        {/* 1. Employee Pins */}
        {showEmployees && validMarkers.map((emp) => {
          const isSelected = selectedEmployee?.id === emp.id;
          return (
            <Marker
              key={`emp-${emp.id}`}
              position={[emp.latitude, emp.longitude]}
              icon={createEmployeeIcon(emp.is_working, isSelected)}
              eventHandlers={{
                click: () => onSelectEmployee(emp)
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[210px] text-slate-800">
                  <div className="flex items-center justify-between border-b pb-1 mb-1.5">
                    <span className="font-bold text-xs text-blue-900 font-mono">{emp.employee_id}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${emp.is_working ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                      {emp.is_working ? 'ON FIELD DUTY' : 'OFFLINE'}
                    </span>
                  </div>
                  <p className="font-semibold text-sm text-slate-900 mb-0.5">{emp.name}</p>
                  <p className="text-xs text-slate-600 flex items-center gap-1 mb-1">
                    <Phone className="w-3 h-3 text-slate-500" />
                    {emp.phone || 'No phone'}
                  </p>
                  {emp.assigned_coordinator_name && (
                    <p className="text-[11px] text-slate-500 mb-1">
                      Coord: {emp.assigned_coordinator_name}
                    </p>
                  )}
                  {emp.elapsed_minutes && (
                    <p className="text-[11px] text-emerald-700 font-medium mb-1">
                      Shift: Active for {emp.elapsed_minutes} mins
                    </p>
                  )}
                  <p className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    Last update: {emp.last_location_time ? new Date(emp.last_location_time).toLocaleTimeString() : 'Recent'}
                  </p>
                  <div className="mt-2 pt-1 border-t flex justify-end">
                    <button
                      onClick={() => onSelectEmployee(emp)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                    >
                      View Day Trail & Visits →
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 2. Breadcrumbs Polyline Trail */}
        {showTrail && polylineCoords.length > 1 && (
          <Polyline
            positions={polylineCoords}
            pathOptions={{ color: '#D4AF37', weight: 4, opacity: 0.85, dashArray: '6, 6' }}
          />
        )}

        {/* 3. Trail Pings */}
        {showTrail && breadcrumbs.map((ping, idx) => {
          let iconToUse = breadcrumbIcon;
          if (ping.activity_type === 'START_WORK') {
            iconToUse = shiftStartIcon;
          } else if (ping.activity_type === 'END_WORK') {
            iconToUse = shiftEndIcon;
          }
          return (
            <Marker
              key={`ping-${ping.id || idx}`}
              position={[ping.latitude, ping.longitude]}
              icon={iconToUse}
            >
              <Popup>
                <div className="text-xs text-slate-800 p-0.5 min-w-[140px]">
                  <p className="font-bold text-amber-700">{ping.activity_type_display || ping.activity_type}</p>
                  <p className="text-slate-600 font-mono text-[11px]">{new Date(ping.timestamp).toLocaleTimeString()}</p>
                  {ping.battery_level && (
                    <p className="text-[11px] text-slate-500">Battery: {ping.battery_level}%</p>
                  )}
                  {ping.address_snapshot && <p className="text-[11px] text-slate-500 mt-1 italic">{ping.address_snapshot}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 4. Customer Visit Pins */}
        {showVisits && visits.map((v) => (
          <Marker
            key={`visit-${v.id}`}
            position={[v.latitude, v.longitude]}
            icon={createVisitIcon(v.purpose)}
          >
            <Popup>
              <div className="p-1 min-w-[200px] text-slate-800 text-xs">
                <div className="flex items-center justify-between border-b pb-1 mb-1 font-bold text-blue-900">
                  <span>Customer Visit</span>
                  <span>{v.time}</span>
                </div>
                <p className="font-bold text-sm text-slate-900">{v.customer_name}</p>
                <p className="text-slate-600 mt-0.5">{v.customer_mobile}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">{v.address}</p>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-semibold text-blue-700">{v.purpose}</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">{v.status}</span>
                </div>
                {v.remarks && <p className="text-[10px] text-slate-500 italic mt-1 border-t pt-1">{v.remarks}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 5. Gold Collection Pins */}
        {showCollections && goldCollections.map((g) => (
          <Marker
            key={`gold-${g.id}`}
            position={[g.latitude, g.longitude]}
            icon={createGoldIcon()}
          >
            <Popup>
              <div className="p-1 min-w-[190px] text-slate-800 text-xs">
                <div className="flex items-center justify-between border-b pb-1 mb-1 font-bold text-amber-700">
                  <span>Gold Pledged</span>
                  <span>{g.time}</span>
                </div>
                <p className="font-bold text-amber-900 font-mono">{g.receipt_number}</p>
                <p className="font-semibold text-slate-900">{g.customer_name}</p>
                <p className="font-bold text-amber-700 text-sm mt-1">{g.weight}g ({g.purity})</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 6. Cash Collection Pins */}
        {showCollections && cashCollections.map((c) => (
          <Marker
            key={`cash-${c.id}`}
            position={[c.latitude, c.longitude]}
            icon={createCashIcon()}
          >
            <Popup>
              <div className="p-1 min-w-[190px] text-slate-800 text-xs">
                <div className="flex items-center justify-between border-b pb-1 mb-1 font-bold text-emerald-700">
                  <span>Cash Collected</span>
                  <span>{c.time}</span>
                </div>
                <p className="font-bold text-emerald-900 font-mono">{c.receipt_number}</p>
                <p className="font-semibold text-slate-900">{c.customer_name}</p>
                <p className="font-bold text-emerald-600 text-sm mt-1">₹{Number(c.amount).toLocaleString('en-IN')}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default GpsMap;
