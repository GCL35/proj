/**
 * RMBG AI & Product Mockup Studio
 * Frontend Application Script
 */

document.addEventListener('DOMContentLoaded', () => {
    // ========================================================
    // TAB NAVIGATION
    // ========================================================
    const navTabBtns = document.querySelectorAll('.nav-tab-btn');
    const tabViews = document.querySelectorAll('.tab-content-view');

    navTabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navTabBtns.forEach(b => b.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.dataset.tab;
            const targetView = document.getElementById(targetId);
            if (targetView) targetView.classList.add('active');
        });
    });

    // ========================================================
    // MOCKUP STUDIO LOGIC (3 STEPS ONLY)
    // ========================================================
    const mockupResultImg = document.getElementById('mockupResultImg');
    const mockupPlaceholder = document.getElementById('mockupPlaceholder');
    const mockupLoadingOverlay = document.getElementById('mockupLoadingOverlay');
    const mkLoadingTitle = document.getElementById('mkLoadingTitle');

    const mockupProductInput = document.getElementById('mockupProductInput');
    const mockupArtworkInput = document.getElementById('mockupArtworkInput');
    const productDropzone = document.getElementById('productDropzone');
    const artworkDropzone = document.getElementById('artworkDropzone');
    const productFileName = document.getElementById('productFileName');
    const artworkFileName = document.getElementById('artworkFileName');

    const mkScale = document.getElementById('mkScale');
    const mkScaleVal = document.getElementById('mkScaleVal');
    const btnAiScanAndScreen = document.getElementById('btnAiScanAndScreen');
    const aiScanHint = document.getElementById('aiScanHint');

    const mkDownloadBtn = document.getElementById('mkDownloadBtn');
    const mkCopyBtn = document.getElementById('mkCopyBtn');
    const mkProductInfo = document.getElementById('mkProductInfo');
    const mkDesignInfo = document.getElementById('mkDesignInfo');
    const mkCanvasDimensions = document.getElementById('mkCanvasDimensions');

    let productFile = null;
    let artworkFile = null;
    let lastResultBlob = null;

    function checkReady() {
        if (productFile && artworkFile) {
            btnAiScanAndScreen.disabled = false;
            aiScanHint.innerHTML = '<i class="fa-solid fa-circle-check" style="color: #10b981;"></i> พร้อมแล้ว! กดปุ่มเพื่อสแกนขอบและสกรีนลาย';
        } else if (productFile) {
            btnAiScanAndScreen.disabled = true;
            aiScanHint.innerHTML = '<i class="fa-solid fa-arrow-down" style="color: #f59e0b;"></i> อัปโหลดรูปลายที่จะสกรีนเพิ่มอีก 1 รูป';
        } else {
            btnAiScanAndScreen.disabled = true;
            aiScanHint.innerHTML = '<i class="fa-solid fa-info-circle"></i> กรุณาอัปโหลดรูปจาน/แก้ว และรูปลายเพื่อสแกน';
        }
    }

    function previewProductFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
            mockupPlaceholder.style.display = 'none';
            mockupResultImg.style.display = 'block';
            mockupResultImg.src = re.target.result;
            const temp = new Image();
            temp.onload = () => {
                mkCanvasDimensions.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${temp.naturalWidth} x ${temp.naturalHeight} px`;
            };
            temp.src = re.target.result;
        };
        reader.readAsDataURL(file);
    }

    mockupProductInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            productFile = e.target.files[0];
            productFileName.textContent = productFile.name;
            mkProductInfo.innerHTML = `<i class="fa-solid fa-tag"></i> สินค้า: ${productFile.name}`;
            previewProductFile(productFile);
            checkReady();
        }
    });

    mockupArtworkInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            artworkFile = e.target.files[0];
            artworkFileName.textContent = artworkFile.name;
            mkDesignInfo.innerHTML = `<i class="fa-solid fa-palette"></i> ลาย: ${artworkFile.name}`;
            checkReady();
        }
    });

    mkScale.addEventListener('input', (e) => {
        mkScaleVal.textContent = `${e.target.value}%`;
    });

    // Core Action: Scan & Screen with strict boundary clipping
    btnAiScanAndScreen.addEventListener('click', async () => {
        if (!productFile || !artworkFile) {
            showToast('กรุณาเลือกทั้งรูปสินค้าและรูปลาย', 'error');
            return;
        }

        mockupLoadingOverlay.style.display = 'flex';
        mkLoadingTitle.textContent = 'AI (RMBG) กำลังสแกนขอบวัตถุและตัดส่วนเกิน...';

        const formData = new FormData();
        formData.append('product', productFile);
        formData.append('artwork', artworkFile);
        formData.append('scale', mkScale.value);

        try {
            const res = await fetch('/api/scan-and-screen', {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                throw new Error(errJson.error || `Server responded with ${res.status}`);
            }

            const blob = await res.blob();
            lastResultBlob = blob;
            const resultUrl = URL.createObjectURL(blob);

            mockupPlaceholder.style.display = 'none';
            mockupResultImg.style.display = 'block';
            mockupResultImg.src = resultUrl;

            // Read image dimensions
            const temp = new Image();
            temp.onload = () => {
                mkCanvasDimensions.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${temp.naturalWidth} x ${temp.naturalHeight} px`;
            };
            temp.src = resultUrl;

            mkDownloadBtn.disabled = false;
            mkCopyBtn.disabled = false;

            showToast('สกรีนลายลงบนวัตถุสำเร็จ! ลายไม่ล้นเกินขอบจาน/แก้วแน่นอน', 'success');

        } catch (error) {
            console.error('Scan & Screen Error:', error);
            showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
        } finally {
            mockupLoadingOverlay.style.display = 'none';
        }
    });

    // Download Button
    mkDownloadBtn.addEventListener('click', () => {
        if (!lastResultBlob) return;
        const url = URL.createObjectURL(lastResultBlob);
        const a = document.createElement('a');
        const prodName = productFile ? productFile.name.replace(/\.[^/.]+$/, "") : "product";
        a.href = url;
        a.download = `${prodName}_screened_noborder.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('กำลังดาวน์โหลดภาพความละเอียดเต็ม...', 'success');
    });

    // Copy to Clipboard
    mkCopyBtn.addEventListener('click', async () => {
        if (!lastResultBlob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': lastResultBlob })
            ]);
            showToast('คัดลอกรูปภาพไปยังคลิปบอร์ดแล้ว!', 'success');
        } catch (err) {
            console.error(err);
            showToast('เบราว์เซอร์ไม่รองรับ กรุณาใช้ปุ่มดาวน์โหลดแทน', 'error');
        }
    });

    // Drag and Drop for Upload Boxes
    [productDropzone, artworkDropzone].forEach(dropzone => {
        ['dragenter', 'dragover'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.add('dragover');
            });
        });

        ['dragleave', 'drop'].forEach(name => {
            dropzone.addEventListener(name, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzone.classList.remove('dragover');
            });
        });
    });

    productDropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            mockupProductInput.files = files;
            mockupProductInput.dispatchEvent(new Event('change'));
        }
    });

    artworkDropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            mockupArtworkInput.files = files;
            mockupArtworkInput.dispatchEvent(new Event('change'));
        }
    });

    // Clipboard Paste into Mockup Tab
    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                const activeTab = document.querySelector('.nav-tab-btn.active').dataset.tab;
                if (activeTab === 'tab-mockup') {
                    if (!productFile) {
                        productFile = blob;
                        productFileName.textContent = 'รูปสินค้าจากคลิปบอร์ด';
                        mkProductInfo.innerHTML = `<i class="fa-solid fa-tag"></i> สินค้า: รูปจากคลิปบอร์ด`;
                        previewProductFile(productFile);
                        checkReady();
                        showToast('วางรูปสินค้าจากคลิปบอร์ดแล้ว', 'success');
                    } else {
                        artworkFile = blob;
                        artworkFileName.textContent = 'รูปลายจากคลิปบอร์ด';
                        mkDesignInfo.innerHTML = `<i class="fa-solid fa-palette"></i> ลาย: รูปจากคลิปบอร์ด`;
                        checkReady();
                        showToast('วางรูปลายจากคลิปบอร์ดแล้ว', 'success');
                    }
                } else {
                    handleRmbgFileSelect(blob);
                    showToast('วางรูปภาพจากคลิปบอร์ดเรียบร้อยแล้ว', 'success');
                }
                break;
            }
        }
    });


    // ========================================================
    // TAB 2: RMBG BACKGROUND REMOVER LOGIC
    // ========================================================
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const resultContainer = document.getElementById('resultContainer');
    const processBtn = document.getElementById('processBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const copyBtn = document.getElementById('copyBtn');

    const originalImg = document.getElementById('originalImg');
    const resultImg = document.getElementById('resultImg');
    const sideOriginalImg = document.getElementById('sideOriginalImg');
    const sideResultImg = document.getElementById('sideResultImg');

    const splitSliderWrapper = document.getElementById('splitSliderWrapper');
    const sideBySideWrapper = document.getElementById('sideBySideWrapper');
    const splitViewBtn = document.getElementById('splitViewBtn');
    const sideBySideBtn = document.getElementById('sideBySideBtn');

    const compareSlider = document.getElementById('compareSlider');
    const originalLayer = document.getElementById('originalLayer');
    const sliderDivider = document.getElementById('sliderDivider');
    const loadingOverlay = document.getElementById('loadingOverlay');

    const modelSelect = document.getElementById('modelSelect');
    const modelHint = document.getElementById('modelHint');
    const alphaMattingToggle = document.getElementById('alphaMattingToggle');

    const modeBtns = document.querySelectorAll('.mode-btn');
    const colorPickerBox = document.getElementById('colorPickerBox');
    const shapeOptionsBox = document.getElementById('shapeOptionsBox');
    const bgImageBox = document.getElementById('bgImageBox');
    const bgImageInput = document.getElementById('bgImageInput');
    const customColorInput = document.getElementById('customColorInput');
    const colorChips = document.querySelectorAll('.color-chip');

    const shapeColorChips = document.querySelectorAll('.shape-color-chip');
    const shapeCustomColor = document.getElementById('shapeCustomColor');
    const shapeScale = document.getElementById('shapeScale');
    const shapeScaleVal = document.getElementById('shapeScaleVal');
    const shapeOffsetY = document.getElementById('shapeOffsetY');
    const shapeOffsetYVal = document.getElementById('shapeOffsetYVal');

    const shadowToggle = document.getElementById('shadowToggle');
    const shadowControlsWrapper = document.getElementById('shadowControlsWrapper');
    const shadowTypeSelect = document.getElementById('shadowTypeSelect');
    const shadowOpacity = document.getElementById('shadowOpacity');
    const shadowOpacityVal = document.getElementById('shadowOpacityVal');
    const shadowBlur = document.getElementById('shadowBlur');
    const shadowBlurVal = document.getElementById('shadowBlurVal');
    const shadowOffsetY = document.getElementById('shadowOffsetY');
    const shadowOffsetYVal = document.getElementById('shadowOffsetYVal');
    const redCirclePresetBtn = document.getElementById('redCirclePresetBtn');

    const fileInfo = document.getElementById('fileInfo');
    const dimensionInfo = document.getElementById('dimensionInfo');
    const processTimeInfo = document.getElementById('processTimeInfo');
    const historyGrid = document.getElementById('historyGrid');

    const compCanvas = document.createElement('canvas');
    const compCtx = compCanvas.getContext('2d');

    let currentFile = null;
    let rawCutoutImg = new Image();
    let customBgImage = null;
    let currentProcessedBlob = null;
    let currentBgMode = 'transparent';
    let currentBgColor = '#ffffff';
    let currentShapeColor = '#e11d48';

    const MODEL_HINTS = {
        'bria-rmbg': 'โมเดล RMBG ตัดขอบคมชัด เหมาะสำหรับคน สินค้า และวัตถุทั่วไป (แนะนำ)',
        'u2net': 'โมเดล U2Net อเนกประสงค์ ตัดวัตถุได้แม่นยำรอบด้าน',
        'isnet-general-use': 'โมเดล IS-Net เก็บรายละเอียดเส้นขอบคมชัดสูง',
        'silueta': 'โมเดล Silueta ขนาดกะทัดรัด ประมวลผลได้รวดเร็วที่สุด'
    };

    modelSelect.addEventListener('change', () => {
        modelHint.textContent = MODEL_HINTS[modelSelect.value] || '';
    });

    modeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentBgMode = btn.dataset.mode;

            colorPickerBox.style.display = (currentBgMode === 'color') ? 'block' : 'none';
            shapeOptionsBox.style.display = (currentBgMode === 'shape') ? 'block' : 'none';
            bgImageBox.style.display = (currentBgMode === 'image') ? 'block' : 'none';

            renderRmbgComposite();
        });
    });

    colorChips.forEach(chip => {
        chip.addEventListener('click', () => {
            colorChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentBgColor = chip.dataset.color;
            customColorInput.value = currentBgColor;
            renderRmbgComposite();
        });
    });

    customColorInput.addEventListener('input', (e) => {
        currentBgColor = e.target.value;
        colorChips.forEach(c => c.classList.remove('active'));
        renderRmbgComposite();
    });

    shapeColorChips.forEach(chip => {
        chip.addEventListener('click', () => {
            shapeColorChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentShapeColor = chip.dataset.color;
            shapeCustomColor.value = currentShapeColor;
            renderRmbgComposite();
        });
    });

    shapeCustomColor.addEventListener('input', (e) => {
        currentShapeColor = e.target.value;
        shapeColorChips.forEach(c => c.classList.remove('active'));
        renderRmbgComposite();
    });

    shapeScale.addEventListener('input', (e) => {
        shapeScaleVal.textContent = `${e.target.value}%`;
        renderRmbgComposite();
    });

    shapeOffsetY.addEventListener('input', (e) => {
        shapeOffsetYVal.textContent = `${e.target.value}px`;
        renderRmbgComposite();
    });

    shadowToggle.addEventListener('change', () => {
        shadowControlsWrapper.style.opacity = shadowToggle.checked ? '1' : '0.4';
        shadowControlsWrapper.style.pointerEvents = shadowToggle.checked ? 'auto' : 'none';
        renderRmbgComposite();
    });

    shadowTypeSelect.addEventListener('change', renderRmbgComposite);

    shadowOpacity.addEventListener('input', (e) => {
        shadowOpacityVal.textContent = `${e.target.value}%`;
        renderRmbgComposite();
    });

    shadowBlur.addEventListener('input', (e) => {
        shadowBlurVal.textContent = `${e.target.value}px`;
        renderRmbgComposite();
    });

    shadowOffsetY.addEventListener('input', (e) => {
        shadowOffsetYVal.textContent = `${e.target.value}px`;
        renderRmbgComposite();
    });

    redCirclePresetBtn.addEventListener('click', () => {
        modeBtns.forEach(b => b.classList.remove('active'));
        const shapeBtn = document.querySelector('.mode-btn[data-mode="shape"]');
        if (shapeBtn) shapeBtn.classList.add('active');
        currentBgMode = 'shape';

        colorPickerBox.style.display = 'none';
        shapeOptionsBox.style.display = 'block';
        bgImageBox.style.display = 'none';

        currentShapeColor = '#e11d48';
        shapeCustomColor.value = currentShapeColor;
        shapeColorChips.forEach(c => {
            c.classList.toggle('active', c.dataset.color === '#e11d48');
        });
        shapeScale.value = 85;
        shapeScaleVal.textContent = '85%';
        shapeOffsetY.value = 0;
        shapeOffsetYVal.textContent = '0px';

        shadowToggle.checked = true;
        shadowControlsWrapper.style.opacity = '1';
        shadowControlsWrapper.style.pointerEvents = 'auto';
        shadowTypeSelect.value = 'floor';
        shadowOpacity.value = 60;
        shadowOpacityVal.textContent = '60%';
        shadowBlur.value = 25;
        shadowBlurVal.textContent = '25px';
        shadowOffsetY.value = 16;
        shadowOffsetYVal.textContent = '16px';

        renderRmbgComposite();
        showToast('ใส่รูปในวงกลมสีแดงพร้อมเงาสมจริงแล้ว!', 'success');
    });

    bgImageInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const img = new Image();
                img.onload = () => {
                    customBgImage = img;
                    renderRmbgComposite();
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    });

    // RMBG Drag & Drop
    ['dragenter', 'dragover'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.add('dragover');
        });
    });

    ['dragleave', 'drop'].forEach(name => {
        dropzone.addEventListener(name, (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropzone.classList.remove('dragover');
        });
    });

    dropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) handleRmbgFileSelect(files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleRmbgFileSelect(e.target.files[0]);
    });

    window.addEventListener('paste', (e) => {
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (let item of items) {
            if (item.type.indexOf('image') !== -1) {
                const blob = item.getAsFile();
                // If in Mockup Studio tab, set as artwork
                const activeTab = document.querySelector('.nav-tab-btn.active').dataset.tab;
                if (activeTab === 'tab-mockup') {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        artworkImg.src = ev.target.result;
                        artworkFileName.textContent = 'รูปจากคลิปบอร์ด';
                        showToast('วางรูปลายจากคลิปบอร์ดเรียบร้อยแล้ว!', 'success');
                    };
                    reader.readAsDataURL(blob);
                } else {
                    handleRmbgFileSelect(blob);
                    showToast('วางรูปภาพจากคลิปบอร์ดเรียบร้อยแล้ว', 'success');
                }
                break;
            }
        }
    });

    function handleRmbgFileSelect(file) {
        if (!file.type.startsWith('image/')) {
            showToast('กรุณาเลือกไฟล์รูปภาพเท่านั้น', 'error');
            return;
        }

        currentFile = file;
        const objectUrl = URL.createObjectURL(file);

        const tempImg = new Image();
        tempImg.onload = () => {
            dimensionInfo.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${tempImg.naturalWidth} x ${tempImg.naturalHeight} px`;
            fileInfo.innerHTML = `<i class="fa-regular fa-file-image"></i> ${file.name || 'Pasted Image'} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;

            originalImg.src = objectUrl;
            sideOriginalImg.src = objectUrl;

            dropzone.style.display = 'none';
            resultContainer.style.display = 'flex';
            processBtn.disabled = false;
            downloadBtn.disabled = true;
            copyBtn.disabled = true;
            resultImg.src = '';
            sideResultImg.src = '';
            processTimeInfo.innerHTML = `<i class="fa-solid fa-bolt"></i> กำลังรอประมวลผล...`;

            updateSliderPosition(50);
            processBackgroundRemoval();
        };
        tempImg.src = objectUrl;
    }

    async function processBackgroundRemoval() {
        if (!currentFile) {
            showToast('กรุณาเลือกรูปภาพก่อน', 'error');
            return;
        }

        loadingOverlay.style.display = 'flex';
        processBtn.disabled = true;
        const startTime = performance.now();

        const formData = new FormData();
        formData.append('file', currentFile);
        formData.append('model', modelSelect.value);
        formData.append('bg_type', 'transparent');
        formData.append('alpha_matting', alphaMattingToggle.checked ? 'true' : 'false');

        try {
            const response = await fetch('/api/remove-bg', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `Server responded with ${response.status}`);
            }

            const blob = await response.blob();
            const resultUrl = URL.createObjectURL(blob);

            rawCutoutImg = new Image();
            rawCutoutImg.onload = () => {
                renderRmbgComposite();

                const duration = ((performance.now() - startTime) / 1000).toFixed(2);
                processTimeInfo.innerHTML = `<i class="fa-solid fa-bolt"></i> สำเร็จใน ${duration} วินาที (${modelSelect.value})`;

                downloadBtn.disabled = false;
                copyBtn.disabled = false;
                processBtn.disabled = false;

                showToast('ลบพื้นหลังสำเร็จแล้ว!', 'success');
                addToHistory(resultUrl, currentFile.name || 'image.png');
            };
            rawCutoutImg.src = resultUrl;

        } catch (error) {
            console.error('Removal error:', error);
            showToast(`เกิดข้อผิดพลาด: ${error.message}`, 'error');
            processBtn.disabled = false;
        } finally {
            loadingOverlay.style.display = 'none';
        }
    }

    processBtn.addEventListener('click', processBackgroundRemoval);

    function renderRmbgComposite() {
        if (!rawCutoutImg.complete || !rawCutoutImg.naturalWidth) return;

        const w = rawCutoutImg.naturalWidth;
        const h = rawCutoutImg.naturalHeight;

        compCanvas.width = w;
        compCanvas.height = h;
        compCtx.clearRect(0, 0, w, h);

        if (currentBgMode === 'color') {
            compCtx.fillStyle = currentBgColor;
            compCtx.fillRect(0, 0, w, h);
        } else if (currentBgMode === 'image' && customBgImage) {
            compCtx.drawImage(customBgImage, 0, 0, w, h);
        } else if (currentBgMode === 'shape') {
            const scale = parseInt(shapeScale.value, 10) / 100;
            const offsetY = (parseInt(shapeOffsetY.value, 10) / 100) * (h * 0.3);
            const cx = w / 2;
            const cy = (h / 2) + offsetY;
            const radius = (Math.min(w, h) / 2) * scale;

            compCtx.save();
            compCtx.beginPath();
            compCtx.arc(cx, cy, radius, 0, Math.PI * 2);
            compCtx.fillStyle = currentShapeColor;
            compCtx.fill();
            compCtx.restore();
        }

        if (shadowToggle.checked) {
            const opacity = parseInt(shadowOpacity.value, 10) / 100;
            const blur = parseInt(shadowBlur.value, 10);
            const offsetY = (parseInt(shadowOffsetY.value, 10) / 100) * (h * 0.15);
            const shadowType = shadowTypeSelect.value;

            if (shadowType === 'floor') {
                compCtx.save();
                const floorY = (h * 0.88) + offsetY;
                compCtx.translate(w / 2, floorY);
                compCtx.scale(1.08, 0.20);
                compCtx.filter = `blur(${Math.max(12, blur * 1.5)}px)`;
                compCtx.globalAlpha = opacity * 0.85;

                const offCanvas = document.createElement('canvas');
                offCanvas.width = w;
                offCanvas.height = h;
                const offCtx = offCanvas.getContext('2d');
                offCtx.drawImage(rawCutoutImg, 0, 0);
                offCtx.globalCompositeOperation = 'source-in';
                offCtx.fillStyle = '#000000';
                offCtx.fillRect(0, 0, w, h);

                compCtx.drawImage(offCanvas, -w / 2, -h / 2, w, h);
                compCtx.restore();

                compCtx.save();
                compCtx.beginPath();
                const contactCenterY = (h * 0.91) + (offsetY * 0.6);
                compCtx.ellipse(w / 2, contactCenterY, w * 0.36, h * 0.035, 0, 0, Math.PI * 2);
                compCtx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
                compCtx.filter = `blur(${Math.max(4, blur * 0.3)}px)`;
                compCtx.fill();
                compCtx.restore();

            } else if (shadowType === 'drop') {
                compCtx.save();
                compCtx.shadowColor = `rgba(0, 0, 0, ${opacity})`;
                compCtx.shadowBlur = blur * 1.5;
                compCtx.shadowOffsetX = 0;
                compCtx.shadowOffsetY = offsetY;
                compCtx.drawImage(rawCutoutImg, 0, 0, w, h);
                compCtx.restore();

            } else if (shadowType === 'original' && originalImg.complete && originalImg.naturalWidth) {
                compCtx.save();
                compCtx.globalAlpha = opacity;
                compCtx.globalCompositeOperation = 'multiply';
                compCtx.drawImage(originalImg, 0, 0, w, h);
                compCtx.restore();
            }
        }

        compCtx.drawImage(rawCutoutImg, 0, 0, w, h);

        const finalDataUrl = compCanvas.toDataURL('image/png');
        resultImg.src = finalDataUrl;
        sideResultImg.src = finalDataUrl;

        compCanvas.toBlob((blob) => {
            currentProcessedBlob = blob;
        }, 'image/png');
    }

    function updateSliderPosition(value) {
        compareSlider.value = value;
        originalLayer.style.width = `${value}%`;
        sliderDivider.style.left = `${value}%`;
    }

    compareSlider.addEventListener('input', (e) => {
        updateSliderPosition(e.target.value);
    });

    splitViewBtn.addEventListener('click', () => {
        splitViewBtn.classList.add('active');
        sideBySideBtn.classList.remove('active');
        splitSliderWrapper.style.display = 'block';
        sideBySideWrapper.style.display = 'none';
    });

    sideBySideBtn.addEventListener('click', () => {
        sideBySideBtn.classList.add('active');
        splitViewBtn.classList.remove('active');
        splitSliderWrapper.style.display = 'none';
        sideBySideWrapper.style.display = 'grid';
    });

    downloadBtn.addEventListener('click', () => {
        if (!currentProcessedBlob) return;
        const url = URL.createObjectURL(currentProcessedBlob);
        const a = document.createElement('a');
        const originalName = currentFile ? currentFile.name.replace(/\.[^/.]+$/, "") : "image";
        a.href = url;
        a.download = `${originalName}_rmbg.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('กำลังดาวน์โหลดรูปภาพ...', 'success');
    });

    copyBtn.addEventListener('click', async () => {
        if (!currentProcessedBlob) return;
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': currentProcessedBlob })
            ]);
            showToast('คัดลอกรูปภาพไปยังคลิปบอร์ดแล้ว!', 'success');
        } catch (err) {
            console.error(err);
            showToast('เบราว์เซอร์ไม่รองรับ กรุณาใช้ปุ่มดาวน์โหลดแทน', 'error');
        }
    });

    resetBtn.addEventListener('click', () => {
        currentFile = null;
        currentProcessedBlob = null;
        rawCutoutImg = new Image();
        customBgImage = null;
        fileInput.value = '';
        originalImg.src = '';
        resultImg.src = '';
        sideOriginalImg.src = '';
        sideResultImg.src = '';
        resultContainer.style.display = 'none';
        dropzone.style.display = 'flex';
        processBtn.disabled = true;
        downloadBtn.disabled = true;
        copyBtn.disabled = true;
    });

    function addToHistory(imageUrl, title) {
        const emptyMsg = historyGrid.querySelector('.history-empty');
        if (emptyMsg) emptyMsg.remove();

        const item = document.createElement('div');
        item.className = 'history-item';
        item.title = title;
        item.innerHTML = `<img src="${imageUrl}" alt="${title}">`;

        item.addEventListener('click', () => {
            rawCutoutImg = new Image();
            rawCutoutImg.onload = renderRmbgComposite;
            rawCutoutImg.src = imageUrl;
            showToast(`เปิดรูปจากประวัติ: ${title}`, 'success');
        });

        historyGrid.insertBefore(item, historyGrid.firstChild);

        while (historyGrid.children.length > 8) {
            historyGrid.removeChild(historyGrid.lastChild);
        }
    }

    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-circle-check';
        if (type === 'error') icon = 'fa-triangle-exclamation';

        toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
});
