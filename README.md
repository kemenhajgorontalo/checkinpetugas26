# Aplikasi Absensi Internal (Web-Based)

Aplikasi absensi sederhana untuk penggunaan internal sementara. Menggunakan validasi GPS, tantangan gesture kamera, dan penyimpanan cloud.

## Teknologi
- **Frontend**: Vanilla HTML, CSS, JavaScript.
- **Database**: Firebase Firestore.
- **Image Storage**: Cloudinary.
- **Hosting**: Cloudflare Pages.

## Persiapan & Instalasi

### 1. File Konfigurasi
Salin file `config.example.js` menjadi `config.js` di dalam direktori yang sama.
```bash
cp config.example.js config.js
```
Isi variabel di dalam `config.js` dengan kredensial Anda.

### 2. Setup Firebase
- Buat proyek di [Firebase Console](https://console.firebase.google.com/).
- Aktifkan **Firestore Database**.
- Daftarkan aplikasi Web untuk mendapatkan `firebaseConfig`.
- Buat koleksi bernama `attendance`.
- Pasang **Firebase Security Rules** sederhana:
```javascript
service cloud.firestore {
  match /databases/{database}/documents {
    match /attendance/{document=**} {
      allow read, write: if true; // Untuk demo internal. Batasi sesuai kebutuhan.
    }
  }
}
```

### 3. Setup Cloudinary
- Buat akun di [Cloudinary](https://cloudinary.com/).
- Buka Settings > Upload.
- Tambahkan **Unsigned Upload Preset**.
- Gunakan preset tersebut di `config.js`.

### 4. Password Akses
Aplikasi menggunakan shared password. Untuk mengganti password, buat hash SHA-256 dari password baru.
Contoh lewat browser console:
```javascript
async function hash(p) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(p));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
await hash('password_anda');
```
Salin hasilnya ke `AUTH_PASSWORD_HASH` di `config.js`.

## Cara Deploy ke Cloudflare Pages
1. Upload semua file ke repository GitHub.
2. Hubungkan GitHub ke Cloudflare Pages.
3. Pilih direktori root proyek.
4. Klik **Save and Deploy**.

## Keterbatasan & Keamanan
- **Shared Password**: Bukan sistem keamanan tingkat tinggi, hanya gerbang akses dasar.
- **Client-side Config**: Konfigurasi Firebase dan Cloudinary terlihat di browser. Ini normal untuk aplikasi static site tanpa backend. Gunakan Firebase App Check dan API Restrictions untuk keamanan tambahan.
- **GPS**: Akurasi tergantung pada perangkat dan lingkungan user.
- **Anti-Fraud**: Menggunakan `getUserMedia` mencegah upload dari galeri, namun tidak menjamin 100% terhadap manipulasi kamera tingkat lanjut (virtual camera).

## Kustomisasi
- **Daftar Karyawan**: Edit array `EMPLOYEES` di `config.js`.
- **Lokasi Kantor**: Edit `OFFICE_LOCATION` di `config.js`.
- **Warna & Font**: Tema cokelat muda menggunakan CSS Variable di `style.css`.
