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
let currentReportRows = [];
let reportCurrentPage = 1;
const ATTENDANCE_COLLECTION = "attendance";
const REPORT_PAGE_SIZE = 10;

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
const reportEmployeeSearch = document.getElementById('report-employee-search');
const photoModal = document.getElementById('photo-modal');
const photoModalImg = document.getElementById('photo-modal-img');
const photoModalCaption = document.getElementById('photo-modal-caption');

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
    
    reportEmployeeSearch.addEventListener('input', (e) => {
        renderReportEmployeeOptions(e.target.value);
        resetReportPageAndRender();
    });
    document.getElementById('filter-employee').addEventListener('change', resetReportPageAndRender);
    document.getElementById('filter-date-start').addEventListener('change', resetReportPageAndRender);
    document.getElementById('filter-date-end').addEventListener('change', resetReportPageAndRender);
    document.getElementById('btn-report-prev').addEventListener('click', () => changeReportPage(-1));
    document.getElementById('btn-report-next').addEventListener('click', () => changeReportPage(1));
    document.getElementById('btn-close-photo-modal').addEventListener('click', closePhotoModal);
    photoModal.addEventListener('click', (e) => {
        if (e.target === photoModal) closePhotoModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !photoModal.classList.contains('hidden')) {
            closePhotoModal();
        }
    });

    document.getElementById('btn-back-home').addEventListener('click', () => {
        summaryArea.classList.add('hidden');
        actionArea.classList.remove('hidden');
        resetCapturePreview();
        showLocationStatus("");
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
    if (!currentEmployeeId) {
        resetAttendanceStatus();
        return;
    }
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
        disableAttendanceBtns();
        showGlobalStatus("Gagal mengambil status absensi.", "error");
    }
}

async function startAttendance(type) {
    if (!currentEmployeeId || !currentEmployeeName) {
        showGlobalStatus("Pilih nama petugas terlebih dahulu.", "error");
        return;
    }

    currentType = type;
    const typeLabel = type === "checkin" ? "Check-In" : "Check-Out";
    showGlobalStatus(`Meminta izin lokasi untuk ${typeLabel}...`, "info");
    showLocationStatus("Mengambil lokasi perangkat. Pastikan izin lokasi aktif dan berada di titik absensi.", "info");
    
    try {
        const pos = await getCurrentPosition();
        userLocation = pos.coords;
        const distanceFromOffice = calculateDistanceMeters(
            userLocation.latitude,
            userLocation.longitude,
            CONFIG.OFFICE_LOCATION.LAT,
            CONFIG.OFFICE_LOCATION.LNG
        );
        const distanceText = Math.round(distanceFromOffice);
        const accuracyText = Math.round(userLocation.accuracy);
        const allowedRadius = CONFIG.OFFICE_LOCATION.ALLOWED_RADIUS_METERS;
        
        if (userLocation.accuracy > CONFIG.OFFICE_LOCATION.MAX_GPS_ACCURACY_METERS) {
            throw new Error(`Akurasi lokasi belum cukup baik (±${accuracyText}m). Coba pindah ke area terbuka, aktifkan GPS presisi tinggi, lalu ulangi.`);
        }

        if (distanceFromOffice > allowedRadius) {
            throw new Error(`Anda berada di luar area absensi. Jarak Anda ${distanceText}m dari titik absensi, batas maksimal ${allowedRadius}m.`);
        }

        showLocationStatus(`Lokasi valid. Jarak ${distanceText}m dari titik absensi, akurasi ±${accuracyText}m.`, "success");
        showGlobalStatus("Lokasi valid. Menyalakan kamera...", "info");
        await startCamera();
        
        currentChallenge = CONFIG.CHALLENGES[Math.floor(Math.random() * CONFIG.CHALLENGES.length)];
        challengeText.textContent = currentChallenge;
        
        actionArea.classList.add('hidden');
        cameraArea.classList.remove('hidden');
        globalStatus.classList.add('hidden');
        
    } catch (err) {
        const message = getLocationErrorMessage(err);
        showGlobalStatus(message, "error");
        showLocationStatus(message, "error");
    }
}

async function handleCapture() {
    const btn = document.getElementById('btn-capture');
    btn.disabled = true;
    btn.innerHTML = `<span class="loader"></span> Memproses...`;

    try {
        const dataUrl = await captureWatermarkedPhoto();
        await saveAttendanceRecord(dataUrl);
        
        document.getElementById('captured-photo-preview').src = dataUrl;
        
        stopCamera();
        cameraArea.classList.add('hidden');
        actionArea.classList.add('hidden');
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
        await waitForVideoReady();
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
    if (!video.videoWidth || !video.videoHeight) {
        throw new Error("Kamera belum siap. Coba tunggu sebentar lalu ambil ulang.");
    }

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

async function saveAttendanceRecord(dataUrl) {
    const now = new Date();
    const dist = calculateDistanceMeters(
        userLocation.latitude, 
        userLocation.longitude,
        CONFIG.OFFICE_LOCATION.LAT,
        CONFIG.OFFICE_LOCATION.LNG
    );
    const photoUpload = await uploadPhotoToCloudinary(dataUrl);

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
        createdAt: new Date().toISOString(),
        source: "web",
        photoUrl: photoUpload?.secure_url || "",
        photoPublicId: photoUpload?.public_id || "",
        photoStatus: photoUpload ? "uploaded" : "not_configured"
    };

    try {
        await addDoc(collection(db, ATTENDANCE_COLLECTION), {
            ...record,
            createdAtServer: serverTimestamp()
        });
        cacheAttendanceRecord(record);
    } catch (err) {
        console.error(err);
        cacheAttendanceRecord({ ...record, syncStatus: "pending" });
        throw new Error("Data belum tersimpan ke Firebase. Coba cek koneksi internet lalu ulangi.");
    }
}

async function hasAttendanceToday(employeeId, localDate, type) {
    try {
        const q = query(
            collection(db, ATTENDANCE_COLLECTION),
            where("employeeId", "==", employeeId),
            where("localDate", "==", localDate),
            where("type", "==", type)
        );
        const snap = await getDocs(q);
        return !snap.empty;
    } catch (err) {
        console.error(err);
        const history = getCachedAttendanceHistory();
        return history.some(r => r.employeeId === employeeId && r.localDate === localDate && r.type === type);
    }
}

// --- Report ---

function openReport() {
    reportScreen.classList.remove('hidden');
    renderReportEmployeeOptions(reportEmployeeSearch.value);
    reportCurrentPage = 1;
    
    const today = formatDateMakassar(new Date());
    if (!document.getElementById('filter-date-start').value) {
        document.getElementById('filter-date-start').value = today;
    }
    if (!document.getElementById('filter-date-end').value) {
        document.getElementById('filter-date-end').value = today;
    }
    renderReport();
}

function renderReportEmployeeOptions(filterText = "") {
    const select = document.getElementById('filter-employee');
    const selectedBefore = select.value;
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

    if (filtered.length === 1 && term !== "") {
        select.value = filtered[0].id;
    } else if (filtered.some(emp => emp.id === selectedBefore)) {
        select.value = selectedBefore;
    }
}

function closeReport() {
    reportScreen.classList.add('hidden');
}

async function renderReport() {
    const searchTerms = document.getElementById('report-employee-search').value.toLowerCase().trim();
    const filterId = document.getElementById('filter-employee').value;
    const dS = document.getElementById('filter-date-start').value;
    const dE = document.getElementById('filter-date-end').value;

    const list = document.getElementById('report-list');
    const summary = document.getElementById('report-summary');
    const pagination = document.getElementById('report-pagination');
    list.innerHTML = '';
    pagination.classList.add('hidden');
    summary.classList.remove('hidden');
    summary.textContent = "Memuat data...";

    const history = await getAttendanceHistory();

    currentReportRows = history.filter(r => {
        let matchName = true;
        if (filterId) {
            matchName = (r.employeeId === filterId);
        } else if (searchTerms) {
            matchName = r.employeeName.toLowerCase().includes(searchTerms) || 
                        r.employeeId.toLowerCase().includes(searchTerms);
        }

        const afterStart = !dS || r.localDate >= dS;
        const beforeEnd = !dE || r.localDate <= dE;
        const matchDate = afterStart && beforeEnd;
        return matchName && matchDate;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    summary.textContent = `${currentReportRows.length} data ditemukan`;

    if (currentReportRows.length === 0) {
        list.innerHTML = `<div style="text-align:center;padding:40px;opacity:0.5;">
            <p>Data tidak ditemukan.</p>
        </div>`;
        return;
    }

    const totalPages = Math.max(1, Math.ceil(currentReportRows.length / REPORT_PAGE_SIZE));
    if (reportCurrentPage > totalPages) reportCurrentPage = totalPages;
    if (reportCurrentPage < 1) reportCurrentPage = 1;

    const startIndex = (reportCurrentPage - 1) * REPORT_PAGE_SIZE;
    const pageRows = currentReportRows.slice(startIndex, startIndex + REPORT_PAGE_SIZE);
    summary.textContent = `${currentReportRows.length} data ditemukan · Menampilkan ${startIndex + 1}-${startIndex + pageRows.length}`;

    let lastDate = "";
    pageRows.forEach(r => {
        if (r.localDate !== lastDate) {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'report-date-group';
            dateGroup.textContent = formatDisplayDate(r.localDate);
            list.appendChild(dateGroup);
            lastDate = r.localDate;
        }

        const card = document.createElement('div');
        card.className = 'attendance-card';
        const photoMarkup = r.photoUrl ? `
            <button class="photo-thumb-btn" type="button" data-photo-url="${escapeAttr(r.photoUrl)}" data-caption="${escapeAttr(`${r.employeeName} - ${r.localDate} ${r.localTime}`)}" aria-label="Lihat foto ${escapeAttr(r.employeeName)}">
                <img class="photo-thumb" src="${escapeAttr(r.photoUrl)}" alt="Foto ${escapeAttr(r.employeeName)}" loading="lazy">
            </button>
        ` : `<div class="photo-thumb-placeholder">Tanpa Foto</div>`;

        card.innerHTML = `
            ${photoMarkup}
            <div class="card-info">
                <div class="emp-name">${r.employeeName}</div>
                <div class="time-info">Tanggal: ${r.localDate}</div>
                <div class="time-info">Waktu: ${r.localTime}</div>
            </div>
            <div class="card-badge badge-${r.type}">${r.type === 'checkin' ? 'Check-In' : 'Check-Out'}</div>
        `;
        const thumbBtn = card.querySelector('.photo-thumb-btn');
        if (thumbBtn) {
            thumbBtn.addEventListener('click', () => {
                openPhotoModal(thumbBtn.dataset.photoUrl, thumbBtn.dataset.caption);
            });
        }
        list.appendChild(card);
    });

    updateReportPagination(totalPages);
}

function resetReportPageAndRender() {
    reportCurrentPage = 1;
    renderReport();
}

function changeReportPage(delta) {
    const totalPages = Math.max(1, Math.ceil(currentReportRows.length / REPORT_PAGE_SIZE));
    reportCurrentPage = Math.min(totalPages, Math.max(1, reportCurrentPage + delta));
    renderReport();
}

function updateReportPagination(totalPages) {
    const pagination = document.getElementById('report-pagination');
    const prev = document.getElementById('btn-report-prev');
    const next = document.getElementById('btn-report-next');
    const info = document.getElementById('report-page-info');

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        return;
    }

    pagination.classList.remove('hidden');
    prev.disabled = reportCurrentPage <= 1;
    next.disabled = reportCurrentPage >= totalPages;
    info.textContent = `Halaman ${reportCurrentPage} dari ${totalPages}`;
}

async function exportToCSV() {
    await renderReport();
    if (!currentReportRows.length) return alert("Tidak ada data sesuai filter.");

    const h = ["Tanggal", "Waktu", "Nama", "Tipe", "Lat", "Lng", "Akurasi", "Jarak", "Tantangan"];
    const rows = currentReportRows.map(r => [
        r.localDate,
        r.localTime,
        r.employeeName,
        r.type,
        r.latitude,
        r.longitude,
        r.accuracy,
        r.distanceFromOfficeMeters,
        r.challenge
    ]);
    let csv = "data:text/csv;charset=utf-8," + [h, ...rows].map(row => row.map(csvCell).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `Laporan_Absensi_${formatDateMakassar(new Date())}.csv`;
    link.click();
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
    if (!navigator.geolocation) {
        return Promise.reject(new Error("Browser tidak mendukung fitur lokasi."));
    }

    return new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 0
    }));
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

function getLocationErrorMessage(err) {
    if (err?.code === 1) {
        return "Izin lokasi ditolak. Aktifkan izin lokasi untuk browser ini lalu ulangi absensi.";
    }
    if (err?.code === 2) {
        return "Lokasi tidak tersedia. Pastikan GPS aktif dan koneksi perangkat stabil.";
    }
    if (err?.code === 3) {
        return "Pengambilan lokasi terlalu lama. Coba ulangi dari area yang lebih terbuka.";
    }
    return err?.message || "Gagal membaca lokasi perangkat.";
}

function formatDateMakassar(date) {
    const options = { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
    return `${parts.find(p=>p.type==='year').value}-${parts.find(p=>p.type==='month').value}-${parts.find(p=>p.type==='day').value}`;
}

function formatTimeMakassar(date) {
    return date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Makassar', hour12: false });
}

function formatDisplayDate(localDate) {
    const [year, month, day] = String(localDate || "").split("-").map(Number);
    if (!year || !month || !day) return localDate || "Tanggal tidak diketahui";

    return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Makassar"
    }).format(new Date(Date.UTC(year, month - 1, day)));
}

async function uploadPhotoToCloudinary(dataUrl) {
    if (!isCloudinaryConfigured()) {
        return null;
    }

    const form = new FormData();
    form.append("file", dataUrl);
    form.append("upload_preset", CONFIG.CLOUDINARY.UPLOAD_PRESET);
    form.append("folder", "checkinpetugas26");
    form.append("tags", "checkinpetugas26,absensi");
    form.append("context", [
        `employee_id=${currentEmployeeId}`,
        `employee_name=${currentEmployeeName}`,
        `type=${currentType}`,
        `local_date=${formatDateMakassar(new Date())}`
    ].join("|"));

    const endpoint = `https://api.cloudinary.com/v1_1/${CONFIG.CLOUDINARY.CLOUD_NAME}/image/upload`;
    const res = await fetch(endpoint, { method: "POST", body: form });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
        throw new Error(body.error?.message || "Upload foto ke Cloudinary gagal.");
    }

    return body;
}

function isCloudinaryConfigured() {
    return CONFIG.CLOUDINARY?.CLOUD_NAME &&
        CONFIG.CLOUDINARY?.UPLOAD_PRESET &&
        CONFIG.CLOUDINARY.CLOUD_NAME !== "YOUR_CLOUD_NAME" &&
        CONFIG.CLOUDINARY.UPLOAD_PRESET !== "YOUR_UNSIGNED_UPLOAD_PRESET";
}

async function getAttendanceHistory() {
    try {
        const snap = await getDocs(collection(db, ATTENDANCE_COLLECTION));
        const rows = snap.docs.map(doc => normalizeAttendanceRecord(doc.data()));
        localStorage.setItem('attendance_history', JSON.stringify(rows));
        return rows;
    } catch (err) {
        console.error(err);
        showGlobalStatus("Gagal mengambil data Firebase. Menampilkan cache lokal.", "error");
        return getCachedAttendanceHistory();
    }
}

function normalizeAttendanceRecord(record) {
    return {
        ...record,
        createdAt: record.createdAt || record.createdAtServer?.toDate?.()?.toISOString?.() || ""
    };
}

function getCachedAttendanceHistory() {
    return JSON.parse(localStorage.getItem('attendance_history') || '[]');
}

function cacheAttendanceRecord(record) {
    const history = getCachedAttendanceHistory();
    history.push(record);
    localStorage.setItem('attendance_history', JSON.stringify(history));
}

function openPhotoModal(url, caption) {
    photoModalImg.src = url;
    photoModalCaption.textContent = caption || "Foto absensi";
    photoModal.classList.remove('hidden');
    photoModal.setAttribute('aria-hidden', 'false');
}

function closePhotoModal() {
    photoModal.classList.add('hidden');
    photoModal.setAttribute('aria-hidden', 'true');
    photoModalImg.removeAttribute('src');
    photoModalCaption.textContent = "";
}

function renderEmployeeOptions(f = "") {
    const term = f.toLowerCase().trim();
    const selectedBefore = currentEmployeeId;
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
    } else if (filtered.some(e => e.id === selectedBefore)) {
        employeeSelect.value = selectedBefore;
    } else if (term === "") {
        clearSelectedEmployee();
    } else {
        clearSelectedEmployee();
    }
}

function clearSelectedEmployee() {
    employeeSelect.value = "";
    currentEmployeeId = null;
    currentEmployeeName = null;
    resetAttendanceStatus();
    disableAttendanceBtns();
}

function resetAttendanceStatus() {
    document.querySelector('#status-checkin .val').textContent = "-";
    document.querySelector('#status-checkout .val').textContent = "-";
}

function resetCapturePreview() {
    document.getElementById('captured-photo-preview').removeAttribute('src');
}

function waitForVideoReady() {
    if (video.readyState >= 2 && video.videoWidth && video.videoHeight) {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Kamera belum siap."));
        }, 5000);

        function cleanup() {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onReady);
            video.removeEventListener('canplay', onReady);
        }

        function onReady() {
            if (video.videoWidth && video.videoHeight) {
                cleanup();
                resolve();
            }
        }

        video.addEventListener('loadedmetadata', onReady);
        video.addEventListener('canplay', onReady);
    });
}

function csvCell(value) {
    const text = value === undefined || value === null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
}

function escapeAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function showStatus(el, msg, type) { el.textContent = msg; el.className = `status-msg status-${type}`; el.classList.remove('hidden'); }
function showGlobalStatus(msg, type = 'info') {
    if (!msg) { globalStatus.classList.add('hidden'); return; }
    globalStatus.textContent = msg; globalStatus.className = `status-msg status-${type}`; globalStatus.classList.remove('hidden');
}
function showLocationStatus(msg, type = 'info') {
    if (!msg) {
        gpsStatus.classList.add('hidden');
        return;
    }
    gpsStatus.textContent = msg;
    gpsStatus.className = `status-msg status-${type}`;
    gpsStatus.classList.remove('hidden');
}
function disableAttendanceBtns() {
    document.getElementById('btn-checkin').disabled = true;
    document.getElementById('btn-checkout').disabled = true;
}
