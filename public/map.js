let map;
let locations = [];
let polyline  = null;
let decorator = null;

function normalizeLocation(data) {
    return {
        id:                 data.id,
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
    map = L.map('map').setView([20, 0], 2);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', async function (e) {
        const { lat, lng } = e.latlng;
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        const locationName = data.display_name
            ? data.display_name.split(',').slice(0, 2).join(',').trim()
            : '';
        openLocationForm(lat, lng, locationName);
    });
}

function fitMapToMemories() {
    if (locations.length === 0) return;
    if (locations.length === 1) {
        map.setView([locations[0].lat, locations[0].lng], 10);
        return;
    }
    const bounds = L.latLngBounds(locations.map(l => [l.lat, l.lng]));
    map.fitBounds(bounds, { padding: [40, 40] });
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
            offset: '5%', repeat: '12%',
            symbol: L.Symbol.arrowHead({
                pixelSize: 14, polygon: false,
                pathOptions: { color: '#e87fa8', weight: 2.5, opacity: 0.9 }
            })
        }]
    }).addTo(map);
}

function updateStats() {
    const count = locations.length;
    const el = document.getElementById('memoryCount');
    if (el) el.textContent = count === 1 ? '1 memory' : `${count} memories`;

    const journeyBtn = document.getElementById('journeyBtn');
    if (journeyBtn) journeyBtn.style.display = count >= 5 ? 'inline-block' : 'none';
}

async function addLocation(formData) {
    const response = await fetch('/api/memories', { method: 'POST', body: formData });
    if (response.status === 401) { window.location.href = '/login.html'; return; }
    const saved = await response.json();
    const location = normalizeLocation(saved);
    locations.push(location);
    createMarker(location);
    updateRoute();
    updateStats();
    createBlogPost(location);
    sortBlogPosts();
}

window.onload = async function () {
    const user = await fetch('/auth/me').then(r => r.json());
    if (!user) { window.location.href = '/login.html'; return; }

    document.getElementById('username').textContent = user.name;
    initMap();

    const memories = await fetch('/api/memories').then(r => r.json());

    if (memories.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
    } else {
        document.getElementById('emptyState').style.display = 'none';
        memories.forEach(raw => {
            const loc = normalizeLocation(raw);
            locations.push(loc);
            createMarker(loc);
            createBlogPost(loc);
        });
        updateRoute();
        fitMapToMemories();
        sortBlogPosts();
    }

    updateStats();
};