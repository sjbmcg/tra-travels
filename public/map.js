let map;
let locations = [];
let polyline  = null;
let decorator = null;

function normalizeLocation(data) {
    return {
        location_name:      data.location_name,
        date_visited:       data.date_visited,
        what_happened:      data.what_happened,
        why_did_you_go:     data.why_did_you_go,
        why_was_it_special: data.why_was_it_special,
        photo_url:          data.photo_url || null,
        lat:                parseFloat(data.lat),
        lng:                parseFloat(data.lng)
    };
}

function initMap() {
    map = L.map('map').setView([9.3333, 123.1667], 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', e => openLocationForm(e.latlng.lat, e.latlng.lng));
}

function createMarker(location) {
    const popupContent = location.photo_url
        ? `<b>${location.location_name}</b><br><img src="${location.photo_url}" style="width:120px;border-radius:6px;margin-top:6px;">`
        : `<b>${location.location_name}</b><br>${location.what_happened}`;

    L.marker([location.lat, location.lng]).addTo(map).bindPopup(popupContent);
}

function updateRoute() {
    if (polyline)  { map.removeLayer(polyline);  polyline  = null; }
    if (decorator) { map.removeLayer(decorator); decorator = null; }

    if (locations.length < 2) return;

    const sorted = [...locations].sort((a, b) => new Date(a.date_visited) - new Date(b.date_visited));
    const coords = sorted.map(loc => [loc.lat, loc.lng]);

    polyline = L.polyline(coords, { color: '#f2a7c3', weight: 3, opacity: 0.8 }).addTo(map);

    decorator = L.polylineDecorator(polyline, {
        patterns: [{
            offset: '5%',
            repeat: '12%',
            symbol: L.Symbol.arrowHead({
                pixelSize: 14,
                polygon: false,
                pathOptions: { color: '#e87fa8', weight: 2.5, opacity: 0.9 }
            })
        }]
    }).addTo(map);
}

async function addLocation(formData) {
    const response = await fetch('/api/memories', { method: 'POST', body: formData });

    if (response.status === 401) { window.location.href = '/login.html'; return; }

    const saved = await response.json();
    const location = normalizeLocation(saved);
    locations.push(location);
    createMarker(location);
    updateRoute();
    createBlogPost(location);
}

window.onload = async function () {
    const user = await fetch('/auth/me').then(r => r.json());
    if (!user) { window.location.href = '/login.html'; return; }

    document.getElementById('username').textContent = user.name;
    initMap();

    const memories = await fetch('/api/memories').then(r => r.json());
    memories.forEach(raw => {
        const loc = normalizeLocation(raw);
        locations.push(loc);
        createMarker(loc);
        createBlogPost(loc);
    });
    updateRoute();
};