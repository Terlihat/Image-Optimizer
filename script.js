/**
 * ==========================================
 * VERSION: v1.0.0
 * ENGINE & BUSINESS LOGIC FOR OPTIWEBP
 * ==========================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // Definisi Elemen DOM
    const themeSelect = document.getElementById('theme-select');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const processSection = document.getElementById('process-section');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityVal = document.getElementById('quality-val');
    const formatSelect = document.getElementById('format-select');
    
    const originalPreview = document.getElementById('original-preview');
    const optimizedPreview = document.getElementById('optimized-preview');
    const originalSize = document.getElementById('original-size');
    const optimizedSize = document.getElementById('optimized-size');
    const savePercentage = document.getElementById('save-percentage');
    const downloadBtn = document.getElementById('download-btn');

    let currentFile = null;
    let originalImageSrc = null;

    // --- LOGIK MANAJEMEN TEMA UI ---
    // Load tema tersimpan dari localStorage atau fallback ke default 'dark'
    const savedTheme = localStorage.getItem('optiwebp-theme') || 'dark';
    themeSelect.value = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeSelect.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('optiwebp-theme', selectedTheme);
    });

    // --- LOGIK EVENT HANDLER UPLOAD ---
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => dropZone.classList.remove('drag-over'));
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Proses awal file gambar yang diupload
    function handleFileSelection(file) {
        if (!file.type.startsWith('image/')) {
            alert('File yang dimasukkan harus berupa berkas gambar!');
            return;
        }
        currentFile = file;
        
        // Membaca ukuran file asli
        originalSize.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageSrc = e.target.result;
            originalPreview.src = originalImageSrc;
            
            // Tampilkan section proses kompresi
            processSection.classList.remove('hidden');
            
            // Jalankan proses optimalisasi utama
            optimizeImage();
        };
        reader.readAsDataURL(file);
    }

    // --- LOGIK PROSES OPTIMALISASI & KONVERSI ---
    qualitySlider.addEventListener('input', (e) => {
        qualityVal.textContent = e.target.value + '%';
        if (currentFile) optimizeImage();
    });

    formatSelect.addEventListener('change', () => {
        if (currentFile) optimizeImage();
    });

    function optimizeImage() {
        if (!originalImageSrc) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set dimensi canvas sesuai resolusi gambar asli
            canvas.width = img.width;
            canvas.height = img.height;
            
            // Gambar ulang aset ke dalam canvas
            ctx.drawImage(img, 0, 0, img.width, img.height);

            // Dapatkan nilai kualitas dan format dari interface UI
            const quality = parseFloat(qualitySlider.value) / 100;
            const targetFormat = formatSelect.value;

            // Proses konversi utama menggunakan Canvas API HTML5
            const optimizedDataUrl = canvas.toDataURL(targetFormat, quality);
            
            // Set output preview gambar hasil
            optimizedPreview.src = optimizedDataUrl;

            // Hitung kalkulasi ukuran setelah kompresi
            const stringLength = optimizedDataUrl.split(',')[1].length;
            const sizeInBytes = Math.round(stringLength * (3 / 4));
            
            optimizedSize.textContent = formatBytes(sizeInBytes);

            // Hitung rasio penyimpanan (%)
            const saving = ((currentFile.size - sizeInBytes) / currentFile.size) * 100;
            if (saving > 0) {
                savePercentage.textContent = `Hemat ${Math.round(saving)}%`;
                savePercentage.style.backgroundColor = '#22c55e'; // Hijau jika ukuran turun
            } else {
                savePercentage.textContent = `Naik ${Math.abs(Math.round(saving))}%`;
                savePercentage.style.backgroundColor = '#ef4444'; // Merah jika ukuran membengkak akibat format/kualitas tinggi
            }

            // Setup tombol unduh
            downloadBtn.href = optimizedDataUrl;
            
            // Generate ekstensi file yang dinamis
            const extension = targetFormat.split('/')[1];
            const originalName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
            downloadBtn.download = `${originalName}_optimized.${extension}`;
        };
        img.src = originalImageSrc;
    }

    // Fungsi utilitas format ukuran byte ke format yang mudah dibaca manusia
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});