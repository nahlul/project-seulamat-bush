import React, { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import * as L from "leaflet";
import { API, apiRequest } from "../lib/api";
import { Bus, Users, MapPin, ArrowRight, RefreshCw, ChevronRight, TrendingUp, AlertTriangle } from "lucide-react";

// ── FIX LEAFLET DEFAULT ICON ───────────────────────────────────────
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// ── TYPES ─────────────────────────────────────────────────────────
interface InfoRute {
  kota_asal: string;
  asal_lat: number;
  asal_lon: number;
  kota_tujuan: string;
  tujuan_lat: number;
  tujuan_lon: number;
  jumlah_pemudik: number;
}

interface BusData {
  id: number;
  nama_armada: string;
  jenis_kendaraan: string;
  plat_nomor: string;
  kapasitas_total: number;
  terisi: number;
  nama_supir?: string;
  rute_id?: number;
  rute_asal?: string;
  rute_tujuan?: string;
  waktu_berangkat?: string;
}

interface RouteGroup {
  key: string;
  asal: string;
  tujuan: string;
  jumlah_pemudik: number;
  asal_lat: number;
  asal_lon: number;
  tujuan_lat: number;
  tujuan_lon: number;
  buses: BusData[];
  polyline: [number, number][] | null;
  color: string;
}

// Palette warna rute yang menarik
const ROUTE_COLORS = [
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#10b981", // emerald
  "#f59e0b", // amber
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
];

// ── FlyTo helper ─────────────────────────────────────────────────
function FlyToRoute({ lat, lon }: { lat: number; lon: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], 9, { duration: 1.2 });
  }, [lat, lon]);
  return null;
}

// ── SIDEBAR: Route Card ───────────────────────────────────────────
function RouteCard({
  route,
  isActive,
  onClick,
}: {
  route: RouteGroup;
  isActive: boolean;
  onClick: () => void;
}) {
  const totalKapasitas = route.buses.reduce((s, b) => s + (b.kapasitas_total || 0), 0);
  const totalTerisi = route.buses.reduce((s, b) => s + (b.terisi || 0), 0);
  const persen = totalKapasitas > 0 ? Math.round((totalTerisi / totalKapasitas) * 100) : 0;
  const penuh = route.buses.filter(b => b.terisi >= b.kapasitas_total).length;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-xl border-2 p-3.5 transition-all duration-200 ${
        isActive
          ? "border-blue-400 bg-blue-50 shadow-md shadow-blue-100"
          : "border-slate-100 bg-white hover:border-blue-200 hover:bg-blue-50/40"
      }`}
    >
      {/* Rute header */}
      <div className="flex items-start gap-2.5 mb-2.5">
        {/* Color dot */}
        <div
          className="w-3 h-3 rounded-full mt-1 shrink-0 shadow-sm ring-2 ring-white"
          style={{ backgroundColor: route.color }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 text-sm font-bold text-slate-800 leading-tight">
            <span className="truncate">{route.asal}</span>
            <ArrowRight size={12} className="shrink-0 text-slate-400" />
            <span className="truncate">{route.tujuan}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Users size={10} />
              <span className="font-bold text-slate-700">{route.jumlah_pemudik}</span> pemudik
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Bus size={10} />
              <span className="font-bold text-slate-700">{route.buses.length}</span> bus
            </span>
          </div>
        </div>
        {isActive && (
          <ChevronRight size={14} className="text-blue-500 shrink-0 mt-0.5" />
        )}
      </div>

      {/* Occupancy bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-slate-400">
          <span>Kapasitas: {totalTerisi}/{totalKapasitas} kursi</span>
          <span className="font-bold" style={{ color: persen >= 90 ? "#ef4444" : persen >= 70 ? "#f59e0b" : "#10b981" }}>
            {persen}%
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${persen}%`,
              backgroundColor: persen >= 90 ? "#ef4444" : persen >= 70 ? "#f59e0b" : "#10b981",
            }}
          />
        </div>
      </div>

      {/* Bus pills */}
      {isActive && route.buses.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t border-blue-100 pt-2.5">
          {route.buses.map((b) => {
            const sisa = (b.kapasitas_total || 0) - (b.terisi || 0);
            const isPenuh = sisa <= 0;
            const isAlmostFull = !isPenuh && sisa <= 5;
            return (
              <div
                key={b.id}
                className="flex items-center gap-2 bg-white rounded-lg px-2.5 py-1.5 border border-slate-100"
              >
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isPenuh ? "bg-red-400" : isAlmostFull ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">{b.nama_armada}</p>
                  <p className="text-[10px] text-slate-400 font-mono">{b.plat_nomor || "—"}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-black" style={{ color: isPenuh ? "#ef4444" : isAlmostFull ? "#f59e0b" : "#10b981" }}>
                    {b.terisi}/{b.kapasitas_total}
                  </p>
                  {isPenuh && <p className="text-[9px] text-red-400 font-bold">PENUH</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

// ── CUSTOM PULSE MARKER (untuk titik aktif) ───────────────────────
function PulseMarker({ position, color, label, pemudik }: {
  position: [number, number];
  color: string;
  label: string;
  pemudik?: number;
}) {
  return (
    <CircleMarker
      center={position}
      pathOptions={{
        color: "white",
        fillColor: color,
        fillOpacity: 0.95,
        weight: 3,
      }}
      radius={pemudik ? Math.min(6 + Math.sqrt(pemudik) * 1.2, 20) : 8}
    >
      <Popup>
        <div className="text-center min-w-[120px]">
          <p className="font-bold text-slate-800 text-sm">{label}</p>
          {pemudik !== undefined && (
            <p className="text-blue-600 font-bold text-base mt-1">{pemudik} <span className="text-xs font-normal text-slate-500">pemudik</span></p>
          )}
        </div>
      </Popup>
    </CircleMarker>
  );
}

// ── ANIMATED DASH LINE ────────────────────────────────────────────
// Custom SVG animated dashed polyline via CSS injection
const injectDashAnimation = () => {
  if (document.getElementById("peta-dash-anim")) return;
  const style = document.createElement("style");
  style.id = "peta-dash-anim";
  style.textContent = `
    @keyframes dashFlow {
      to { stroke-dashoffset: -20; }
    }
    .animated-route path {
      stroke-dasharray: 10 6;
      animation: dashFlow 0.8s linear infinite;
    }
    .animated-route-slow path {
      stroke-dasharray: 10 6;
      animation: dashFlow 1.6s linear infinite;
    }
  `;
  document.head.appendChild(style);
};

// ── MAIN COMPONENT ─────────────────────────────────────────────────
export default function PetaSebaran() {
  const [dataPeta, setDataPeta] = useState<InfoRute[]>([]);
  const [allBuses, setAllBuses] = useState<BusData[]>([]);
  const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeRoute, setActiveRoute] = useState<string | null>(null);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    injectDashAnimation();
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch peta data + buses secara paralel
      const [petaRes, busRes] = await Promise.all([
        fetch(API.PETA).then(r => r.json()),
        fetch(API.ADMIN_KENDARAAN, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` }
        }).then(r => r.json()),
      ]);

      const peta: InfoRute[] = Array.isArray(petaRes) ? petaRes : [];
      const buses: BusData[] = Array.isArray(busRes) ? busRes : [];

      setDataPeta(peta);
      setAllBuses(buses);

      // Build route groups + fetch OSRM polylines
      const groups: RouteGroup[] = await Promise.all(
        peta.map(async (item, idx) => {
          const key = `${item.kota_asal}__${item.kota_tujuan}`;
          const color = ROUTE_COLORS[idx % ROUTE_COLORS.length];

          // Match buses ke rute ini berdasarkan nama kota
          const routeBuses = buses.filter(b =>
            b.rute_tujuan &&
            (
              b.rute_tujuan.toLowerCase().includes(item.kota_tujuan.toLowerCase()) ||
              item.kota_tujuan.toLowerCase().includes(b.rute_tujuan.toLowerCase()) ||
              (b.rute_asal && (
                b.rute_asal.toLowerCase().includes(item.kota_asal.toLowerCase()) ||
                item.kota_asal.toLowerCase().includes(b.rute_asal.toLowerCase())
              ))
            )
          );

          // Fetch OSRM route
          let polyline: [number, number][] | null = null;
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${item.asal_lon},${item.asal_lat};${item.tujuan_lon},${item.tujuan_lat}?overview=full&geometries=geojson`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();
            if (osrmData.routes?.[0]) {
              polyline = osrmData.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
            }
          } catch {
            // Fallback: garis lurus
            polyline = [[item.asal_lat, item.asal_lon], [item.tujuan_lat, item.tujuan_lon]];
          }

          return {
            key,
            asal: item.kota_asal,
            tujuan: item.kota_tujuan,
            jumlah_pemudik: item.jumlah_pemudik,
            asal_lat: item.asal_lat,
            asal_lon: item.asal_lon,
            tujuan_lat: item.tujuan_lat,
            tujuan_lon: item.tujuan_lon,
            buses: routeBuses,
            polyline,
            color,
          };
        })
      );

      setRouteGroups(groups);
      if (groups.length > 0) setActiveRoute(groups[0].key);
    } catch (err) {
      console.error("Gagal memuat data peta:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const activeGroup = routeGroups.find(r => r.key === activeRoute) ?? null;
  const totalPemudik = routeGroups.reduce((s, r) => s + r.jumlah_pemudik, 0);
  const totalBus = new Set(allBuses.map(b => b.id)).size;
  const totalRute = routeGroups.length;

  const handleSelectRoute = (key: string) => {
    setActiveRoute(key);
    const rg = routeGroups.find(r => r.key === key);
    if (rg) {
      // Fly to midpoint
      setFlyTarget({
        lat: (rg.asal_lat + rg.tujuan_lat) / 2,
        lon: (rg.asal_lon + rg.tujuan_lon) / 2,
      });
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 gap-3">
        <div className="relative">
          <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin" />
          <Bus size={16} className="absolute inset-0 m-auto text-blue-500" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Memuat peta sebaran pemudik...</p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif" }}>

      {/* ── SIDEBAR KIRI ── */}
      <div className="w-72 shrink-0 flex flex-col bg-white border-r border-slate-200 overflow-hidden">

        {/* Header sidebar */}
        <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-extrabold text-sm flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-400" /> Rute Mudik Aktif
              </h3>
              <p className="text-slate-400 text-[10px] mt-0.5">Klik rute untuk fokus di peta</p>
            </div>
            <button
              onClick={loadData}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition text-slate-300 hover:text-white"
              title="Refresh"
            >
              <RefreshCw size={13} />
            </button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { label: "Rute", value: totalRute, icon: MapPin, color: "text-blue-400" },
              { label: "Bus", value: totalBus, icon: Bus, color: "text-violet-400" },
              { label: "Pemudik", value: totalPemudik, icon: Users, color: "text-emerald-400" },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="bg-white/8 rounded-lg px-2 py-1.5 text-center border border-white/6">
                  <Icon size={11} className={`mx-auto mb-0.5 ${s.color}`} />
                  <p className={`text-base font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">{s.label}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Route list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {routeGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-slate-400 text-sm gap-2">
              <MapPin size={28} className="opacity-20" />
              <p>Belum ada rute aktif</p>
            </div>
          ) : (
            routeGroups.map((rg) => (
              <RouteCard
                key={rg.key}
                route={rg}
                isActive={activeRoute === rg.key}
                onClick={() => handleSelectRoute(rg.key)}
              />
            ))
          )}
        </div>

        {/* Legend footer */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5">Legenda Kapasitas Bus</p>
          <div className="flex gap-3 flex-wrap">
            {[
              { color: "bg-emerald-400", label: "Tersedia" },
              { color: "bg-amber-400", label: "Hampir Penuh" },
              { color: "bg-red-400", label: "Penuh" },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-[10px] text-slate-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── MAP ── */}
      <div className="flex-1 relative">
        <MapContainer
          center={[4.2, 97.5]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          zoomControl={false}
        >
          {/* Tile layer - CartoDB Positron (lebih bersih) */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
          />

          {/* FlyTo saat route dipilih */}
          {flyTarget && <FlyToRoute lat={flyTarget.lat} lon={flyTarget.lon} />}

          {/* Render semua rute */}
          {routeGroups.map((rg) => {
            const isActive = activeRoute === rg.key;
            return (
              <React.Fragment key={rg.key}>
                {/* Polyline jalur */}
                {rg.polyline && (
                  <>
                    {/* Shadow/glow untuk rute aktif */}
                    {isActive && (
                      <Polyline
                        positions={rg.polyline}
                        pathOptions={{
                          color: rg.color,
                          weight: 10,
                          opacity: 0.15,
                        }}
                      />
                    )}
                    {/* Main line */}
                    <Polyline
                      positions={rg.polyline}
                      pathOptions={{
                        color: rg.color,
                        weight: isActive ? 4 : 2.5,
                        opacity: isActive ? 1 : 0.45,
                        dashArray: isActive ? undefined : "6 4",
                      }}
                      eventHandlers={{
                        click: () => handleSelectRoute(rg.key),
                      }}
                    />
                  </>
                )}

                {/* Titik ASAL */}
                <PulseMarker
                  position={[rg.asal_lat, rg.asal_lon]}
                  color={rg.color}
                  label={`📍 ${rg.asal} (Asal)`}
                />

                {/* Titik TUJUAN — ukuran sesuai jumlah pemudik */}
                <PulseMarker
                  position={[rg.tujuan_lat, rg.tujuan_lon]}
                  color={rg.color}
                  label={`🏁 ${rg.tujuan}`}
                  pemudik={rg.jumlah_pemudik}
                />
              </React.Fragment>
            );
          })}
        </MapContainer>

        {/* ── FLOATING INFO CARD (rute aktif) ── */}
        {activeGroup && (
          <div
            className="absolute bottom-4 right-4 z-[1000] bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 p-4 w-64 transition-all duration-300"
            style={{ borderLeft: `4px solid ${activeGroup.color}` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Rute Dipilih</p>
                <div className="flex items-center gap-1 font-extrabold text-slate-800 text-sm leading-tight">
                  <span>{activeGroup.asal}</span>
                  <ArrowRight size={12} className="text-slate-400 shrink-0" />
                  <span>{activeGroup.tujuan}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-3">
              {[
                { label: "Pemudik", value: activeGroup.jumlah_pemudik, icon: Users, color: "text-blue-600" },
                { label: "Bus", value: activeGroup.buses.length, icon: Bus, color: "text-violet-600" },
                {
                  label: "Penuh",
                  value: activeGroup.buses.filter(b => b.terisi >= b.kapasitas_total).length,
                  icon: AlertTriangle,
                  color: "text-red-500",
                },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <div key={s.label} className="bg-slate-50 rounded-xl p-2 text-center border border-slate-100">
                    <Icon size={13} className={`mx-auto mb-0.5 ${s.color}`} />
                    <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                    <p className="text-[9px] text-slate-400 font-semibold">{s.label}</p>
                  </div>
                );
              })}
            </div>

            {/* Bus quick list */}
            {activeGroup.buses.length > 0 && (
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {activeGroup.buses.slice(0, 4).map(b => {
                  const sisa = b.kapasitas_total - b.terisi;
                  const isPenuh = sisa <= 0;
                  return (
                    <div key={b.id} className="flex items-center gap-2 text-xs bg-slate-50 rounded-lg px-2 py-1 border border-slate-100">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isPenuh ? "bg-red-400" : sisa <= 5 ? "bg-amber-400" : "bg-emerald-400"}`} />
                      <span className="flex-1 font-semibold text-slate-700 truncate">{b.nama_armada}</span>
                      <span className={`font-bold shrink-0 ${isPenuh ? "text-red-500" : "text-emerald-600"}`}>
                        {b.terisi}/{b.kapasitas_total}
                      </span>
                    </div>
                  );
                })}
                {activeGroup.buses.length > 4 && (
                  <p className="text-[10px] text-slate-400 text-center">+{activeGroup.buses.length - 4} bus lainnya</p>
                )}
              </div>
            )}

            {activeGroup.buses.length === 0 && (
              <p className="text-xs text-slate-400 italic text-center">Belum ada bus di rute ini</p>
            )}
          </div>
        )}

        {/* ── FLOATING ZOOM CONTROLS ── */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1">
          {routeGroups.map((rg, i) => (
            <button
              key={rg.key}
              onClick={() => handleSelectRoute(rg.key)}
              title={`${rg.asal} → ${rg.tujuan}`}
              className={`w-4 h-4 rounded-full border-2 border-white shadow transition-all ${
                activeRoute === rg.key ? "scale-125 ring-2 ring-white" : "opacity-70 hover:opacity-100"
              }`}
              style={{ backgroundColor: rg.color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}