// app.js - all JS for Option 1 (basic structure)
// Note: Replace OPENWEATHER_API_KEY with your key

// ------------------ Classes + Storage ------------------
class User {
  constructor(username,password){this.username=username;this.password=password}
  login(u,p){return this.username===u&&this.password===p}
}
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
    document.getElementById('refreshWeather').addEventListener('click',()=>fetchWeather(document.getElementById('cityInput').value||'Manila'));
    fetchWeather(document.getElementById('cityInput').value||'Manila');
  }

  // map page
  if(document.getElementById('fullMap')){initFullMap()}

  // checker page
  if(document.getElementById('checkerForm')){initChecker()}

  // records page
  if(document.getElementById('recordsTable')){initRecords()}
});

// ------------------ Weather (OpenWeatherMap) ------------------
const OPENWEATHER_API_KEY='REPLACE_WITH_YOUR_KEY';
async function fetchWeather(city){try{const res=await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${OPENWEATHER_API_KEY}&units=metric`);const data=await res.json();if(res.ok){document.getElementById('w-temp').innerText=data.main.temp+' °C';document.getElementById('w-cond').innerText=data.weather[0].description;document.getElementById('w-hum').innerText='Humidity: '+data.main.humidity+'%';document.getElementById('w-alert').innerText='No alerts (OneCall requires different endpoint)'}else{document.getElementById('w-temp').innerText='--';document.getElementById('w-cond').innerText=data.message||'Error'}}catch(e){console.error(e)}}

// ------------------ Chart ------------------
function renderChart(){const arr=Storage.getAll();const counts={Healthy:0,'Mild Symptoms':0,'Needs Check-up':0};arr.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);const ctx=document.getElementById('healthChart').getContext('2d');if(window._healthChart)window._healthChart.destroy();window._healthChart=new Chart(ctx,{type:'pie',data:{labels:Object.keys(counts),datasets:[{data:Object.values(counts)}]}})}

// ------------------ Map Snapshot ------------------
function initSnapshot(){const map=L.map('mapSnapshot',{zoomControl:false,attributionControl:false}).setView([14.5995,120.9842],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);L.marker([14.6,120.98]).addTo(map).bindPopup('Hospital A');L.marker([14.61,120.99]).addTo(map).bindPopup('Clinic B')}

// ------------------ Full Map (map.html) ------------------
function initFullMap(){const map=L.map('fullMap').setView([14.5995,120.9842],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);const hospitals=L.layerGroup().addTo(map);const clinics=L.layerGroup().addTo(map);const posts=L.layerGroup().addTo(map);const resources=[{type:'hospital',name:'Hospital A',lat:14.6,lng:120.98},{type:'clinic',name:'Clinic B',lat:14.61,lng:120.99},{type:'post',name:'Community Post 1',lat:14.595,lng:120.985}];resources.forEach(r=>{const m=L.marker([r.lat,r.lng]).bindPopup(`<strong>${r.name}</strong><br>${r.type}`);if(r.type==='hospital')hospitals.addLayer(m);if(r.type==='clinic')clinics.addLayer(m);if(r.type==='post')posts.addLayer(m)});document.getElementById('showHospitals').addEventListener('change',e=>{e.target.checked?map.addLayer(hospitals):map.removeLayer(hospitals)});document.getElementById('showClinics').addEventListener('change',e=>{e.target.checked?map.addLayer(clinics):map.removeLayer(clinics)});document.getElementById('showPosts').addEventListener('change',e=>{e.target.checked?map.addLayer(posts):map.removeLayer(posts)})}

// ------------------ Checker (checker.html) ------------------
function initChecker(){const map=L.map('checkerMap').setView([14.5995,120.9842],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);let chosen=null;map.on('click',e=>{const{lat,lng}=e.latlng;if(chosen)map.removeLayer(chosen);chosen=L.marker([lat,lng]).addTo(map);document.getElementById('locInput').value=`${lat.toFixed(5)},${lng.toFixed(5)}`});const form=document.getElementById('checkerForm');form.addEventListener('submit',e=>{e.preventDefault();const temp=document.getElementById('tempInput').value;const symptoms=document.getElementById('symptomsInput').value;const mood=document.getElementById('moodInput').value;const loc=document.getElementById('locInput').value||null;const rec=new HealthRecord(temp,symptoms,mood,loc);Storage.add(rec);alert('Saved');location.href='records.html'})}

// ------------------ Records (records.html) ------------------
function initRecords(){const tbody=document.querySelector('#recordsTable tbody');const viewModal=new bootstrap.Modal(document.getElementById('viewModal'));function render(){const all=Storage.getAll();tbody.innerHTML=all.map(r=>`<tr><td>${r.id}</td><td>${r.date}</td><td>${r.temperature}°C</td><td>${r.status}</td><td><button class="btn btn-sm btn-primary view" data-id="${r.id}">View</button> <button class="btn btn-sm btn-danger del" data-id="${r.id}">Delete</button></td></tr>`).join('');document.querySelectorAll('.view').forEach(b=>b.addEventListener('click',e=>{const id=e.target.dataset.id;const rec=Storage.getAll().find(x=>x.id===id);document.getElementById('modalBody').innerHTML=`<p><strong>Status:</strong> ${rec.status}</p><p><strong>Temp:</strong> ${rec.temperature}°C</p><p><strong>Symptoms:</strong> ${rec.symptoms}</p><p><strong>Mood:</strong> ${rec.mood}</p><p><strong>Location:</strong> ${rec.location||'n/a'}</p><p><strong>Date:</strong> ${rec.date}</p>`;viewModal.show()}));document.querySelectorAll('.del').forEach(b=>b.addEventListener('click',e=>{if(confirm('Delete?')){Storage.delete(e.target.dataset.id);render()}}))}render()}

// ------------------ Dashboard helpers ------------------
function renderRecent(){const arr=Storage.getAll().slice(0,5);const el=document.getElementById('recentList');if(!el) return;el.innerHTML=arr.map(r=>`<div class="col-md-4"><div class="card p-2"><strong>${r.status}</strong><div>${r.temperature}°C</div><small class="text-muted">${r.date}</small></div></div>`).join('')}
// ------------------ FIXED CHECKER SUBMISSION ------------------
document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("checkerForm");
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();

            const entry = {
                name: document.getElementById("nameInput").value,
                age: document.getElementById("ageInput").value,
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
                <td>${rec.name}</td>   <!-- 👈 FIXED: Shows patient name -->
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
const entry = {
    name: document.getElementById("nameInput").value,
    age: document.getElementById("ageInput").value,
    gender: document.getElementById("genderInput").value,
    address: document.getElementById("addressInput").value,
    temperature: document.getElementById("tempInput").value,
    symptoms: document.getElementById("symptomsInput").value,
    mood: document.getElementById("moodInput").value,
    location: document.getElementById("locInput").value,
    date: new Date().toLocaleString()
};
document.body.classList.add("dark-mode");
