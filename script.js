document.addEventListener('DOMContentLoaded', () => {
    // --- REFERENSI DOM UTAMA ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const processSection = document.getElementById('process-section');
    const qualitySlider = document.getElementById('quality-slider');
    const formatSelect = document.getElementById('format-select');
    const resizeModeSelect = document.getElementById('resize-mode-select');
    const resizeSelect = document.getElementById('resize-select');
    const customWidthInput = document.getElementById('custom-width-input');
    const modeSelect = document.getElementById('mode-select');
    const targetSizeInput = document.getElementById('target-size-input');

    // --- REFERENSI FITUR v1.7.0: RETOUCH & LOGO WATERMARK ---
    const filterBrightness = document.getElementById('filter-brightness');
    const filterContrast = document.getElementById('filter-contrast');
    const filterSaturation = document.getElementById('filter-saturation');
    
    const watermarkType = document.getElementById('watermark-type');
    const watermarkTextInput = document.getElementById('watermark-text');
    const watermarkLogoFile = document.getElementById('watermark-logo-file');
    const watermarkPosition = document.getElementById('watermark-position');
    const watermarkOpacity = document.getElementById('watermark-opacity');
    
    const wmTextContainer = document.getElementById('wm-text-input');
    const wmLogoContainer = document.getElementById('wm-logo-input');

    let watermarkLogoImageObj = null; // Menyimpan objek gambar logo
    let imageQueue = []; 
    let activeIndex = 0; 

    // --- EVENT LISTENERS UI v1.7.0 ---
    watermarkType.addEventListener('change', () => {
        wmTextContainer.classList.add('hidden');
        wmLogoContainer.classList.add('hidden');
        if (watermarkType.value === 'text') wmTextContainer.classList.remove('hidden');
        if (watermarkType.value === 'logo') wmLogoContainer.classList.remove('hidden');
        processAllImagesInQueue();
    });

    // Membaca file logo yang diunggah
    watermarkLogoFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    watermarkLogoImageObj = img;
                    processAllImagesInQueue();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            watermarkLogoImageObj = null;
        }
    });

    // Pemicu Re-render saat slider retouch diubah
    [filterBrightness, filterContrast, filterSaturation].forEach(slider => {
        slider.addEventListener('input', (e) => {
            document.getElementById(`val-${e.target.id.split('-')[1]}`).textContent = e.target.value + '%';
            processAllImagesInQueue();
        });
    });

    [qualitySlider, watermarkTextInput, watermarkPosition, watermarkOpacity, formatSelect, resizeSelect, customWidthInput, targetSizeInput].forEach(el => {
        el.addEventListener('input', processAllImagesInQueue);
        el.addEventListener('change', processAllImagesInQueue);
    });

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

    // --- ENGINE UPLOAD ---
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => e.preventDefault());
    dropZone.addEventListener('drop', (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); });
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    async function handleFiles(files) {
        const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (!validFiles.length) return;

        const promises = validFiles.map(file => new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => resolve({
                    id: Math.random().toString(36).substr(2, 9),
                    name: file.name, size: file.size, src: e.target.result,
                    origW: img.width, origH: img.height
                });
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }));

        imageQueue = await Promise.all(promises);
        document.getElementById('queue-count').textContent = imageQueue.length;
        processSection.classList.remove('hidden');
        processAllImagesInQueue();
    }

    // --- CANVAS RENDER ENGINE v1.7.0 (Filter & Logo Integration) ---
    function processAllImagesInQueue() {
        if (!imageQueue.length) return;
        let completed = 0;

        imageQueue.forEach((item, index) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 1. Kalkulasi Dimensi
                let tW, tH;
                if (resizeModeSelect.value === 'scale') {
                    const scale = parseFloat(resizeSelect.value);
                    tW = Math.round(item.origW * scale);
                    tH = Math.round(item.origH * scale);
                } else {
                    tW = parseInt(customWidthInput.value) || 1080;
                    tH = Math.round(tW * (item.origH / item.origW));
                }
                canvas.width = tW; canvas.height = tH;

                // 2. Terapkan Filter Retouch (Kecerahan, Kontras, Saturasi)
                ctx.filter = `brightness(${filterBrightness.value}%) contrast(${filterContrast.value}%) saturate(${filterSaturation.value}%)`;
                ctx.drawImage(img, 0, 0, tW, tH);
                ctx.filter = 'none'; // Reset filter agar tidak menempel pada watermark

                // 3. Render Watermark (Teks atau Logo)
                const wType = watermarkType.value;
                const pos = watermarkPosition.value;
                
                if (wType !== 'none') {
                    ctx.save();
                    ctx.globalAlpha = parseFloat(watermarkOpacity.value);
                    
                    let x = 20, y = 20;

                    if (wType === 'text' && watermarkTextInput.value.trim() !== '') {
                        const text = watermarkTextInput.value.trim();
                        const fSize = Math.max(14, Math.round(tW * 0.035));
                        ctx.font = `bold ${fSize}px sans-serif`;
                        ctx.fillStyle = 'white';
                        ctx.shadowColor = 'black'; ctx.shadowBlur = 4;
                        const tw = ctx.measureText(text).width;

                        if (pos === 'bottom-right') { x = tW - tw - 20; y = tH - 20; }
                        else if (pos === 'bottom-left') { x = 20; y = tH - 20; }
                        else if (pos === 'center') { x = (tW/2) - (tw/2); y = (tH/2) + (fSize/2); }
                        ctx.fillText(text, x, y);
                    } 
                    else if (wType === 'logo' && watermarkLogoImageObj) {
                        // Kalkulasi ukuran logo (15% dari lebar gambar asli)
                        const logoW = tW * 0.15;
                        const logoH = (watermarkLogoImageObj.height / watermarkLogoImageObj.width) * logoW;
                        
                        if (pos === 'bottom-right') { x = tW - logoW - 20; y = tH - logoH - 20; }
                        else if (pos === 'bottom-left') { x = 20; y = tH - logoH - 20; }
                        else if (pos === 'center') { x = (tW/2) - (logoW/2); y = (tH/2) - (logoH/2); }
                        
                        ctx.drawImage(watermarkLogoImageObj, x, y, logoW, logoH);
                    }
                    ctx.restore();
                }

                // 4. Proses Output Final
                let fmt = formatSelect.value === 'auto' ? 'image/webp' : formatSelect.value;
                let qlt = parseFloat(qualitySlider.value) / 100;
                let dataUrl = canvas.toDataURL(fmt, qlt);
                
                item.optimizedDataUrl = dataUrl;
                item.optimizedSize = Math.round(dataUrl.length * 0.75);
                item.optW = tW; item.optH = tH;
                item.saving = ((item.size - item.optimizedSize) / item.size) * 100;

                completed++;
                if (completed === imageQueue.length) {
                    renderQueue();
                    updatePreview();
                }
            };
            img.src = item.src;
        });
    }

    // --- RENDER DOM ---
    function renderQueue() {
        const tbody = document.getElementById('queue-tbody');
        tbody.innerHTML = '';
        imageQueue.forEach((item, i) => {
            const tr = document.createElement('tr');
            if (i === activeIndex) tr.style.backgroundColor = 'var(--bg-table-hover)';
            tr.innerHTML = `
                <td>${item.name}</td>
                <td>${(item.size/1024).toFixed(1)} KB</td>
                <td><strong>${(item.optimizedSize/1024).toFixed(1)} KB</strong></td>
                <td><span style="color:${item.saving>0?'#22c55e':'#ef4444'}; font-weight:bold">${item.saving.toFixed(1)}%</span></td>
                <td><a href="${item.optimizedDataUrl}" download="v1.7_${item.name}">Unduh</a></td>
            `;
            tr.onclick = () => { activeIndex = i; renderQueue(); updatePreview(); };
            tbody.appendChild(tr);
        });
    }

    function updatePreview() {
        if (!imageQueue[activeIndex]) return;
        const item = imageQueue[activeIndex];
        document.getElementById('active-file-title').textContent = item.name;
        document.getElementById('slider-original').src = item.src;
        document.getElementById('slider-optimized').src = item.optimizedDataUrl;
        document.getElementById('optimized-size').textContent = (item.optimizedSize/1024).toFixed(1) + ' KB';
        document.getElementById('optimized-res').textContent = `${item.optW} x ${item.optH} px`;
        document.getElementById('save-percentage').textContent = item.saving.toFixed(1) + '%';
        document.getElementById('download-btn').href = item.optimizedDataUrl;
    }

    // Split Slider Logic
    document.getElementById('split-slider').addEventListener('input', (e) => {
        document.getElementById('slider-resize-layer').style.width = e.target.value + '%';
        document.getElementById('slider-line').style.left = e.target.value + '%';
    });

    document.getElementById('download-all-btn').addEventListener('click', () => {
        imageQueue.forEach((item, idx) => {
            setTimeout(() => {
                const a = document.createElement('a');
                a.href = item.optimizedDataUrl;
                a.download = `OptiWebP_${item.name}`;
                a.click();
            }, idx * 300);
        });
    });
});