/**
 * ==========================================================================
 * OPTIWEBP CORE ENGINE v1.8.0 PRODUCTION BUILD (STABLE & OPTIMIZED)
 * FEATURES: HIGH-SPEED IMAGE CACHING LAYER, GEOMETRY TRANSFORM, BULK RENAMER
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- AKUISISI ELEMEN DOM ---
    const themeSelect = document.getElementById('theme-select');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const processSection = document.getElementById('process-section');
    const qualitySlider = document.getElementById('quality-slider');
    const qualityVal = document.getElementById('quality-val');
    const formatSelect = document.getElementById('format-select');
    const modeSelect = document.getElementById('mode-select');
    
    const resizeModeSelect = document.getElementById('resize-mode-select');
    const resizeSelect = document.getElementById('resize-select');
    const customWidthInput = document.getElementById('custom-width-input');
    const targetSizeInput = document.getElementById('target-size-input');

    // Referensi Fitur v1.8.0 (Renamer & Geometri)
    const filePrefix = document.getElementById('file-prefix');
    const fileSuffix = document.getElementById('file-suffix');
    const geoRotate = document.getElementById('geo-rotate');
    const geoFlip = document.getElementById('geo-flip');

    // Referensi Pro Retouch
    const filterBrightness = document.getElementById('filter-brightness');
    const filterContrast = document.getElementById('filter-contrast');
    const filterSaturation = document.getElementById('filter-saturation');

    // Referensi Watermark Suite
    const watermarkType = document.getElementById('watermark-type');
    const watermarkTextInput = document.getElementById('watermark-text');
    const watermarkLogoFile = document.getElementById('watermark-logo-file');
    const watermarkPosition = document.getElementById('watermark-position');
    const watermarkOpacity = document.getElementById('watermark-opacity');

    // Informasi Preview UI
    const activeFileTitle = document.getElementById('active-file-title');
    const optimizedSize = document.getElementById('optimized-size');
    const optimizedRes = document.getElementById('optimized-res');
    const savePercentage = document.getElementById('save-percentage');
    const downloadBtn = document.getElementById('download-btn');
    const downloadAllBtn = document.getElementById('download-all-btn');

    // --- VARIABEL KONTROL DATA MUTABEL (APP STATE) ---
    let imageQueue = []; // Menyimpan preloaded Image Objects untuk mencegah memory leak
    let activeIndex = 0; 
    let loadedLogoImageObj = null;

    // --- MANAJEMEN REKAYASA MULTI-TEMA ---
    const activeTheme = localStorage.getItem('optiwebp-theme') || 'dark';
    themeSelect.value = activeTheme;
    document.documentElement.setAttribute('data-theme', activeTheme);
    
    themeSelect.addEventListener('change', (e) => {
        document.documentElement.setAttribute('data-theme', e.target.value);
        localStorage.setItem('optiwebp-theme', e.target.value);
    });

    // --- AMBANG DETEKSI VISUAL WATERMARK LAYOUTS ---
    watermarkType.addEventListener('change', () => {
        document.getElementById('wm-text-input').classList.add('hidden');
        document.getElementById('wm-logo-input').classList.add('hidden');
        if (watermarkType.value === 'text') document.getElementById('wm-text-input').classList.remove('hidden');
        if (watermarkType.value === 'logo') document.getElementById('wm-logo-input').classList.remove('hidden');
        processAllImagesInQueue();
    });

    watermarkLogoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    loadedLogoImageObj = img;
                    processAllImagesInQueue();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            loadedLogoImageObj = null;
        }
    });

    // --- PIPELINE EVENT INPUT OPTIMASI INSTAN ---
    resizeModeSelect.addEventListener('change', () => {
        document.getElementById('resize-scale-container').classList.toggle('hidden');
        document.getElementById('resize-custom-container').classList.toggle('hidden');
        processAllImagesInQueue();
    });

    modeSelect.addEventListener('change', () => {
        document.getElementById('manual-quality-container').classList.toggle('hidden');
        document.getElementById('target-size-container').classList.toggle('hidden');
        processAllImagesInQueue();
    });

    // Pemicu Re-Draw Instan Berkinerja Tinggi dari Cache Sisi Klien
    [filterBrightness, filterContrast, filterSaturation].forEach(slider => {
        slider.addEventListener('input', (e) => {
            document.getElementById(`val-${e.target.id.split('-')[1]}`).textContent = e.target.value + '%';
            processAllImagesInQueue();
        });
    });

    [qualitySlider, watermarkTextInput, watermarkPosition, watermarkOpacity, formatSelect, 
     resizeSelect, customWidthInput, targetSizeInput, filePrefix, fileSuffix, geoRotate, geoFlip].forEach(element => {
        element.addEventListener('input', processAllImagesInQueue);
        element.addEventListener('change', processAllImagesInQueue);
    });

    // --- ALUR INPUT MEDIA DRAG & DROP ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    async function handleFiles(files) {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!validFiles.length) return;

        // PERBAIKAN BUG UTAMA: Load gambar masuk ke RAM satu kali saja (Caching Engine)
        const loadPromises = validFiles.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Deteksi Transparansi Canvas
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = Math.min(img.width, 40);
                    tempCanvas.height = Math.min(img.height, 40);
                    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
                    const pixelData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height).data;
                    let isTrans = false;
                    for (let i = 3; i < pixelData.length; i += 4) {
                        if (pixelData[i] < 250) { isTrans = true; break; }
                    }

                    resolve({
                        name: file.name,
                        size: file.size,
                        imgObject: img, // Menyimpan referensi DOM Image mentah
                        isTransparant: isTrans,
                        baseName: file.name.substring(0, file.name.lastIndexOf('.')) || file.name
                    });
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }));

        imageQueue = await Promise.all(loadPromises);
        document.getElementById('queue-count').textContent = imageQueue.length;
        processSection.classList.remove('hidden');
        activeIndex = 0;
        processAllImagesInQueue();
        updateDashboardAnalytics();
    }

    // --- ULTRA SPEED CANVAS PIPELINE ENGINE v1.8.0 ---
    function processAllImagesInQueue() {
        if (!imageQueue.length) return;

        imageQueue.forEach((item, index) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const sourceImg = item.imgObject;

            // 1. Hitung Dimensi Dasar Pengubahan Ukuran
            let tW, tH;
            if (resizeModeSelect.value === 'scale') {
                const scale = parseFloat(resizeSelect.value);
                tW = Math.round(sourceImg.width * scale);
                tH = Math.round(sourceImg.height * scale);
            } else {
                tW = parseInt(customWidthInput.value) || 1080;
                tH = Math.round(tW * (sourceImg.height / sourceImg.width));
            }

            // 2. FITUR BARU v1.8.0: Transformasi Geometri Koordinat Matriks Canvas
            const rotDegree = parseInt(geoRotate.value);
            const isFlipped = geoFlip.checked;

            if (rotDegree === 90 || rotDegree === 270) {
                canvas.width = tH; canvas.height = tW;
            } else {
                canvas.width = tW; canvas.height = tH;
            }

            // Atur Titik Sumbu Tengah Canvas untuk Rotasi & Pencerminan
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate((rotDegree * Math.PI) / 180);
            if (isFlipped) ctx.scale(-1, 1);

            // 3. Terapkan Filter Render CSS Retouching
            ctx.filter = `brightness(${filterBrightness.value}%) contrast(${filterContrast.value}%) saturate(${filterSaturation.value}%)`;
            
            // Gambar Aset Utama dari Memori Cache RAM
            ctx.drawImage(sourceImg, -tW / 2, -tH / 2, tW, tH);
            ctx.filter = 'none'; // Amankan layer filter untuk elemen teks/logo berikutnya
            ctx.setTransform(1, 0, 0, 1, 0, 0); // Kembalikan koordinat matriks asli

            // 4. Render Studio Watermark Layer
            const wType = watermarkType.value;
            const pos = watermarkPosition.value;

            if (wType !== 'none') {
                ctx.save();
                ctx.globalAlpha = parseFloat(watermarkOpacity.value);
                let wx = 20, wy = 20;

                if (wType === 'text' && watermarkTextInput.value.trim() !== '') {
                    const txt = watermarkTextInput.value.trim();
                    const fontSize = Math.max(14, Math.round(canvas.width * 0.035));
                    ctx.font = `bold ${fontSize}px sans-serif`;
                    ctx.fillStyle = '#ffffff';
                    ctx.shadowColor = '#000000'; ctx.shadowBlur = 4;
                    const tw = ctx.measureText(txt).width;

                    if (pos === 'bottom-right') { wx = canvas.width - tw - 20; wy = canvas.height - 20; }
                    else if (pos === 'bottom-left') { wx = 20; wy = canvas.height - 20; }
                    else if (pos === 'top-right') { wx = canvas.width - tw - 20; wy = fontSize + 20; }
                    else if (pos === 'center') { wx = (canvas.width / 2) - (tw / 2); wy = (canvas.height / 2) + (fontSize / 2); }
                    ctx.fillText(txt, wx, wy);
                } 
                else if (wType === 'logo' && loadedLogoImageObj) {
                    const lW = canvas.width * 0.16;
                    const lH = (loadedLogoImageObj.height / loadedLogoImageObj.width) * lW;

                    if (pos === 'bottom-right') { wx = canvas.width - lW - 20; wy = canvas.height - lH - 20; }
                    else if (pos === 'bottom-left') { wx = 20; wy = canvas.height - lH - 20; }
                    else if (pos === 'top-right') { wx = canvas.width - lW - 20; wy = 20; }
                    else if (pos === 'center') { wx = (canvas.width / 2) - (lW / 2); wy = (canvas.height / 2) - (lH / 2); }
                    ctx.drawImage(loadedLogoImageObj, wx, wy, lW, lH);
                }
                ctx.restore();
            }

            // 5. Penentuan Format & Skema Penguncian Target Ukuran Berkas
            let targetFmt = formatSelect.value === 'auto' ? (item.isTransparant ? 'image/webp' : 'image/jpeg') : formatSelect.value;
            let finalQ = parseFloat(qualitySlider.value) / 100;

            if (modeSelect.value === 'target' && targetFmt !== 'image/png') {
                const maxBytes = (parseFloat(targetSizeInput.value) || 200) * 1024;
                let minQ = 0.02, maxQ = 1.0, bestQ = 0.6;
                for (let i = 0; i < 6; i++) {
                    let midQ = (minQ + maxQ) / 2;
                    let testUrl = canvas.toDataURL(targetFmt, midQ);
                    if (Math.round(testUrl.length * 0.75) <= maxBytes) { bestQ = midQ; minQ = midQ; } else { maxQ = midQ; }
                }
                finalQ = bestQ;
                if (index === activeIndex) qualityVal.textContent = Math.round(finalQ * 100) + '% (Otomatis)';
            } else if (modeSelect.value === 'manual') {
                qualityVal.textContent = qualitySlider.value + '%';
            }

            const finalDataUrl = canvas.toDataURL(targetFmt, finalQ);
            
            // 6. FITUR BARU v1.8.0: Rekayasa Pola Nama Berkas Kustom
            const prefix = filePrefix.value.trim();
            const suffix = fileSuffix.value.trim();
            const extension = targetFmt.split('/')[1];
            item.compiledOutputName = `${prefix}${item.baseName}${suffix}.${extension}`;

            // Simpan State Hasil Render Kedalam Objek Antrean
            item.optimizedDataUrl = finalDataUrl;
            item.optimizedSize = Math.round(finalDataUrl.length * 0.75);
            item.finalW = canvas.width;
            item.finalH = canvas.height;
            item.savingPercentage = ((item.size - item.optimizedSize) / item.size) * 100;
        });

        renderQueueTable();
        updateLivePreviewSection();
    }

    // --- REFLEKSI COMPONENT DATA DOM ---
    function renderQueueTable() {
        const tbody = document.getElementById('queue-tbody');
        tbody.innerHTML = '';

        imageQueue.forEach((item, i) => {
            const tr = document.createElement('tr');
            if (i === activeIndex) tr.style.backgroundColor = 'var(--bg-table-hover)';

            tr.innerHTML = `
                <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${item.compiledOutputName}</td>
                <td>${(item.size / 1024).toFixed(1)} KB</td>
                <td><strong>${(item.optimizedSize / 1024).toFixed(1)} KB</strong></td>
                <td><span style="color:${item.savingPercentage > 0 ? '#10b981' : '#ef4444'}; font-weight:700">${item.savingPercentage.toFixed(1)}%</span></td>
                <td><a href="${item.optimizedDataUrl}" download="${item.compiledOutputName}" style="color:var(--primary); font-weight:600; text-decoration:none;">💾 Unduh</a></td>
            `;
            tr.onclick = (e) => {
                if (e.target.tagName === 'A') return;
                activeIndex = i;
                renderQueueTable();
                updateLivePreviewSection();
            };
            tbody.appendChild(tr);
        });
    }

    function updateLivePreviewSection() {
        if (!imageQueue[activeIndex]) return;
        const currentItem = imageQueue[activeIndex];

        activeFileTitle.textContent = currentItem.compiledOutputName;
        document.getElementById('slider-original').src = currentItem.imgObject.src;
        document.getElementById('slider-optimized').src = currentItem.optimizedDataUrl;

        optimizedSize.textContent = (currentItem.optimizedSize / 1024).toFixed(1) + ' KB';
        optimizedRes.textContent = `${currentItem.finalW} x ${currentItem.finalH} px`;
        savePercentage.textContent = currentItem.savingPercentage.toFixed(1) + '%';
        
        downloadBtn.href = currentItem.optimizedDataUrl;
        downloadBtn.download = currentItem.compiledOutputName;

        // Atur Keselarasan Komparator Layer Geser
        document.getElementById('slider-optimized').style.width = document.querySelector('.image-slider-wrapper').offsetWidth + 'px';
    }

    function updateDashboardAnalytics() {
        let totalFiles = imageQueue.length;
        let totalSavedBytes = 0;
        let totalEfficiencySum = 0;

        imageQueue.forEach(item => {
            totalSavedBytes += Math.max(0, item.size - item.optimizedSize);
            totalEfficiencySum += item.savingPercentage;
        });

        document.getElementById('stat-total-files').textContent = totalFiles;
        document.getElementById('stat-total-saved').textContent = (totalSavedBytes / 1024).toFixed(1) + ' KB';
        document.getElementById('stat-avg-efficiency').textContent = totalFiles > 0 ? Math.round(totalEfficiencySum / totalFiles) + '%' : '0%';
    }

    // PERBAIKAN BUG: Skema Amankan Unduhan Massal Berjeda demi Menghindari Blokir Browser Popup
    downloadAllBtn.addEventListener('click', () => {
        if (!imageQueue.length) return;
        imageQueue.forEach((item, index) => {
            setTimeout(() => {
                const triggerLink = document.createElement('a');
                triggerLink.href = item.optimizedDataUrl;
                triggerLink.download = item.compiledOutputName;
                document.body.appendChild(triggerLink);
                triggerLink.click();
                document.body.removeChild(triggerLink);
            }, index * 250); // Jeda konstan aman 250ms per berkas
        });
    });

    // Sinkronisasi Slider Pembanding Kontrol Visual
    document.getElementById('split-slider').addEventListener('input', (e) => {
        document.getElementById('slider-resize-layer').style.width = e.target.value + '%';
        document.getElementById('slider-line').style.left = e.target.value + '%';
    });
});