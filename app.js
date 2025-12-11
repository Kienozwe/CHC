// app.js - all JS for Option 1 (basic structure)
// Note: Replace OPENWEATHER_API_KEY with your key

// ------------------ Classes + Storage ------------------
// ------------------ FIXED LOGIN SYSTEM ------------------

class User {
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }

    validate(u, p) {
        return this.username === u && this.password === p;
    }
}

// ADMIN + STAFF login (editable)
const accounts = [
    { role: "admin", username: "admin123", password: "12345", redirect: "dashboard.html" },
    { role: "staff", username: "staff001", password: "staffpass", redirect: "staff.html" }
];

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");

    if (!loginForm) return;

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const u = document.getElementById("username").value.trim();
        const p = document.getElementById("password").value.trim();

        // FIND MATCHING ACCOUNT
        const acc = accounts.find(a => a.username === u && a.password === p);

        if (acc) {
            alert("Login Successfully!");
            localStorage.setItem("sessionUser", acc.username);
            window.location.href = acc.redirect;
        } else {
            alert("Incorrect Credentials!");
        }
    });
});



class HealthRecord{
  constructor(temp,symptoms,mood,location=null){
    this.id='r_'+Date.now();
    this.temperature=parseFloat(temp);
    this.symptoms=symptoms||'';
    this.mood=parseInt(mood||0,10);
    this.location=location;
    this.date=new Date().toLocaleString();
    this.status=this.evaluateHealth();
  }
  evaluateHealth(){if(this.temperature>38)return'Needs Check-up';if(this.temperature>=37)return'Mild Symptoms';return'Healthy'}
}
const Storage={key:'healthRecords',getAll(){return JSON.parse(localStorage.getItem(this.key)||'[]')},saveAll(a){localStorage.setItem(this.key,JSON.stringify(a))},add(r){const a=this.getAll();a.unshift(r);this.saveAll(a)},update(id,obj){const a=this.getAll().map(i=>i.id===id?{...i,...obj}:i);this.saveAll(a)},delete(id){const a=this.getAll().filter(i=>i.id!==id);this.saveAll(a)}}
if(!localStorage.getItem(Storage.key)){const seed=[new HealthRecord(36.5,'none',5,'14.6,120.98'),new HealthRecord(37.2,'cough',3,'14.61,120.99'),new HealthRecord(38.4,'fever',2,'14.59,120.98')];Storage.saveAll(seed)}

// ------------------ Auth (index.html) ------------------
document.addEventListener('DOMContentLoaded',()=>{
  // login form on index.html
  const loginForm=document.getElementById('loginForm');
  if(loginForm){
    const demo=new User('user','password');
    loginForm.addEventListener('submit',e=>{
      e.preventDefault();
      const u=document.getElementById('username').value.trim();
      const p=document.getElementById('password')?document.getElementById('password').value.trim():'password';
      if(demo.login(u,p)){localStorage.setItem('sessionUser',u);location.href='dashboard.html'}else{alert('Invalid. Use user/password')}
    });
  }

  // pages that require auth should redirect
  const protectedPages=['dashboard.html','map.html','checker.html','records.html','about.html'];
  const current=location.pathname.split('/').pop();
  if(protectedPages.includes(current) && !localStorage.getItem('sessionUser')){location.href='index.html'}

  // dashboard logic
  if(document.getElementById('healthChart')){
    renderChart();initSnapshot();renderRecent();
    document.getElementById('refreshWeather').addEventListener('click',()=>fetchWeather(document.getElementById('cityInput').value||'Manolo Fortich'));
    fetchWeather(document.getElementById('cityInput').value||'Manolo Fortich');
    
    // Refresh recent entries every 1 second to catch deletions from records page
    setInterval(renderRecent, 1000);
  }

  // map page
  if(document.getElementById('fullMap')){initFullMap()}

  // checker page
  if(document.getElementById('checkerForm')){initChecker()}

  // records page
  if(document.getElementById('recordsTable')){initRecords()}
});

// ------------------ Weather (OpenWeatherMap) ------------------
const OPENWEATHER_API_KEY='65a57d561c8e84defdbf061e498dcac6';
async function fetchWeather(city){try{const res=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`);const data=await res.json();if(res.ok){document.getElementById('w-temp').innerText=data.main.temp+' °C';const rawCond=(data.weather&&data.weather[0]&&data.weather[0].description)?data.weather[0].description:'';const titleCond=rawCond.split(' ').map(w=>w?w.charAt(0).toUpperCase()+w.slice(1):'').join(' ');document.getElementById('w-cond').innerText=titleCond;document.getElementById('w-hum').innerText='Humidity: '+data.main.humidity+'%';document.getElementById('w-alert').innerText='No alert';updateSnapshotMap(data.coord.lat,data.coord.lon)}else{document.getElementById('w-temp').innerText='--';document.getElementById('w-cond').innerText=data.message||'Error'}}catch(e){console.error(e)}}

// Update map snapshot to show the city
function updateSnapshotMap(lat,lng){
    if(window._snapshotMap){
        window._snapshotMap.setView([lat,lng],12);
        // use viewport bounds to fetch POIs (no manual lat/lng required)
        const now = Date.now();
        const minInterval = 5000; // ms
        const fetchBounds = () => {
            const bounds = window._snapshotMap.getBounds();
            fetchHealthcarePOIsForBounds(bounds);
        };
        if(!window._lastOverpassTime || (now - window._lastOverpassTime) > minInterval){
            window._lastOverpassTime = now;
            fetchBounds();
        } else {
            clearTimeout(window._overpassTimer);
            window._overpassTimer = setTimeout(()=>{
                window._lastOverpassTime = Date.now();
                fetchBounds();
            }, minInterval - (now - window._lastOverpassTime));
        }
    }
}

// Fetch nearby hospitals/clinics from Overpass (OpenStreetMap) and add markers


// Fetch POIs using a Leaflet bounds object (bbox). Protect against huge areas.
async function fetchHealthcarePOIsForBounds(bounds){
    if(!window._snapshotMap) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latSpan = Math.abs(ne.lat - sw.lat);
    const lngSpan = Math.abs(ne.lng - sw.lng);

    const MAX_LAT_SPAN = 6.5; const MAX_LNG_SPAN = 12;
    if(latSpan > MAX_LAT_SPAN || lngSpan > MAX_LNG_SPAN){
        console.warn('Viewport too large for Overpass query; narrow the view or use server-side data for country-wide requests.');
        return;
    }

    const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
    const query = `[out:json];(node["amenity"="hospital"](${bbox});node["amenity"="clinic"](${bbox});node["amenity"="social_facility"](${bbox});way["amenity"="hospital"](${bbox});way["amenity"="clinic"](${bbox});way["amenity"="social_facility"](${bbox}););out center;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    try{
        const res = await fetch(url);
        const json = await res.json();
        const elements = json.elements || [];

        if(window._snapshotHealthCluster){
            window._snapshotHealthCluster.clearLayers();
        }

        elements.forEach(e=>{
            const lat2 = e.lat || (e.center && e.center.lat);
            const lon2 = e.lon || (e.center && e.center.lon);
            if(!lat2 || !lon2) return;
            const tags = e.tags || {};
            const name = tags.name || tags['name:en'] || 'Unnamed';
            const amenity = tags.amenity || '';
            const addr = tags['addr:full'] || tags['addr:street'] || '';
            const phone = tags.phone || tags['contact:phone'] || '';
            const popup = `<strong>${name}</strong><br>${amenity}${addr?'<br>'+addr:''}${phone?'<br>📞 '+phone:''}`;
            const marker = L.marker([lat2, lon2], { title: name });
            marker.bindPopup(popup);
            marker.on('click', () => { marker.openPopup(); });
            window._snapshotHealthCluster.addLayer(marker);
        });
    }catch(err){
        console.error('Overpass fetch error', err);
    }
}

// ------------------ Chart ------------------
function renderChart(){const arr=Storage.getAll();const counts={Healthy:0,'Mild Symptoms':0,'Needs Check-up':0};arr.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);const ctx=document.getElementById('healthChart').getContext('2d');if(window._healthChart)window._healthChart.destroy();window._healthChart=new Chart(ctx,{type:'pie',data:{labels:Object.keys(counts),datasets:[{data:Object.values(counts)}]}})}

// ------------------ Map Snapshot ------------------
function initSnapshot(){
    const map = L.map('mapSnapshot', { zoomControl:false, attributionControl:true }).setView([8.3677,124.8656],12);
    window._snapshotMap = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    
    // create cluster group for all health POIs (hospitals, clinics, posts)
    window._snapshotHealthCluster = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:50}).addTo(map);
    
    // sample markers (will be replaced by Overpass results)
    L.marker([14.6,120.98]).addTo(map).bindPopup('Hospital A');
    L.marker([14.61,120.99]).addTo(map).bindPopup('Clinic B');

    // fetch POIs whenever the snapshot map view changes
    map.on('moveend', () => {
        const bounds = map.getBounds();
        fetchHealthcarePOIsForBounds(bounds);
    });
}

// Full Map is initialized separately below

// Fetch POIs for a specific amenity and add to the provided layer (cluster)
async function fetchHealthcarePOIsForBoundsType(bounds, amenity, layer){
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const latSpan = Math.abs(ne.lat - sw.lat);
    const lngSpan = Math.abs(ne.lng - sw.lng);
    const MAX_LAT_SPAN = 6.5; const MAX_LNG_SPAN = 12;
    if(latSpan > MAX_LAT_SPAN || lngSpan > MAX_LNG_SPAN){
        console.warn('Viewport too large for Overpass query; narrow the view or use server-side data.');
        return;
    }
    const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
    const query = `[out:json];(node["amenity"="${amenity}"](${bbox});way["amenity"="${amenity}"](${bbox}););out center;`;
    const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);
    try{
        const res = await fetch(url);
        const json = await res.json();
        const elements = json.elements || [];
        if(layer.clearLayers) layer.clearLayers();
        elements.forEach(e=>{
            const lat2 = e.lat || (e.center && e.center.lat);
            const lon2 = e.lon || (e.center && e.center.lon);
            if(!lat2 || !lon2) return;
            const tags = e.tags || {};
            const name = tags.name || tags['name:en'] || 'Unnamed';
            const addr = tags['addr:full'] || tags['addr:street'] || '';
            const phone = tags.phone || tags['contact:phone'] || '';
            const popup = `<strong>${name}</strong><br>${amenity}${addr?'<br>'+addr:''}${phone?'<br>📞 '+phone:''}`;
            const m = L.marker([lat2, lon2], { title: name });
            m.bindPopup(popup);
            m.on('click', () => { m.openPopup(); });
            if(layer.addLayer) {
                layer.addLayer(m);
            } else {
                const mapRef = window._snapshotMap || window._fullMap;
                if(mapRef) layer.addTo(mapRef).addLayer(m);
            }
        });
    }catch(err){console.error('Overpass fetch error', err);}
}

function initFullMap(){
    const map = L.map('fullMap').setView([8.3677,124.8656],12);
    window._fullMap = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);

    // cluster groups for hospitals, clinics, and posts
    const hospitals = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:60}).addTo(map);
    const clinics = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:60}).addTo(map);
    const posts = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:60}).addTo(map);

    // initial fetch for current viewport
    const bounds = map.getBounds();
    fetchHealthcarePOIsForBoundsType(bounds, 'hospital', hospitals);
    fetchHealthcarePOIsForBoundsType(bounds, 'clinic', clinics);
    fetchHealthcarePOIsForBoundsType(bounds, 'social_facility', posts);

    // refresh on moveend (debounced in caller if needed)
    map.on('moveend', ()=>{
        const b = map.getBounds();
        fetchHealthcarePOIsForBoundsType(b, 'hospital', hospitals);
        fetchHealthcarePOIsForBoundsType(b, 'clinic', clinics);
        fetchHealthcarePOIsForBoundsType(b, 'social_facility', posts);
    });

    // add sample post as fallback
    const samplePost = L.marker([14.595,120.985]).bindPopup('<strong>Community Post 1</strong><br>Community Health Post');
    posts.addLayer(samplePost);

    document.getElementById('showHospitals').addEventListener('change', e=>{ e.target.checked?map.addLayer(hospitals):map.removeLayer(hospitals) });
    document.getElementById('showClinics').addEventListener('change', e=>{ e.target.checked?map.addLayer(clinics):map.removeLayer(clinics) });
    document.getElementById('showPosts').addEventListener('change', e=>{ e.target.checked?map.addLayer(posts):map.removeLayer(posts) });
}

// ------------------ Checker (checker.html) ------------------
function initChecker(){
    const map = L.map('checkerMap').setView([8.3677,124.8656],12);
    window._checkerMap = map;
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    
    // cluster groups for hospitals, clinics, and posts
    const hospitals = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:60}).addTo(map);
    const clinics = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:60}).addTo(map);
    const posts = L.markerClusterGroup({showCoverageOnHover:false, spiderfyOnMaxZoom:true, maxClusterRadius:60}).addTo(map);
    
    // fetch POIs for current viewport
    const bounds = map.getBounds();
    fetchHealthcarePOIsForBoundsType(bounds, 'hospital', hospitals);
    fetchHealthcarePOIsForBoundsType(bounds, 'clinic', clinics);
    fetchHealthcarePOIsForBoundsType(bounds, 'social_facility', posts);
    
    // refresh on moveend
    map.on('moveend', ()=>{
        const b = map.getBounds();
        fetchHealthcarePOIsForBoundsType(b, 'hospital', hospitals);
        fetchHealthcarePOIsForBoundsType(b, 'clinic', clinics);
        fetchHealthcarePOIsForBoundsType(b, 'social_facility', posts);
    });
    
    // user location marker (click to set)
    let chosen = null;
    map.on('click', async e=>{
        const {lat, lng} = e.latlng;
        if(chosen) map.removeLayer(chosen);
        chosen = L.marker([lat, lng]).addTo(map);
        
        // reverse geocode to get address
        const locInput = document.getElementById('locInput');
        locInput.value = 'Getting address...';
        
        try{
            const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
            const res = await fetch(url);
            const data = await res.json();
            const address = data.address && (data.address.road || data.address.village || data.address.city || data.address.county || 'Unknown location');
            locInput.value = address || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            chosen.bindPopup(`<strong>${address}</strong><br>${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
        }catch(err){
            console.error('Geocoding error', err);
            locInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            chosen.bindPopup(`${lat.toFixed(5)}, ${lng.toFixed(5)}`).openPopup();
        }
    });
    
    // form submission
    const form = document.getElementById('checkerForm');
    form.addEventListener('submit', e=>{
        e.preventDefault();
        const temp = document.getElementById('tempInput').value;
        const symptoms = document.getElementById('symptomsInput').value;
        const mood = document.getElementById('moodInput').value;
        const loc = document.getElementById('locInput').value || null;
        const rec = new HealthRecord(temp, symptoms, mood, loc);
        Storage.add(rec);
        alert('Saved');
        location.href = 'records.html';
    });
}

// ------------------ Records (records.html) ------------------
function initRecords(){
    const tbody = document.querySelector('#recordsTable tbody');
    const viewModal = new bootstrap.Modal(document.getElementById('viewModal'));

    function render(){
        // Prefer the 'records' array (submitted via checker form). Fallback to Storage healthRecords.
        const userRecords = JSON.parse(localStorage.getItem('records')) || null;
        if(userRecords && Array.isArray(userRecords) && userRecords.length){
            tbody.innerHTML = userRecords.map((r, idx) => `
                <tr>
                    <td>${(r.name||'N/A')}</td>
                    <td>${r.date}</td>
                    <td>${r.temperature}°C</td>
                    <td>${r.temperature >= 37.5 ? 'Fever' : 'Normal'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary view" data-idx="${idx}">View</button>
                        <button class="btn btn-sm btn-danger del" data-idx="${idx}">Delete</button>
                    </td>
                </tr>
            `).join('');

            document.querySelectorAll('.view').forEach(b => b.addEventListener('click', e => {
                const i = parseInt(e.target.dataset.idx, 10);
                const rec = JSON.parse(localStorage.getItem('records'))[i];
                document.getElementById('modalBody').innerHTML = `
                    <p><strong>Name:</strong> ${rec.name}</p>
                    <p><strong>Age:</strong> ${rec.age}</p>
                    <p><strong>Gender:</strong> ${rec.gender}</p>
                    <p><strong>Address:</strong> ${rec.address}</p>
                    <p><strong>Temperature:</strong> ${rec.temperature}°C</p>
                    <p><strong>Symptoms:</strong> ${rec.symptoms}</p>
                    <p><strong>Mood:</strong> ${rec.mood}</p>
                    <p><strong>Location:</strong> ${rec.location || 'N/A'}</p>
                    <p><strong>Date Submitted:</strong> ${rec.date}</p>
                `;
                viewModal.show();
            }));

            document.querySelectorAll('.del').forEach(b => b.addEventListener('click', e => {
                const i = parseInt(e.target.dataset.idx, 10);
                if(confirm('Delete this record?')){
                    const arr = JSON.parse(localStorage.getItem('records')) || [];
                    arr.splice(i,1);
                    localStorage.setItem('records', JSON.stringify(arr));
                    render();
                }
            }));
        } else {
            // No user-submitted records — show empty state (do NOT fall back to internal coded records)
            tbody.innerHTML = `<tr><td colspan="5" class="text-center">No records found.</td></tr>`;
        }
    }

    render();
}

// ------------------ Dashboard helpers ------------------
function renderRecent(){
    const el=document.getElementById('recentList');
    if(!el) return;
    
    // Prioritize user-submitted records (same as records page)
    const userRecords = JSON.parse(localStorage.getItem('records')) || null;
    let recentRecords = [];
    
    if(userRecords && Array.isArray(userRecords) && userRecords.length){
        // Use user-submitted records
        recentRecords = userRecords.slice(0,5);
        el.innerHTML = recentRecords.map(r => `
            <div class="col-md-4">
                <div class="card p-2">
                    <strong>${r.temperature >= 37.5 ? 'Fever' : 'Normal'}</strong>
                    <div>${r.temperature}°C</div>
                    <small class="text-muted">${r.date}</small>
                </div>
            </div>
        `).join('');
    } else {
        // Fallback to Storage records (internal)
        const arr = Storage.getAll().slice(0,5);
        el.innerHTML = arr.map(r => `
            <div class="col-md-4">
                <div class="card p-2">
                    <strong>${r.status}</strong>
                    <div>${r.temperature}°C</div>
                    <small class="text-muted">${r.date}</small>
                </div>
            </div>
        `).join('');
    }
}
// ------------------ FIXED CHECKER SUBMISSION ------------------
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("checkerForm");
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            const ageVal = parseInt(document.getElementById("ageInput").value, 10);
            if (isNaN(ageVal) || ageVal < 0) {
                alert('Please enter a valid non-negative age');
                return;
            }

            const entry = {
                name: document.getElementById("nameInput").value,
                age: ageVal,
                gender: document.getElementById("genderInput").value,
                address: document.getElementById("addressInput").value,
                temperature: document.getElementById("tempInput").value,
                symptoms: document.getElementById("symptomsInput").value,
                mood: document.getElementById("moodInput").value,
                location: document.getElementById("locInput").value,
                date: new Date().toLocaleString()
            };

            let records = JSON.parse(localStorage.getItem("records")) || [];
            records.push(entry);
            localStorage.setItem("records", JSON.stringify(records));

            alert("Health check submitted!");
            window.location.href = "records.html";
        });
    }
});

// ------------------ FIXED LOAD RECORDS ------------------
function loadRecords() {
    const records = JSON.parse(localStorage.getItem("records")) || [];
    const tbody = document.querySelector("#recordsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    records.forEach((rec, index) => {
        const row = `
            <tr>
                <td>${rec.name}</td>
                <td>${rec.date}</td>
                <td>${rec.temperature}°C</td>
                <td>${rec.temperature >= 37.5 ? "Fever" : "Normal"}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewRecord(${index})">
                        View
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}

// ------------------ FIXED VIEW RECORD ------------------
function viewRecord(index) {
    const records = JSON.parse(localStorage.getItem("records")) || [];
    const rec = records[index];

    const details = `
        <p><strong>Name:</strong> ${rec.name}</p>
        <p><strong>Age:</strong> ${rec.age}</p>
        <p><strong>Gender:</strong> ${rec.gender}</p>
        <p><strong>Address:</strong> ${rec.address}</p>
        <p><strong>Temperature:</strong> ${rec.temperature}°C</p>
        <p><strong>Symptoms:</strong> ${rec.symptoms}</p>
        <p><strong>Mood:</strong> ${rec.mood}</p>
        <p><strong>Location:</strong> ${rec.location || "N/A"}</p>
        <p><strong>Date Submitted:</strong> ${rec.date}</p>
    `;

    document.getElementById("modalBody").innerHTML = details;

    const modal = new bootstrap.Modal(document.getElementById("viewModal"));
    modal.show();
}
// ------------------ LOAD RECORDS TABLE ------------------
function loadRecords() {
    const records = JSON.parse(localStorage.getItem("records")) || [];
    const tbody = document.querySelector("#recordsTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    records.forEach((rec, index) => {
        const row = `
            <tr>
                <td>${rec.name}</td>   
                <td>${rec.date}</td>
                <td>${rec.temperature}°C</td>
                <td>${rec.temperature >= 37.5 ? "Fever" : "Normal"}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="viewRecord(${index})">
                        View
                    </button>
                </td>
            </tr>
        `;
        tbody.insertAdjacentHTML("beforeend", row);
    });
}

// Apply saved theme on page load
if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
}

// PASSWORD TOGGLE
document.addEventListener("DOMContentLoaded", () => {
    const password = document.getElementById("password");
    const toggle = document.getElementById("togglePassword");
    const eyeIcon = document.getElementById("eyeIcon");
    if (toggle && password && eyeIcon) {
        toggle.addEventListener("click", () => {
            if (password.type === "password") {
                password.type = "text";

                // Slashed eye icon
                eyeIcon.innerHTML = `
                    <path d="M2 2l20 20" stroke="#222" stroke-width="2"/>
                    <path d="M12 5c-5 0-9 3-11 7 1 2.5 3 4.8 5.3 6.3" 
                          stroke="#222" stroke-width="2" fill="none"/>
                    <path d="M12 12c1.5 1.5 3.5 3.5 6.7 6.7" 
                          stroke="#222" stroke-width="2" fill="none"/>
                `;
            } else {
                password.type = "password";

                // Normal eye icon
                eyeIcon.innerHTML = `
                    <path d="M12 5C7 5 2.7 8.1 1 12c1.7 3.9 6 7 11 7s9.3-3.1 11-7c-1.7-3.9-6-7-11-7z" fill="#222"/>
                    <circle cx="12" cy="12" r="4" fill="#333"/>
                `;
            }
        });
    }
});

