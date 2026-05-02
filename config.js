/**
 * File konfigurasi contoh.
 * Salin file ini menjadi 'config.js' dan isi dengan kredensial Anda.
 * JANGAN COMMIT file 'config.js' ke repository publik jika ada data sensitif.
 */

const CONFIG = {
    // Firebase Configuration
    FIREBASE_CONFIG: {
        apiKey: "AIzaSyA4t-Ozc1sVwT3lrZ4fp0XcLpBzOOfYkgc",
        authDomain: "haji2026.firebaseapp.com",
        projectId: "haji2026",
        storageBucket: "haji2026.firebasestorage.app",
        messagingSenderId: "449125735663",
        appId: "1:449125735663:web:b849b89e69926c569c8f1a",
        measurementId: "G-8SW31WLEGM"
    },

    // Cloudinary Configuration
    CLOUDINARY: {
        CLOUD_NAME: "dt5ersomg",
        UPLOAD_PRESET: "checkinpetugas26_unsigned" // Harus unsigned preset
    },

    // Autentikasi (Shared Password)
    // Gunakan SHA-256 hash. Contoh: '123456' -> '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92'
    AUTH_PASSWORD_HASH: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92",

    // Konfigurasi Kantor
    OFFICE_LOCATION: {
        LAT: 0.5859928382763993,
        LNG: 123.06092033058262,
        ALLOWED_RADIUS_METERS: 500,
        MAX_GPS_ACCURACY_METERS: 50
    },

    // Daftar Karyawan (Petugas Haji 2026)
    EMPLOYEES: [
        { id: "4", name: "Dr. H. Mansur Basir, MH (Ketua)" },
        { id: "5", name: "H. Mahmud Y. Bobihu, S.Ag., MM (Wakil Ketua I)" },
        { id: "6", name: "H. Syafwan Yusuf Ekie, S.Ag., MH (Sekretaris)" },
        { id: "7", name: "Dwi Hartati Marhamah Ajuna, SE.I (Bendahara)" },
        { id: "8", name: "H. Muhaiminul Aziz Yunus, S.Pd., MM., M.Pd (Ketua Bidang A)" },
        { id: "9", name: "H. Abdul Qohar Salilama, S.T., M.Si (Koordinator Seksi Acara)" },
        { id: "10", name: "Dr. Hj. Wiwik Widyawati Mayang (Anggota Seksi Acara)" },
        { id: "11", name: "Dr. H. Rizan Adam, M.HI (Anggota Seksi Acara)" },
        { id: "12", name: "Siti Anjarwati (Anggota Seksi Acara)" },
        { id: "13", name: "Alfian Mitali, SE (Koordinator Seksi Kesekretariatan)" },
        { id: "14", name: "Andre Koniyo, S.Kom (Anggota Seksi Kesekretariatan)" },
        { id: "15", name: "Subhan Oponu (Anggota Seksi Kesekretariatan)" },
        { id: "16", name: "H. Hamdan Zain, S.Ag., M.Si (Koordinator Seksi Humas)" },
        { id: "17", name: "Febrianto Moli, S.Kom (Anggota Seksi Humas)" },
        { id: "18", name: "Umar (Anggota Seksi Humas)" },
        { id: "19", name: "Ikhwanul Alif Yunus (Anggota Seksi Humas)" },
        { id: "20", name: "Rindah Kohongia, S.Pd., M.Si (Koordinator Seksi Gelang)" },
        { id: "21", name: "Noldi Bobihu (Anggota Seksi Gelang)" },
        { id: "22", name: "Bagus Setiawan, S.Ag (Anggota Seksi Gelang)" },
        { id: "23", name: "Sepri Rahman (Anggota Seksi Gelang)" },
        { id: "24", name: "Mochamad Rizki Fachry Utina, SH (Koordinator Seksi Paspor)" },
        { id: "25", name: "Fatmah Olii, SH (Anggota Seksi Paspor)" },
        { id: "26", name: "Yeti Nirmawati M. Eki, S.Sos., M.Si. (Koordinator Seksi Living Cost)" },
        { id: "27", name: "Hj. Marisavavan Israil, S.Pd., M.Si (Anggota Seksi Living Cost)" },
        { id: "28", name: "Lolayanti Usman, S.Kom (Anggota Seksi Living Cost)" },
        { id: "29", name: "Farni Daud, SE (Koordinator Kartu Akomodasi)" },
        { id: "30", name: "Fitri Tampolo (Anggota Kartu Akomodasi)" },
        { id: "31", name: "H. Imran Nalole, S.Ag (Ketua Bidang B)" },
        { id: "32", name: "Wahyudi Ismail, S.E (Koordinator Seksi Penempatan)" },
        { id: "33", name: "Richic Octavianus Sumual, S.E (Anggota Seksi Penempatan)" },
        { id: "34", name: "H. Irwan Madina, S.Ap (Koordinator Seksi Akomodasi)" },
        { id: "35", name: "Sari Julianti Olii (Anggota Seksi Akomodasi)" },
        { id: "36", name: "Abdul Wahab Ibrahim (Anggota Seksi Akomodasi)" },
        { id: "37", name: "Roni Lamusu (Anggota Seksi Akomodasi)" },
        { id: "38", name: "Muslim Ishak (Anggota Seksi Akomodasi)" },
        { id: "39", name: "Hj. Sarina Gairi (Koordinator Seksi Konsumsi Jamaah)" },
        { id: "40", name: "Wisri Tudo, S.Pd (Anggota Seksi Konsumsi Jamaah)" },
        { id: "41", name: "Hj. Dahnizar Toma (Anggota Seksi Konsumsi Jamaah)" },
        { id: "42", name: "Yuni Humonggio, S.Ag (Anggota Seksi Konsumsi Jamaah)" },
        { id: "43", name: "Dian Anggreani Harun (Anggota Seksi Konsumsi Jamaah)" },
        { id: "44", name: "Hj. Suriyani Yahya, M.Pd (Koordinator Seksi Konsumsi Petugas)" },
        { id: "45", name: "Hj. Retni Tuna (Anggota Seksi Konsumsi Petugas)" },
        { id: "46", name: "Hj. Irma Adam, S.Pd (Anggota Seksi Konsumsi Petugas)" },
        { id: "47", name: "Drs. H. Abdulrahman Yusuf, M.Si. (Ketua Bidang D)" },
        { id: "48", name: "H. Rahman Lukman Abdul, S.Ag (Koordinator Seksi Bagasi)" },
        { id: "49", name: "Awaludin Mamonto (Anggota Seksi Bagasi)" },
        { id: "50", name: "Rivandy Mokoolang (Anggota Seksi Bagasi)" },
        { id: "51", name: "Abdul Latif Pakaya (Anggota Seksi Bagasi)" },
        { id: "52", name: "Awuliya N. Aneta (Anggota Seksi Bagasi)" },
        { id: "53", name: "Febriyanto Lidjali (Anggota Seksi Bagasi)" },
        { id: "54", name: "Muh. Zainudin Montoh (Anggota Seksi Bagasi)" },
        { id: "55", name: "Firdaus A. Pakuna (Anggota Seksi Bagasi)" },
        { id: "56", name: "Fahru Rozi (Anggota Seksi Bagasi)" },
        { id: "57", name: "Ridwan Karim Laiya (Koordinator Seksi Perlengkapan)" },
        { id: "58", name: "Roni Dja'far (Anggota Seksi Perlengkapan)" },
        { id: "59", name: "Jufrianto Yusuf (Anggota Seksi Perlengkapan)" },
        { id: "60", name: "Andi Alwan Massenurang (Anggota Seksi Perlengkapan)" },
        { id: "61", name: "Frangky Tabingo (Anggota Seksi Perlengkapan)" },
        { id: "62", name: "Sjamsudin Hatala (Anggota Seksi Perlengkapan)" },
        { id: "63", name: "Agus Mosii (Anggota Seksi Perlengkapan)" }
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
