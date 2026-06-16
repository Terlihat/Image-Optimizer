/**
 * ==========================================
 * VERSION: v1.2.0
 * ENGINE & BUSINESS LOGIC FOR OPTIWEBP (UPDATED WITH VISUAL SPLIT SLIDER)
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
    const resizeSelect = document.getElementById('resize-select');
    
    // Elemen Informasi Detail
    const originalSize = document.getElementById('original-size');
    const optimizedSize = document.getElementById('optimized-size');
    const originalRes = document.getElementById('original-res');
    const optimizedRes = document.getElementById('optimized-res');
    const savePercentage = document.getElementById('save-percentage');
    const downloadBtn = document.getElementById('download-btn');

    // Elemen Baru: Slider Perbandingan Visual
    const splitSlider = document.getElementById('split-slider');
    const resizeLayer = document.getElementById('slider-resize-layer');
    const sliderLine = document.getElementById('slider-line');
    const sliderOriginal = document.getElementById('slider-original');
    const sliderOptimized = document.getElementById('slider-optimized');
    const sliderWrapper = document.querySelector('.image-slider-wrapper');

    let currentFile = null;
    let originalImageSrc = null;

    // --- LOGIK MANAJEMEN TEMA UI ---
    const savedTheme = localStorage.getItem('optiwebp-theme') || 'dark';
    themeSelect.value = savedTheme;
    document.documentElement.setAttribute('data-theme', savedTheme);

    themeSelect.addEventListener('change', (e) => {
        const selectedTheme = e.target.value;
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('optiwebp-theme', selectedTheme);
    });

    // --- LOGIK INTERAKTIF SPLIT SLIDER ---
    splitSlider.addEventListener('input', (e) => {
        const sliderPos = e.target.value;
        // Sinkronisasi posisi garis pemisah dan lebar layer terpotong
        resizeLayer.style.width = `${sliderPos}%`;
        sliderLine.style.left = `${sliderPos}%`;
    });

    // Sinkronisasi ukuran gambar slider atas agar tidak terdistorsi saat di-resize
    function syncSliderImageWidth() {
        if (sliderWrapper) {
            const currentWrapperWidth = sliderWrapper.offsetWidth;
            sliderOptimized.style.width = `${currentWrapperWidth}px`;
        }
    }
    // Pantau perubahan ukuran layar agar sinkronisasi visual tetap presisi
    window.addEventListener('resize', syncSliderImageWidth);

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

    function handleFileSelection(file) {
        if (!file.type.startsWith('image/')) {
            alert('File yang dimasukkan harus berupa berkas gambar!');
            return;
        }
        currentFile = file;
        originalSize.textContent = formatBytes(file.size);

        const reader = new FileReader();
        reader.onload = (e) => {
            originalImageSrc = e.target.result;
            
            // Set gambar latar belakang pada komponen slider perbandingan
            sliderOriginal.src = originalImageSrc;
            
            const tempImg = new Image();
            tempImg.onload = () => {
                originalRes.textContent = `${tempImg.width} x ${tempImg.height} px`;
                processSection.classList.remove('hidden');
                
                // Set default posisi slider pembatas ke tengah (50%) tiap kali upload baru
                splitSlider.value = 50;
                resizeLayer.style.width = '50%';
                sliderLine.style.left = '50%';
                
                syncSliderImageWidth();
                optimizeImage();
            };
            tempImg.src = originalImageSrc;
        };
        reader.readAsDataURL(file);
    }

    // --- LOGIK PROSES OPTIMALISASI, RESIZER & SLIDER PREVIEW ---
    qualitySlider.addEventListener('input', (e) => {
        qualityVal.textContent = e.target.value + '%';
        if (currentFile) optimizeImage();
    });

    formatSelect.addEventListener('change', () => {
        if (currentFile) optimizeImage();
    });

    resizeSelect.addEventListener('change', () => {
        if (currentFile) optimizeImage();
    });

    function optimizeImage() {
        if (!originalImageSrc) return;

        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            const scale = parseFloat(resizeSelect.value);
            const targetWidth = Math.round(img.width * scale);
            const targetHeight = Math.round(img.height * scale);

            canvas.width = targetWidth;
            canvas.height = targetHeight;
            
            optimizedRes.textContent = `${targetWidth} x ${targetHeight} px`;
            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            const quality = parseFloat(qualitySlider.value) / 100;
            const targetFormat = formatSelect.value;

            // Dapatkan Data URL hasil optimasi
            const optimizedDataUrl = canvas.toDataURL(targetFormat, quality);
            
            // Masukkan gambar ter-optimasi ke sisi depan slider perbandingan visual
            sliderOptimized.src = optimizedDataUrl;

            // Hitung ukuran akhir file
            const stringLength = optimizedDataUrl.split(',')[1].length;
            const sizeInBytes = Math.round(stringLength * (3 / 4));
            optimizedSize.textContent = formatBytes(sizeInBytes);

            // Hitung rasio efisiensi penyimpanan (%)
            const saving = ((currentFile.size - sizeInBytes) / currentFile.size) * 100;
            if (saving > 0) {
                savePercentage.textContent = `Hemat ${Math.round(saving)}%`;
                savePercentage.style.backgroundColor = '#22c55e';
            } else {
                savePercentage.textContent = `Naik ${Math.abs(Math.round(saving))}%`;
                savePercentage.style.backgroundColor = '#ef4444';
            }

            // Atur tombol unduh
            downloadBtn.href = optimizedDataUrl;
            const extension = targetFormat.split('/')[1];
            const originalName = currentFile.name.substring(0, currentFile.name.lastIndexOf('.')) || currentFile.name;
            downloadBtn.download = `${originalName}_optimized.${extension}`;
        };
        img.src = originalImageSrc;
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
