document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Map
    const map = L.map('map').setView([20.5937, 78.9629], 5); // India center
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let markers = [];
    let polyline = null;

    // UI Elements
    const sourceInput = document.getElementById('source');
    const destInput = document.getElementById('destination');
    const btnFastest = document.getElementById('btn-fastest');
    const btnCheapest = document.getElementById('btn-cheapest');
    const btnLocation = document.getElementById('btn-location');
    const loading = document.getElementById('loading');
    const resultsList = document.getElementById('results-list');
    const placeholder = document.getElementById('placeholder-text');

    // 2. Event Listeners
    btnFastest.addEventListener('click', () => handleSearch('fastest'));
    btnCheapest.addEventListener('click', () => handleSearch('cheapest'));
    btnLocation.addEventListener('click', useMyLocation);

    // 3. Search Handler
    async function handleSearch(type) {
        const sourceQuery = sourceInput.value.trim();
        const destQuery = destInput.value.trim();

        if (!sourceQuery || !destQuery) {
            alert('Please enter both source and destination');
            return;
        }

        // Show loading state
        showState('loading');

        try {
            const [sourceCoords, destCoords] = await Promise.all([
                geocode(sourceQuery),
                geocode(destQuery)
            ]);

            if (!sourceCoords || !destCoords) {
                alert('Could not find locations. Please try more specific names.');
                showState('placeholder');
                return;
            }

            // Simulate "Finding best routes"
            setTimeout(() => {
                updateMap(sourceCoords, destCoords);
                renderRoutes(type, sourceCoords, destCoords);
                showState('results');
                
                // Scroll to app section
                document.getElementById('app').scrollIntoView({ behavior: 'smooth' });
            }, 1500);

        } catch (error) {
            console.error(error);
            alert('Something went wrong fetching data.');
            showState('placeholder');
        }
    }

    // 4. Geocoding logic
    async function geocode(query) {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lon: parseFloat(data[0].lon),
                display_name: data[0].display_name
            };
        }
        return null;
    }

    // 5. Map Update Logic
    function updateMap(source, dest) {
        // Clear old markers/lines
        markers.forEach(m => map.removeLayer(m));
        markers = [];
        if (polyline) map.removeLayer(polyline);

        const sMarker = L.marker([source.lat, source.lon]).addTo(map).bindPopup('Source: ' + source.display_name);
        const dMarker = L.marker([dest.lat, dest.lon]).addTo(map).bindPopup('Destination: ' + dest.display_name);
        markers.push(sMarker, dMarker);

        polyline = L.polyline([
            [source.lat, source.lon],
            [dest.lat, dest.lon]
        ], { 
            color: '#6366f1', 
            weight: 5,
            dashArray: '10, 10',
            opacity: 0.8
        }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    // 6. UI Rendering
    function showState(state) {
        loading.classList.add('hidden');
        resultsList.classList.add('hidden');
        placeholder.classList.add('hidden');

        if (state === 'loading') loading.classList.remove('hidden');
        if (state === 'results') resultsList.classList.remove('hidden');
        if (state === 'placeholder') placeholder.classList.remove('hidden');
    }

    function renderRoutes(highlightType, source, dest) {
        resultsList.innerHTML = '';

        // Calculate actual distance in km
        const distNum = getDistance(source, dest) / 1000;
        const distanceStr = distNum.toFixed(1);
        
        // Logical calculations based on distance
        // Fastest: ~30km/h + 5 min buffer | Price: ₹80 base + ₹12/km
        const fastestTime = Math.round((distNum / 30) * 60 + 5);
        const fastestCost = Math.round(80 + (distNum * 12));

        // Cheapest: ~15km/h + 10 min buffer | Price: ₹10 base + ₹4/km
        const cheapestTime = Math.round((distNum / 15) * 60 + 10);
        const cheapestCost = Math.round(10 + (distNum * 5));

        const routes = [
            {
                id: 'fastest',
                title: 'Fastest Route',
                badgeClass: 'badge-fastest',
                time: `${fastestTime} mins`,
                cost: `₹${fastestCost}`,
                distance: `${distanceStr} km`,
                description: 'Optimized for speed using premium transit.',
                steps: [
                    { icon: 'fa-walking', text: 'Walk (0.2km)' },
                    { icon: 'fa-taxi', text: 'Uber/Ola' },
                    { icon: 'fa-train', text: 'Express Metro' }
                ]
            },
            {
                id: 'cheapest',
                title: 'Cheapest Route',
                badgeClass: 'badge-cheapest',
                time: `${cheapestTime} mins`,
                cost: `₹${cheapestCost}`,
                distance: `${distanceStr} km`,
                description: 'Best for budget travelers and students.',
                steps: [
                    { icon: 'fa-walking', text: 'Walk (0.4km)' },
                    { icon: 'fa-bus', text: 'City Bus' },
                    { icon: 'fa-bus', text: 'Local Shuttle' },
                    { icon: 'fa-walking', text: 'Walk (0.2km)' }
                ]
            }
        ];

        // Sort so highlighted is first or just render both
        routes.forEach(route => {
            const card = document.createElement('div');
            card.className = `route-card ${route.id === highlightType ? 'active' : ''}`;
            
            card.innerHTML = `
                <span class="route-badge ${route.badgeClass}">${route.title}</span>
                <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">${route.description}</p>
                <div class="route-info">
                    <div class="route-main">
                        <h3>Via ${route.steps[1].text}</h3>
                        <div class="route-stats">
                            <span><i class="fa-regular fa-clock"></i> ${route.time}</span>
                            <span><i class="fa-solid fa-arrows-left-right"></i> ${route.distance}</span>
                        </div>
                    </div>
                    <div class="route-price">
                        <span class="price">${route.cost}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted)">approx total</span>
                    </div>
                </div>
                <div class="route-steps">
                    ${route.steps.map((step, index) => `
                        <div class="step" title="${step.text}">
                            <div class="step-icon"><i class="fa-solid ${step.icon}"></i></div>
                            <span>${step.text.split(' ')[0]}</span>
                        </div>
                        ${index < route.steps.length - 1 ? '<i class="fa-solid fa-chevron-right step-arrow"></i>' : ''}
                    `).join('')}
                </div>
            `;

            card.addEventListener('click', () => {
                document.querySelectorAll('.route-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                // Could highlight specific route geometry here if we had it
            });

            resultsList.appendChild(card);
        });
    }

    // Helper: Haversine distance
    function getDistance(p1, p2) {
        const R = 6371000; // Earth radius in meters
        const dLat = (p2.lat - p1.lat) * Math.PI / 180;
        const dLon = (p2.lon - p1.lon) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Bonus: Use My Location
    function useMyLocation() {
        if (!navigator.geolocation) {
            alert('Geolocation not supported');
            return;
        }

        btnLocation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`;
            const response = await fetch(url);
            const data = await response.json();
            sourceInput.value = data.display_name || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
            btnLocation.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
        }, (err) => {
            console.error(err);
            alert('Could not get your location');
            btnLocation.innerHTML = '<i class="fa-solid fa-crosshairs"></i>';
        });
    }
});
