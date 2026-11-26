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
    let productImgObj = null;
    let artworkImgObj = null;
    let currentDrawW = 0;
    let currentDrawH = 0;
    let currentOffsetX = 0;
    let currentOffsetY = 0;
    let currentPasteX = 0;
    let currentPasteY = 0;
    let currentShapeType = 'plate'; // 'plate' or 'cylinder'
    let currentCurvature = 60; // 15 to 150%
    let isCurvatureManual = false;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragStartOffsetX = 0;
    let dragStartOffsetY = 0;

    function checkReady() {
        if (productFile && artworkFile) {
            btnAiScanAndScreen.disabled = false;
            aiScanHint.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="color: #6366f1;"></i> ลายขึ้นบนภาพแล้ว! ปรับขนาดได้ตามต้องการ แล้วกด <strong>"3. สแกนและสกรีนลายลงวัตถุ"</strong>';
        } else if (productFile) {
            btnAiScanAndScreen.disabled = true;
            aiScanHint.innerHTML = '<i class="fa-solid fa-arrow-down" style="color: #f59e0b;"></i> อัปโหลดรูปลายที่จะสกรีนเพิ่มอีก 1 รูป';
        } else {
            btnAiScanAndScreen.disabled = true;
            aiScanHint.innerHTML = '<i class="fa-solid fa-info-circle"></i> กรุณาอัปโหลดรูปจาน/แก้ว และรูปลายเพื่อสแกน';
        }
    }

    // Function to update the small thumbnail preview inside the upload box
    function updateDropzoneThumbnail(dropzoneId, dataUrl, fileName, isArtwork = false) {
        const dropzone = document.getElementById(dropzoneId);
        if (!dropzone) return;
        const content = dropzone.querySelector('.mini-upload-content');
        if (content) {
            content.innerHTML = `
                <img src="${dataUrl}" style="width: 44px; height: 44px; object-fit: contain; background: rgba(0,0,0,0.25); border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); padding: 2px;">
                <div style="text-align: left; overflow: hidden; flex: 1;">
                    <div style="font-weight: 600; color: #fff; font-size: 0.85rem; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${fileName}</div>
                    <div style="font-size: 0.75rem; color: #10b981;"><i class="fa-solid fa-circle-check"></i> อัปโหลดแล้ว (คลิกเปลี่ยนรูป)</div>
                </div>
            `;
        }
    }

    // Live Preview Renderer: Draws Product and scales Artwork onto it in real time
    function calculateAutoCurvature(drawW, cw) {
        // Estimated cylinder body width in the product image
        const estCylinderW = Math.max(50, cw * 0.58);
        const rho = Math.max(0.20, Math.min(0.95, drawW / estCylinderW));
        const basePhi = Math.asin(Math.min(0.92, rho * 0.95)); // angle from center to edge (up to ~67°)
        
        // Multiplier from slider (60 is 1.0x baseline)
        const factor = isCurvatureManual ? (currentCurvature / 60.0) : 1.0;
        const phiMax = Math.max(0.15, Math.min(1.25, basePhi * factor));
        const arch = Math.round((drawW * 0.075) * (phiMax / 0.95));
        const percent = Math.round((phiMax / 0.92) * 100);
        return { phiMax, arch, percent };
    }

    function renderLivePreview() {
        if (!mockupCanvas) return;
        const ctx = mockupCanvas.getContext('2d');

        if (!productImgObj && !artworkImgObj) {
            mockupPlaceholder.style.display = 'block';
            mockupCanvas.style.display = 'none';
            mockupResultImg.style.display = 'none';
            return;
        }

        mockupPlaceholder.style.display = 'none';
        mockupResultImg.style.display = 'none';
        mockupCanvas.style.display = 'block';

        if (productImgObj && !artworkImgObj) {
            // Only product image loaded
            mockupCanvas.width = productImgObj.naturalWidth || productImgObj.width;
            mockupCanvas.height = productImgObj.naturalHeight || productImgObj.height;
            ctx.clearRect(0, 0, mockupCanvas.width, mockupCanvas.height);
            ctx.drawImage(productImgObj, 0, 0, mockupCanvas.width, mockupCanvas.height);
            mkCanvasDimensions.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${mockupCanvas.width} x ${mockupCanvas.height} px`;
            return;
        }

        if (!productImgObj && artworkImgObj) {
            // Only artwork loaded
            const w = Math.max(500, artworkImgObj.naturalWidth);
            const h = Math.max(500, artworkImgObj.naturalHeight);
            mockupCanvas.width = w;
            mockupCanvas.height = h;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, w, h);
            const dx = (w - artworkImgObj.naturalWidth) / 2;
            const dy = (h - artworkImgObj.naturalHeight) / 2;
            ctx.drawImage(artworkImgObj, dx, dy);
            mkCanvasDimensions.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${w} x ${h} px`;
            return;
        }

        // Both Product & Artwork loaded: Draw Artwork on Product with live scale
        const cw = productImgObj.naturalWidth || productImgObj.width;
        const ch = productImgObj.naturalHeight || productImgObj.height;
        mockupCanvas.width = cw;
        mockupCanvas.height = ch;

        // Draw product base
        ctx.clearRect(0, 0, cw, ch);
        ctx.drawImage(productImgObj, 0, 0, cw, ch);

        // Draw artwork centered and scaled according to mkScale
        const scalePercent = parseFloat(mkScale.value) || 85;
        const baseDim = Math.min(cw, ch);
        const targetSize = baseDim * 0.80 * (scalePercent / 100.0);

        const artW = artworkImgObj.naturalWidth || artworkImgObj.width;
        const artH = artworkImgObj.naturalHeight || artworkImgObj.height;
        const artAspect = artW / Math.max(1, artH);

        let drawW, drawH;
        if (artAspect >= 1.0) {
            drawW = Math.round(targetSize);
            drawH = Math.round(targetSize / artAspect);
        } else {
            drawH = Math.round(targetSize);
            drawW = Math.round(targetSize * artAspect);
        }

        currentDrawW = drawW;
        currentDrawH = drawH;

        const cx = Math.round((cw / 2) + currentOffsetX);
        const cy = Math.round((ch / 2) + currentOffsetY);
        const px = Math.round(cx - (drawW / 2));
        const py = Math.round(cy - (drawH / 2));

        currentPasteX = px;
        currentPasteY = py;

        ctx.save();
        if (currentShapeType === 'cylinder') {
            // True 3D cylindrical projection: both top and bottom curve in natural harmony
            const autoCurv = calculateAutoCurvature(drawW, cw);
            const phiMax = autoCurv.phiMax;
            const sinMax = Math.sin(phiMax);
            const cosMax = Math.cos(phiMax);
            const arch = autoCurv.arch;

            if (mkCurvatureVal) {
                if (isCurvatureManual) {
                    mkCurvatureVal.textContent = `${currentCurvature}% (${Math.round((phiMax * 180) / Math.PI)}°)`;
                } else {
                    mkCurvatureVal.textContent = `คำนวณอัตโนมัติ: ${autoCurv.percent}% ✨`;
                }
            }

            const strips = 48;
            const artW = artworkImgObj.naturalWidth || artworkImgObj.width;
            const artH = artworkImgObj.naturalHeight || artworkImgObj.height;

            for (let i = 0; i < strips; i++) {
                const u0 = (i / strips) * 2 - 1;
                const u1 = ((i + 1) / strips) * 2 - 1;

                const phi0 = u0 * phiMax;
                const phi1 = u1 * phiMax;

                const x0 = cx + (Math.sin(phi0) / sinMax) * (drawW / 2);
                const x1 = cx + (Math.sin(phi1) / sinMax) * (drawW / 2);
                const stripW = Math.max(1, (x1 - x0) + 0.6);

                const srcX = i * (artW / strips);
                const srcW = artW / strips;

                // Midpoint angle for true cosine elliptical drop
                const midPhi = ((phi0 + phi1) / 2);
                const dy = py + arch * ((Math.cos(midPhi) - cosMax) / (1.0 - cosMax + 1e-6));

                ctx.drawImage(artworkImgObj, srcX, 0, srcW, artH, x0, dy, stripW, drawH);
            }
        } else {
            ctx.drawImage(artworkImgObj, px, py, drawW, drawH);
        }
        ctx.restore();

        mkCanvasDimensions.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${cw} x ${ch} px`;
    }

    function loadProductFile(file) {
        if (!file) return;
        productFile = file;
        productFileName.textContent = file.name;
        mkProductInfo.innerHTML = `<i class="fa-solid fa-tag"></i> สินค้า: ${file.name}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            updateDropzoneThumbnail('productDropzone', dataUrl, file.name, false);
            const img = new Image();
            img.onload = () => {
                productImgObj = img;
                // Auto-detect if product is likely a mug/cup (taller than wide)
                const ratio = (img.naturalHeight || img.height) / Math.max(1, (img.naturalWidth || img.width));
                if (ratio > 1.02 && currentShapeType === 'plate') {
                    setShapeType('cylinder');
                }
                renderLivePreview();
                checkReady();
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    function loadArtworkFile(file) {
        if (!file) return;
        artworkFile = file;
        artworkFileName.textContent = file.name;
        mkDesignInfo.innerHTML = `<i class="fa-solid fa-palette"></i> ลาย: ${file.name}`;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            updateDropzoneThumbnail('artworkDropzone', dataUrl, file.name, true);
            const img = new Image();
            img.onload = () => {
                artworkImgObj = img;
                renderLivePreview();
                checkReady();
            };
            img.src = dataUrl;
        };
        reader.readAsDataURL(file);
    }

    mockupProductInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadProductFile(e.target.files[0]);
        }
    });

    mockupArtworkInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            loadArtworkFile(e.target.files[0]);
        }
    });

    mkScale.addEventListener('input', (e) => {
        mkScaleVal.textContent = `${e.target.value}%`;
        if (productImgObj && artworkImgObj) {
            renderLivePreview();
        }
    });

    // ========================================================
    // SHAPE TYPE SELECTOR (PLATE VS CYLINDRICAL MUG 3D)
    // ========================================================
    const shapeBtns = document.querySelectorAll('.mockup-shape-btn');
    const curvatureControlGroup = document.getElementById('curvatureControlGroup');
    const mkCurvature = document.getElementById('mkCurvature');
    const mkCurvatureVal = document.getElementById('mkCurvatureVal');

    function setShapeType(shape) {
        currentShapeType = shape;
        shapeBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shape === shape);
        });
        if (curvatureControlGroup) {
            curvatureControlGroup.style.display = (shape === 'cylinder') ? 'block' : 'none';
        }
        if (productImgObj && artworkImgObj) {
            renderLivePreview();
        }
    }

    shapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setShapeType(btn.dataset.shape);
        });
    });

    const btnResetCurvature = document.getElementById('btnResetCurvature');

    if (mkCurvature) {
        mkCurvature.addEventListener('input', (e) => {
            isCurvatureManual = true;
            currentCurvature = parseInt(e.target.value, 10) || 60;
            if (mkCurvatureVal) mkCurvatureVal.textContent = `${currentCurvature}%`;
            if (productImgObj && artworkImgObj) {
                renderLivePreview();
            }
        });
    }

    if (btnResetCurvature) {
        btnResetCurvature.addEventListener('click', () => {
            isCurvatureManual = false;
            currentCurvature = 60;
            if (mkCurvature) mkCurvature.value = 60;
            if (productImgObj && artworkImgObj) {
                renderLivePreview();
            }
            showToast('รีเซ็ตความโค้งกลับสู่ค่าคำนวณอัตโนมัติแล้ว', 'info');
        });
    }

    // ========================================================
    // INTERACTIVE CANVAS DRAGGING & REPOSITIONING
    // ========================================================
    function getCanvasPos(e) {
        const rect = mockupCanvas.getBoundingClientRect();
        const scaleX = mockupCanvas.width / Math.max(1, rect.width);
        const scaleY = mockupCanvas.height / Math.max(1, rect.height);
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function onPointerDown(e) {
        if (!productImgObj || !artworkImgObj) return;
        // If final AI result is currently shown, touching the canvas returns to live preview so user can adjust
        if (mockupResultImg.style.display !== 'none') {
            mockupResultImg.style.display = 'none';
            mockupCanvas.style.display = 'block';
            renderLivePreview();
        }

        const pos = getCanvasPos(e);
        isDragging = true;
        dragStartX = pos.x;
        dragStartY = pos.y;
        dragStartOffsetX = currentOffsetX;
        dragStartOffsetY = currentOffsetY;
        mockupCanvas.classList.add('dragging');
        if (e.type === 'touchstart') e.preventDefault();
    }

    function onPointerMove(e) {
        if (!isDragging || !productImgObj || !artworkImgObj) return;
        const pos = getCanvasPos(e);
        const dx = pos.x - dragStartX;
        const dy = pos.y - dragStartY;

        currentOffsetX = Math.round(dragStartOffsetX + dx);
        currentOffsetY = Math.round(dragStartOffsetY + dy);

        renderLivePreview();
        if (e.type === 'touchmove') e.preventDefault();
    }

    function onPointerUp() {
        if (isDragging) {
            isDragging = false;
            mockupCanvas.classList.remove('dragging');
        }
    }

    mockupCanvas.addEventListener('mousedown', onPointerDown);
    mockupResultImg.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    mockupCanvas.addEventListener('touchstart', onPointerDown, { passive: false });
    mockupResultImg.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    function resetToCenter() {
        currentOffsetX = 0;
        currentOffsetY = 0;
        if (mockupResultImg.style.display !== 'none') {
            mockupResultImg.style.display = 'none';
            mockupCanvas.style.display = 'block';
        }
        renderLivePreview();
        showToast('จัดตำแหน่งลายกลับสู่กึ่งกลางแล้ว', 'info');
    }

    const mkResetPosBtn = document.getElementById('mkResetPosBtn');
    const mkResetPosToolbarBtn = document.getElementById('mkResetPosToolbarBtn');
    if (mkResetPosBtn) mkResetPosBtn.addEventListener('click', resetToCenter);
    if (mkResetPosToolbarBtn) mkResetPosToolbarBtn.addEventListener('click', resetToCenter);

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
        if (currentDrawW && currentDrawH) {
            formData.append('draw_w', currentDrawW);
            formData.append('draw_h', currentDrawH);
        }
        formData.append('paste_x', currentPasteX);
        formData.append('paste_y', currentPasteY);
        formData.append('offset_x', Math.round(currentOffsetX));
        formData.append('offset_y', Math.round(currentOffsetY));
        formData.append('surface_type', currentShapeType);
        formData.append('curvature', isCurvatureManual ? currentCurvature : 'auto');

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
            mockupCanvas.style.display = 'none';
            mockupResultImg.style.display = 'block';
            mockupResultImg.src = resultUrl;

            // Read image dimensions
            const temp = new Image();
            temp.onload = () => {
                mkCanvasDimensions.innerHTML = `<i class="fa-solid fa-up-right-and-down-left-from-center"></i> ${temp.naturalWidth} x ${temp.naturalHeight} px (AI Clipped)`;
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
            loadProductFile(files[0]);
        }
    });

    artworkDropzone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            loadArtworkFile(files[0]);
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
                        loadProductFile(blob);
                        showToast('วางรูปสินค้าจากคลิปบอร์ดแล้ว', 'success');
                    } else {
                        loadArtworkFile(blob);
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
