/**
 * File konfigurasi contoh.
 * Salin file ini menjadi 'config.js' dan isi dengan kredensial Anda.
 * JANGAN COMMIT file 'config.js' ke repository publik jika ada data sensitif.
 */

const CONFIG = {
    // Firebase Configuration
    FIREBASE_CONFIG: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_PROJECT_ID.appspot.com",
        messagingSenderId: "YOUR_SENDER_ID",
        appId: "YOUR_APP_ID"
    },

    // Cloudinary Configuration
    CLOUDINARY: {
        CLOUD_NAME: "YOUR_CLOUD_NAME",
        UPLOAD_PRESET: "YOUR_UNSIGNED_UPLOAD_PRESET" // Harus unsigned preset
    },

    // Autentikasi (Shared Password)
    // Gunakan SHA-256 hash. Contoh: '123456' -> '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
    AUTH_PASSWORD_HASH: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",

    // Konfigurasi Kantor
    OFFICE_LOCATION: {
        LAT: 0.5333, // Contoh latitude
        LNG: 123.0667, // Contoh longitude
        ALLOWED_RADIUS_METERS: 100,
        MAX_GPS_ACCURACY_METERS: 100
    },

    // Daftar Karyawan (Petugas Haji 2026)
    EMPLOYEES: [
        { id: "4", name: "Dr. H. Mansur Basir, MH (Ketua)" },
        { id: "5", name: "H. Mahmud Y. Bobihu, S.Ag., MM (Wakil Ketua I)" },
        { id: "6", name: "H. Syafwan Yusuf Ekie, S.Ag., MH (Sekretaris)" },
        { id: "7", name: "Dwi Hartati Marhamah Ajuna, SE.I (Bendahara)" },
        { id: "8", name: "H. Muhaiminul Aziz Yunus, S.Pd., MM., M.Pd (Ketua Bidang A)" },
        // ... (data lainnya)
    ],

    // Daftar Gesture Tantangan
    CHALLENGES: [
        "Angkat 1 jari",
        "Angkat 2 jari (Peace)",
        "Tunjukkan jempol (Sip)",
        "Pegang ID card / KTP",
        "Tangan kanan di dada",
        "Tunjuk ke kamera",
        "Tutup mata kiri",
        "Salam hormat"
    ]
};
