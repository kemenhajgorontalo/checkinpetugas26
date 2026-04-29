// Import Firebase SDK via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    getDocs, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Global Variables
let db;
let currentEmployeeId = null;
let currentEmployeeName = null;
let currentType = null; 
let currentChallenge = "";
let userLocation = null;
let videoStream = null;

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const mainScreen = document.getElementById('main-screen');
const cameraArea = document.getElementById('camera-area');
const actionArea = document.getElementById('action-area');
const summaryArea = document.getElementById('summary-area');
const globalStatus = document.getElementById('global-status');
const gpsStatus = document.getElementById('gps-status');
const reportScreen = document.getElementById('report-screen');

const employeeSelect = document.getElementById('employee-select');
const employeeSearch = document.getElementById('employee-search');
const challengeText = document.getElementById('challenge-text');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    if (typeof CONFIG === 'undefined') {
        alert("Konfigurasi tidak ditemukan. Pastikan config.js tersedia.");
        return;
    }

    const app = initializeApp(CONFIG.FIREBASE_CONFIG);
    db = getFirestore(app);

    renderEmployeeOptions();

    employeeSearch.addEventListener('input', (e) => {
        renderEmployeeOptions(e.target.value);
    });

    if (sessionStorage.getItem('isLoggedIn') === 'true') {
        showMainScreen();
    }

    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btn-login').addEventListener('click', handleLogin);
    document.getElementById('btn-logout').addEventListener('click', handleLogout);
    
    employeeSelect.addEventListener('change', (e) => {
        currentEmployeeId = e.target.value;
        if (!currentEmployeeId) {
            currentEmployeeName = null;
            disableAttendanceBtns();
            return;
        }
        currentEmployeeName = e.target.options[e.target.selectedIndex].text;
        updateAttendanceStatus();
    });

    document.getElementById('btn-checkin').addEventListener('click', () => startAttendance('checkin'));
    document.getElementById('btn-checkout').addEventListener('click', () => startAttendance('checkout'));
    
    document.getElementById('btn-cancel-camera').addEventListener('click', stopCamera);
    document.getElementById('btn-capture').addEventListener('click', handleCapture);
    
    document.getElementById('btn-show-report').addEventListener('click', openReport);
    document.getElementById('btn-close-report').addEventListener('click', closeReport);
    
    document.getElementById('btn-export-csv').addEventListener('click', exportToCSV);
    
    document.getElementById('filter-employee').addEventListener('change', renderReport);
    document.getElementById('filter-date-start').addEventListener('change', renderReport);
    document.getElementById('filter-date-end').addEventListener('change', renderReport);

    document.getElementById('btn-back-home').addEventListener('click', () => {
        summaryArea.classList.add('hidden');
        actionArea.classList.remove('hidden');
        updateAttendanceStatus();
    });
}

// --- Authentication Logic ---

async function handleLogin() {
    const passwordInput = document.getElementById('access-password').value;
    const errorDiv = document.getElementById('login-error');
    
    showStatus(errorDiv, "Mengecek password...", "info");
    const hashed = await sha256(passwordInput);
    
    if (hashed === CONFIG.AUTH_PASSWORD_HASH) {
        sessionStorage.setItem('isLoggedIn', 'true');
        showMainScreen();
    } else {
        showStatus(errorDiv, "Password salah!", "error");
    }
}

function handleLogout() {
    sessionStorage.removeItem('isLoggedIn');
    location.reload();
}

function showMainScreen() {
    loginScreen.classList.add('hidden');
    mainScreen.classList.remove('hidden');
}

// --- Attendance Logic ---

async function updateAttendanceStatus() {
    if (!currentEmployeeId) return;
    const today = formatDateMakassar(new Date());
    
    try {
        const ci = await hasAttendanceToday(currentEmployeeId, today, 'checkin');
        const co = await hasAttendanceToday(currentEmployeeId, today, 'checkout');

        document.querySelector('#status-checkin .val').textContent = ci ? "SUDAH" : "BELUM";
        document.querySelector('#status-checkout .val').textContent = co ? "SUDAH" : "BELUM";

        const btnIn = document.getElementById('btn-checkin');
        const btnOut = document.getElementById('btn-checkout');

        btnIn.disabled = !!ci;
        btnOut.disabled = !ci || !!co; 
    } catch (err) {
        console.error(err);
        showGlobalStatus("Gagal mengambil status absensi.", "error");
    }
}

async function startAttendance(type) {
    currentType = type;
    showGlobalStatus("Meminta akses GPS...", "info");
    
    try {
        const pos = await getCurrentPosition();
        userLocation = pos.coords;
        
        if (userLocation.accuracy > CONFIG.OFFICE_LOCATION.MAX_GPS_ACCURACY_METERS) {
            throw new Error(`Akurasi GPS buruk (${Math.round(userLocation.accuracy)}m).`);
        }

        showGlobalStatus("GPS Valid. Menyalakan kamera...", "info");
        await startCamera();
        
        currentChallenge = CONFIG.CHALLENGES[Math.floor(Math.random() * CONFIG.CHALLENGES.length)];
        challengeText.textContent = currentChallenge;
        
        actionArea.classList.add('hidden');
        cameraArea.classList.remove('hidden');
        globalStatus.classList.add('hidden');
        
    } catch (err) {
        showGlobalStatus(err.message, "error");
    }
}

async function handleCapture() {
    const btn = document.getElementById('btn-capture');
    btn.disabled = true;
    btn.innerHTML = `<span class="loader"></span> Memproses...`;

    try {
        const dataUrl = await captureWatermarkedPhoto();
        await saveAttendanceRecordLocal(dataUrl);
        
        document.getElementById('captured-photo-preview').src = dataUrl;
        
        stopCamera();
        cameraArea.classList.add('hidden');
        summaryArea.classList.remove('hidden');
        showGlobalStatus("");
    } catch (err) {
        showGlobalStatus("Gagal: " + err.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = "Ambil Foto & Kirim";
    }
}

async function startCamera() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        video.srcObject = videoStream;
    } catch (err) {
        throw new Error("Kamera tidak aktif.");
    }
}

function stopCamera() {
    if (videoStream) videoStream.getTracks().forEach(track => track.stop());
    cameraArea.classList.add('hidden');
    actionArea.classList.remove('hidden');
}

async function captureWatermarkedPhoto() {
    const ctx = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const h = canvas.height;
    const w = canvas.width;
    const fontSize = Math.max(16, Math.floor(w / 35));
    const boxH = fontSize * 8;

    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, h - boxH, w, boxH);
    ctx.fillStyle = "white";
    ctx.font = `bold ${fontSize}px Poppins, sans-serif`;
    
    const now = new Date();
    const lines = [
        `NAMA: ${currentEmployeeName}`,
        `TIPE: ${currentType.toUpperCase()}`,
        `WAKTU: ${formatDateMakassar(now)} ${formatTimeMakassar(now)} WITA`,
        `LOC: ${userLocation.latitude.toFixed(6)}, ${userLocation.longitude.toFixed(6)}`,
        `ACC: ±${Math.round(userLocation.accuracy)}m`,
        `CHALLENGE: ${currentChallenge}`
    ];
    lines.forEach((l, i) => ctx.fillText(l, fontSize, h - boxH + (fontSize * 2) + (i * fontSize * 1.1)));

    return canvas.toDataURL('image/jpeg', 0.8);
}

async function saveAttendanceRecordLocal(dataUrl) {
    const now = new Date();
    const dist = calculateDistanceMeters(
        userLocation.latitude, 
        userLocation.longitude,
        CONFIG.OFFICE_LOCATION.LAT,
        CONFIG.OFFICE_LOCATION.LNG
    );

    const record = {
        employeeId: currentEmployeeId,
        employeeName: currentEmployeeName,
        type: currentType,
        challenge: currentChallenge,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        accuracy: userLocation.accuracy,
        distanceFromOfficeMeters: Math.round(dist),
        localDate: formatDateMakassar(now),
        localTime: formatTimeMakassar(now),
        createdAt: new Date().toISOString()
    };
    const history = JSON.parse(localStorage.getItem('attendance_history') || '[]');
    history.push(record);
    localStorage.setItem('attendance_history', JSON.stringify(history));
}

async function hasAttendanceToday(employeeId, localDate, type) {
    const history = JSON.parse(localStorage.getItem('attendance_history') || '[]');
    return history.some(r => r.employeeId === employeeId && r.localDate === localDate && r.type === type);
}

// --- Report ---

function openReport() {
    reportScreen.classList.remove('hidden');
    renderReportEmployeeOptions(); // Inisialisasi daftar nama di laporan
    
    const today = formatDateMakassar(new Date());
    document.getElementById('filter-date-start').value = today;
    document.getElementById('filter-date-end').value = today;
    renderReport();
}

function renderReportEmployeeOptions(filterText = "") {
    const select = document.getElementById('filter-employee');
    const term = filterText.toLowerCase().trim();

    select.innerHTML = '<option value="">Semua Petugas</option>';
    
    const filtered = CONFIG.EMPLOYEES.filter(emp => 
        emp.name.toLowerCase().includes(term) || emp.id.includes(term)
    );

    filtered.forEach(emp => {
        const opt = document.createElement('option');
        opt.value = emp.id;
        opt.textContent = emp.name;
        select.appendChild(opt);
    });

    // Auto select jika hasil pencarian unik (seperti di dashboard utama)
    if (filtered.length === 1 && term !== "") {
        select.value = filtered[0].id;
    }
}

function closeReport() {
    reportScreen.classList.add('hidden');
}

function renderReport() {
    const searchTerms = document.getElementById('report-employee-search').value.toLowerCase().trim();
    const filterId = document.getElementById('filter-employee').value;
    const dS = document.getElementById('filter-date-start').value;
    const dE = document.getElementById('filter-date-end').value;
    
    const history = JSON.parse(localStorage.getItem('attendance_history') || '[]');
    
    const filtered = history.filter(r => {
        // 1. Logika Filter Nama/ID
        let matchName = true;
        if (filterId) {
            matchName = (r.employeeId === filterId);
        } else if (searchTerms) {
            matchName = r.employeeName.toLowerCase().includes(searchTerms) || 
                        r.employeeId.toLowerCase().includes(searchTerms);
        }

        // 2. Logika Filter Tanggal
        // Jika sedang mencari nama secara spesifik, tampilkan SEMUA riwayatnya agar mudah ditemukan
        if ((filterId || searchTerms) && (dS === dE)) {
            const today = formatDateMakassar(new Date());
            if (dS === today) return matchName; 
        }

        const matchDate = r.localDate >= dS && r.localDate <= dE;
        return matchName && matchDate;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const list = document.getElementById('report-list');
    list.innerHTML = '';

    if (filtered.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5;">
            <p>Data tidak ditemukan.</p>
        </div>`;
        return;
    }

    filtered.forEach(r => {
        const card = document.createElement('div');
        card.className = 'attendance-card';
        card.innerHTML = `
            <div class="card-info">
                <div class="emp-name">${r.employeeName}</div>
                <div class="time-info">📅 ${r.localDate} | ⏰ ${r.localTime}</div>
            </div>
            <div class="card-badge badge-${r.type}">${r.type === 'checkin' ? 'Check-In' : 'Check-Out'}</div>
        `;
        list.appendChild(card);
    });
}

function exportToCSV() {
    const history = JSON.parse(localStorage.getItem('attendance_history') || '[]');
    if (!history.length) return alert("Kosong.");
    const h = ["Tanggal", "Waktu", "Nama", "Tipe", "Lat", "Lng"];
    const rows = history.map(r => [r.localDate, r.localTime, r.employeeName, r.type, r.latitude, r.longitude]);
    let csv = "data:text/csv;charset=utf-8," + h.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv); link.download = "Laporan.csv"; link.click();
}

window.clearLocalData = function() {
    if (confirm("Hapus semua riwayat absensi lokal?")) {
        localStorage.removeItem('attendance_history');
        location.reload();
    }
};

// --- Helpers ---
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCurrentPosition() {
    return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 }));
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function formatDateMakassar(date) {
    const options = { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
    return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}-${parts.find(p=>p.type==='day').value}`;
}

function formatTimeMakassar(date) {
    return date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour12: false });
}

function renderEmployeeOptions(f = "") {
    const term = f.toLowerCase().trim();
    employeeSelect.innerHTML = '<option value="">-- Hasil Pencarian --</option>';
    const filtered = CONFIG.EMPLOYEES.filter(e => e.name.toLowerCase().includes(term));
    
    filtered.forEach(e => {
        const opt = document.createElement('option');
        opt.value = e.id; opt.textContent = e.name;
        employeeSelect.appendChild(opt);
    });

    // Jika pencarian spesifik menghasilkan 1 orang, langsung pilih dan cek status
    if (filtered.length === 1 && term !== "") {
        employeeSelect.value = filtered[0].id;
        currentEmployeeId = filtered[0].id;
        currentEmployeeName = filtered[0].name;
        updateAttendanceStatus();
    } else if (term === "") {
        employeeSelect.value = "";
        currentEmployeeId = null;
        currentEmployeeName = null;
        disableAttendanceBtns();
    }
}

function showStatus(el, msg, type) { el.textContent = msg; el.className = `status-msg status-${type}`; el.classList.remove('hidden'); }
function showGlobalStatus(msg, type = 'info') {
    if (!msg) { globalStatus.classList.add('hidden'); return; }
    globalStatus.textContent = msg; globalStatus.className = `status-msg status-${type}`; globalStatus.classList.remove('hidden');
}
function disableAttendanceBtns() {
    document.getElementById('btn-checkin').disabled = true;
    document.getElementById('btn-checkout').disabled = true;
}
