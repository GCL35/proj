"""
Background Removal Web Application
Powered by Python (Flask + rembg / RMBG) & HTML5 / CSS3 / JavaScript
"""

import io
import os
import sys
import logging
from typing import Dict, Any
import numpy as np
import scipy.ndimage as ndi
from flask import Flask, request, jsonify, send_file, render_template, Response
from flask_cors import CORS
from PIL import Image, ImageColor, ImageDraw, ImageFilter, ImageOps, ImageChops
import rembg

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

app = Flask(__name__, template_folder="templates", static_folder="static")
CORS(app)

# Limit upload size to 25MB
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

# Cache for rembg sessions to prevent reloading weights on each request
_SESSION_CACHE: Dict[str, Any] = {}

SUPPORTED_MODELS = {
    "bria-rmbg": {
        "name": "BRIA RMBG (RMBG-1.4)",
        "description": "โมเดล RMBG คุณภาพสูงสำหรับวัตถุและบุคคล (แนะนำ)",
        "is_default": True
    },
    "u2net": {
        "name": "U2Net (General)",
        "description": "โมเดลมาตรฐานอเนกประสงค์ ตัดได้คมชัดทุกพื้นผิว",
        "is_default": False
    },
    "isnet-general-use": {
        "name": "IS-Net",
        "description": "โมเดลรายละเอียดสูง เหมาะกับงานที่ต้องการเก็บขอบละเอียด",
        "is_default": False
    },
    "silueta": {
        "name": "Silueta (Fast & Lightweight)",
        "description": "โมเดลขนาดเล็ก ประมวลผลได้เร็วที่สุด",
        "is_default": False
    }
}


def get_rembg_session(model_name: str):
    """Retrieve or initialize a cached rembg session."""
    if model_name not in SUPPORTED_MODELS:
        model_name = "bria-rmbg"
    
    if model_name not in _SESSION_CACHE:
        logger.info(f"Loading rembg model: {model_name}...")
        try:
            _SESSION_CACHE[model_name] = rembg.new_session(model_name)
            logger.info(f"Model {model_name} loaded successfully.")
        except Exception as e:
            logger.warning(f"Could not load specific model '{model_name}': {e}. Falling back to default 'u2net'.")
            if "u2net" not in _SESSION_CACHE:
                _SESSION_CACHE["u2net"] = rembg.new_session("u2net")
            return _SESSION_CACHE["u2net"]
            
    return _SESSION_CACHE[model_name]


@app.route("/")
def index():
    """Serve the main frontend interface."""
    return render_template("index.html")


@app.route("/api/models", methods=["GET"])
def get_models():
    """Return available background removal models."""
    return jsonify({
        "success": True,
        "models": SUPPORTED_MODELS
    })


@app.route("/api/remove-bg", methods=["POST"])
def remove_background():
    """
    Remove background from an uploaded image.
    Supports options:
      - file: Image file
      - model: Model name (bria-rmbg, u2net, etc.)
      - bg_type: 'transparent', 'color', or 'image'
      - bg_color: Hex color string (e.g. #ffffff)
      - bg_image: Optional secondary image for background replacement
      - alpha_matting: 'true'/'false' for fine hair/fur edge matting
    """
    try:
        if "file" not in request.files:
            return jsonify({"success": False, "error": "กรุณาเลือกไฟล์ภาพ"}), 400

        file = request.files["file"]
        if file.filename == "":
            return jsonify({"success": False, "error": "ไม่ได้ระบุชื่อไฟล์"}), 400

        # Read image
        try:
            input_image = Image.open(file.stream).convert("RGBA")
        except Exception as e:
            return jsonify({"success": False, "error": f"ไม่สามารถเปิดไฟล์รูปภาพได้: {str(e)}"}), 400

        # Extract options
        model_name = request.form.get("model", "bria-rmbg")
        bg_type = request.form.get("bg_type", "transparent")
        bg_color = request.form.get("bg_color", "")
        alpha_matting = request.form.get("alpha_matting", "false").lower() == "true"

        # Get or initialize model session
        session = get_rembg_session(model_name)

        # Process background removal
        logger.info(f"Processing image ({input_image.size[0]}x{input_image.size[1]}) with model: {model_name}, alpha_matting: {alpha_matting}")
        
        output_image = rembg.remove(
            input_image,
            session=session,
            alpha_matting=alpha_matting,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10
        )

        # Handle custom background if requested
        if bg_type == "color" and bg_color:
            try:
                # Parse color and create solid color canvas
                rgb_color = ImageColor.getrgb(bg_color)
                colored_bg = Image.new("RGBA", output_image.size, rgb_color + (255,))
                colored_bg.paste(output_image, (0, 0), mask=output_image)
                output_image = colored_bg
            except Exception as e:
                logger.warning(f"Failed to apply background color {bg_color}: {e}")

        elif bg_type == "shape":
            shape_color = request.form.get("shape_color", "#e11d48")
            scale = float(request.form.get("shape_scale", 85)) / 100.0
            offset_y = int(request.form.get("shape_offset_y", 0))
            shadow_mode = request.form.get("shadow_mode", "floor")
            
            try:
                rgb = ImageColor.getrgb(shape_color)
                w, h = output_image.size
                canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
                draw = ImageDraw.Draw(canvas)
                
                cx, cy = w // 2, (h // 2) + offset_y
                r = int((min(w, h) // 2) * scale)
                draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=rgb + (255,))

                # Render Shadow if enabled
                if shadow_mode != "none":
                    shadow_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
                    alpha = output_image.split()[3]
                    if shadow_mode == "floor":
                        sh_h = max(10, int(h * 0.20))
                        sh_w = int(w * 1.08)
                        scaled_alpha = alpha.resize((sh_w, sh_h), Image.Resampling.BILINEAR)
                        sh_img = Image.new("RGBA", (scaled_alpha.width, scaled_alpha.height), (0, 0, 0, 160))
                        sh_img.putalpha(scaled_alpha)
                        sh_img = sh_img.filter(ImageFilter.GaussianBlur(16))
                        shadow_layer.paste(sh_img, ((w - scaled_alpha.width) // 2, int(h * 0.88) - sh_h // 2))
                    elif shadow_mode == "drop":
                        sh_img = Image.new("RGBA", output_image.size, (0, 0, 0, 140))
                        sh_img.putalpha(alpha)
                        sh_img = sh_img.filter(ImageFilter.GaussianBlur(18))
                        shadow_layer.paste(sh_img, (0, 15))

                    canvas.alpha_composite(shadow_layer)

                canvas.alpha_composite(output_image)
                output_image = canvas
            except Exception as e:
                logger.warning(f"Failed to apply shape background: {e}")

        elif bg_type == "image" and "bg_image" in request.files:
            bg_file = request.files["bg_image"]
            if bg_file.filename != "":
                try:
                    custom_bg = Image.open(bg_file.stream).convert("RGBA")
                    # Resize background to match foreground dimensions
                    custom_bg = custom_bg.resize(output_image.size, Image.Resampling.LANCZOS)
                    custom_bg.paste(output_image, (0, 0), mask=output_image)
                    output_image = custom_bg
                except Exception as e:
                    logger.warning(f"Failed to apply custom background image: {e}")

        # Prepare output buffer
        img_io = io.BytesIO()
        output_image.save(img_io, format="PNG", optimize=True)
        img_io.seek(0)

        filename_base = os.path.splitext(file.filename)[0]
        output_filename = f"{filename_base}_no_bg.png"

        return send_file(
            img_io,
            mimetype="image/png",
            as_attachment=True,
            download_name=output_filename
        )

    except Exception as e:
        logger.exception("Error processing background removal")
        return jsonify({"success": False, "error": f"เกิดข้อผิดพลาดในการประมวลผล: {str(e)}"}), 500


def detect_object_boundary(product_img: Image.Image, session=None) -> Dict[str, Any]:
    """
    Use RMBG AI to segment the product (plate, cup, mug) and calculate
    its exact bounding box, center of mass, and recommended print well boundary.
    """
    w, h = product_img.size
    try:
        # Get segmentation mask of the object
        mask = rembg.remove(product_img, session=session, only_mask=True)
        alpha = np.array(mask)
        
        # Threshold to find non-background foreground object pixels
        y_idx, x_idx = np.where(alpha > 75)
        if len(x_idx) < 100 or len(y_idx) < 100:
            logger.warning("Object foreground too small or not detected, fallback to center.")
            return {
                "cx": w // 2,
                "cy": h // 2,
                "rx": int(min(w, h) * 0.28),
                "ry": int(min(w, h) * 0.28),
                "obj_w": int(w * 0.8),
                "obj_h": int(h * 0.8),
                "aspect": 1.0,
                "detected": False
            }

        min_x, max_x = int(np.min(x_idx)), int(np.max(x_idx))
        min_y, max_y = int(np.min(y_idx)), int(np.max(y_idx))

        cx = int((min_x + max_x) / 2)
        cy = int((min_y + max_y) / 2)
        obj_w = int(max_x - min_x)
        obj_h = int(max_y - min_y)

        # For dishes/cups, inner surface print area is approx 60% of object dimensions
        aspect = float(obj_h) / float(max(1, obj_w))
        rx = int(obj_w * 0.30)
        ry = int(obj_h * 0.30)

        logger.info(f"RMBG AI detected object: Center=({cx}, {cy}), Dimensions={obj_w}x{obj_h}, Aspect={aspect:.2f}")
        return {
            "cx": cx,
            "cy": cy,
            "rx": rx,
            "ry": ry,
            "obj_w": obj_w,
            "obj_h": obj_h,
            "aspect": aspect,
            "detected": True
        }
    except Exception as e:
        logger.exception(f"Error in RMBG boundary detection: {e}")
        return {
            "cx": w // 2,
            "cy": h // 2,
            "rx": int(min(w, h) * 0.28),
            "ry": int(min(w, h) * 0.28),
            "obj_w": int(w * 0.8),
            "obj_h": int(h * 0.8),
            "aspect": 1.0,
            "detected": False
        }


@app.route("/api/detect-boundary", methods=["POST"])
def api_detect_boundary():
    """Scan product image with RMBG AI and return detected boundaries as JSON."""
    try:
        if "product" not in request.files:
            return jsonify({"success": False, "error": "กรุณาเลือกไฟล์ภาพสินค้า"}), 400

        file = request.files["product"]
        product_img = Image.open(file.stream).convert("RGBA")
        model_name = request.form.get("model", "bria-rmbg")
        session = get_rembg_session(model_name)

        boundary = detect_object_boundary(product_img, session=session)
        boundary["success"] = True
        return jsonify(boundary)
    except Exception as e:
        logger.exception("Failed to detect boundary")
        return jsonify({"success": False, "error": str(e)}), 500


def warp_cylinder_advanced(art_resized: Image.Image, phi_max: float = 1.05, arch: float = 16.0) -> tuple[Image.Image, int, int]:
    """
    Photorealistic 3D cylindrical mug projection:
    - True cylinder cosine projection (dx/dphi = cos(phi), natural edge foreshortening)
    - True elliptical rim perspective: both top and bottom edges curve harmoniously (smile curve)
    - Soft diffuse lighting falloff as surface turns away
    """
    target_w, target_h = art_resized.size
    art_arr = np.array(art_resized, dtype=np.float32)

    pad_y = int(arch) + 8
    pad_x = 4
    cw = target_w + pad_x * 2
    ch = target_h + pad_y * 2

    y_dest, x_dest = np.indices((ch, cw), dtype=np.float32)
    xc = (cw - 1) / 2.0

    x_rel = (x_dest - xc) / (target_w / 2.0)
    x_rel_clipped = np.clip(x_rel, -0.999, 0.999)

    sin_max = float(np.sin(phi_max))
    cos_max = float(np.cos(phi_max))

    phi = np.arcsin(x_rel_clipped * sin_max)

    # Texture coordinates in [0, target_w-1] and [0, target_h-1]
    u_tex = (0.5 + phi / (2.0 * phi_max)) * (target_w - 1)

    # True elliptical delta y: center drops by arch, sides are at baseline 0
    delta_y = arch * (np.cos(phi) - cos_max) / (1.0 - cos_max + 1e-6)

    # Inverse map for y: y_dest = pad_y + y_tex + delta_y => y_tex = y_dest - pad_y - delta_y
    v_tex = y_dest - pad_y - delta_y

    warped = np.zeros((ch, cw, 4), dtype=np.float32)
    for c in range(4):
        warped[:, :, c] = ndi.map_coordinates(art_arr[:, :, c], [v_tex, u_tex], order=1, mode="constant", cval=0.0)

    # Cylindrical diffuse light falloff: surface normal turns away towards sides
    cyl_light = np.clip(np.cos(phi) ** 0.35, 0.72, 1.0)
    for c in range(3):
        warped[:, :, c] *= cyl_light

    return Image.fromarray(warped.astype(np.uint8)), pad_x, pad_y


@app.route("/api/scan-and-screen", methods=["POST"])
def api_scan_and_screen():
    """
    Core Feature: Scan & Screen onto Product (Plate or Mug)
    1. Reads Product image (plate/mug) and Artwork image.
    2. Uses RMBG to get exact object boundary mask.
    3. Sizes artwork to user's scale (big/small).
    4. Positions artwork on the object and CLIPS strictly to object boundary (never exceeds edges).
    5. Preserves 100% of the object's shadows, curvature, and ceramic gloss.
    """
    try:
        if "product" not in request.files or "artwork" not in request.files:
            return jsonify({"success": False, "error": "กรุณาอัปโหลดทั้งรูปสินค้าและรูปลายที่จะสกรีน"}), 400

        product_file = request.files["product"]
        artwork_file = request.files["artwork"]

        product_img = ImageOps.exif_transpose(Image.open(product_file.stream)).convert("RGBA")
        artwork_img = ImageOps.exif_transpose(Image.open(artwork_file.stream)).convert("RGBA")
        scale_percent = float(request.form.get("scale", 85))

        model_name = request.form.get("model", "bria-rmbg")
        session = get_rembg_session(model_name)

        w, h = product_img.size

        # 1. Use RMBG to detect the exact object silhouette mask
        logger.info(f"Running RMBG to scan object boundary for image size {w}x{h}...")
        raw_mask = rembg.remove(product_img, session=session, only_mask=True)
        if not isinstance(raw_mask, Image.Image):
            raw_mask = Image.fromarray(raw_mask)
        raw_mask = raw_mask.convert("L")
        alpha_np = np.array(raw_mask)

        # Calculate object bounding dimensions from RMBG mask
        y_idx, x_idx = np.where(alpha_np > 75)
        if len(x_idx) > 100 and len(y_idx) > 100:
            obj_w = int(np.max(x_idx) - np.min(x_idx))
            obj_h = int(np.max(y_idx) - np.min(y_idx))
        else:
            obj_w, obj_h = int(w * 0.75), int(h * 0.75)

        # 2. Size artwork: Use exact draw_w / draw_h from user's live preview (prevents any auto-shrinking!)
        client_draw_w = request.form.get("draw_w")
        client_draw_h = request.form.get("draw_h")

        art_w, art_h = artwork_img.size
        art_aspect = art_w / float(max(1, art_h))

        if client_draw_w and client_draw_h:
            draw_w = max(10, int(float(client_draw_w)))
            draw_h = max(10, int(float(client_draw_h)))
            target_size = max(draw_w, draw_h)
            logger.info(f"Using exact preview dimensions: {draw_w}x{draw_h}")
        else:
            base_dim = min(w, h)
            target_size = max(20, int(base_dim * 0.80 * (scale_percent / 100.0)))
            if art_aspect >= 1.0:
                draw_w = target_size
                draw_h = int(target_size / art_aspect)
            else:
                draw_h = target_size
                draw_w = int(target_size * art_aspect)
            logger.info(f"Calculated fallback dimensions: {draw_w}x{draw_h}")

        # 3. Position artwork: Use exact paste_x / paste_y from user's live preview (0-pixel shift!)
        client_paste_x = request.form.get("paste_x")
        client_paste_y = request.form.get("paste_y")
        if client_paste_x is not None and client_paste_y is not None:
            paste_x = int(float(client_paste_x))
            paste_y = int(float(client_paste_y))
            art_cx = paste_x + (draw_w // 2)
            art_cy = paste_y + (draw_h // 2)
            logger.info(f"Using exact preview paste position: ({paste_x}, {paste_y})")
        else:
            offset_x = int(float(request.form.get("offset_x", 0)))
            offset_y = int(float(request.form.get("offset_y", 0)))
            art_cx = (w // 2) + offset_x
            art_cy = (h // 2) + offset_y
            paste_x = art_cx - (draw_w // 2)
            paste_y = art_cy - (draw_h // 2)
            logger.info(f"Calculated fallback paste position: ({paste_x}, {paste_y})")

        # Resize artwork smoothly
        art_resized = artwork_img.resize((draw_w, draw_h), Image.Resampling.LANCZOS)

        # Read surface type (plate vs cylinder 3D)
        surface_type = request.form.get("surface_type", "plate")
        raw_curv = request.form.get("curvature", "auto")
        try:
            curvature_percent = float(raw_curv)
        except (ValueError, TypeError):
            curvature_percent = None

        # Position artwork at exact (paste_x, paste_y) on transparent layer
        art_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))

        if surface_type == "cylinder":
            # Auto-calculate curvature based on artwork size and mug body width
            est_cylinder_w = float(obj_w * 0.72) if obj_w > 50 else float(w * 0.58)
            rho = np.clip(float(draw_w) / max(10.0, est_cylinder_w), 0.20, 0.95)
            phi_max = float(np.arcsin(min(0.92, rho * 0.95)))
            arch = float((draw_w * 0.075) * (phi_max / 0.95))
            if curvature_percent is not None:
                scale_factor = curvature_percent / 60.0
                phi_max = float(np.clip(phi_max * scale_factor, 0.20, 1.25))
                arch = float(arch * scale_factor)

            logger.info(f"Auto-calculated 3D cylinder warp: phi_max={phi_max:.3f} rad ({np.degrees(phi_max):.1f}°), arch={arch:.2f}px")
            warped_art, pad_x, pad_y = warp_cylinder_advanced(art_resized, phi_max=phi_max, arch=arch)
            art_layer.paste(warped_art, (paste_x - pad_x, paste_y - pad_y), mask=warped_art.split()[3])
        else:
            art_layer.paste(art_resized, (paste_x, paste_y), mask=art_resized.split()[3])

        # 4. Strict boundary clipping: NEVER EXCEED OBJECT EDGES
        art_alpha = art_layer.split()[3]
        clipped_alpha = ImageChops.multiply(art_alpha, raw_mask)

        # -------------------------------------------------------------
        # 5. Photorealistic Ceramic Fusion Engine (Zero Shift)
        # Eliminates "floating sticker" effect while locking position:
        # A. Sub-pixel Edge Softening & Glaze Infiltration (No harsh cut-outs)
        # B. Micro-Texture & Photo Grain Transfer
        # C. Realistic Photometric Lighting (Light Factor Normalization)
        # D. Dual-Layer Glaze Reflection (Ambient Sheen + Specular Glare)
        # -------------------------------------------------------------
        product_gray = ImageOps.grayscale(product_img)
        plate_gray_arr = np.array(product_gray, dtype=np.float32)

        # A. Micro-Edge Feathering (Sub-pixel Glaze Infiltration)
        soft_fused_alpha = clipped_alpha.filter(ImageFilter.GaussianBlur(radius=0.75))

        # B. Micro-Texture & Photo Grain Transfer
        micro_texture = plate_gray_arr - ndi.gaussian_filter(plate_gray_arr, sigma=2.0)

        # C. Realistic Photometric Lighting
        base_white = max(180.0, float(np.percentile(plate_gray_arr, 85)))
        light_factor = np.clip(plate_gray_arr / base_white, 0.20, 1.05)

        art_rgb = np.array(art_layer)[:, :, :3].astype(np.float32)
        fused_rgb = art_rgb * light_factor[:, :, np.newaxis] + (micro_texture[:, :, np.newaxis] * 0.30)
        fused_rgb = np.clip(fused_rgb, 0, 255).astype(np.uint8)

        fused_layer = Image.fromarray(fused_rgb, mode="RGB").convert("RGBA")
        fused_layer.putalpha(soft_fused_alpha)

        result = product_img.copy()
        result.alpha_composite(fused_layer)

        # D. Dual-Layer Glaze Reflection (Ambient Sheen + Specular Glare)
        # 1. Silky Ambient Glaze Sheen
        glaze_mask = product_gray.point(lambda p: int(min(28, max(0, ((p - 170) / 80.0) * 28))) if p > 170 else 0)
        glaze_alpha = ImageChops.multiply(glaze_mask, soft_fused_alpha)
        if glaze_alpha.getextrema()[1] > 0:
            glaze_layer = Image.new("RGBA", (w, h), (255, 255, 255, 255))
            glaze_layer.putalpha(glaze_alpha)
            result.alpha_composite(glaze_layer)

        # 2. Specular Glaze Glare
        glare_mask = product_gray.point(lambda p: int(min(65, max(0, ((p - 200) / 50.0) ** 1.8 * 65))) if p > 200 else 0)
        glare_alpha = ImageChops.multiply(glare_mask, soft_fused_alpha)
        if glare_alpha.getextrema()[1] > 0:
            glaze_layer = Image.new("RGBA", (w, h), (255, 255, 255, 255))
            glaze_layer.putalpha(glare_alpha)
            result.alpha_composite(glaze_layer)

        # 6. Return high-resolution composited PNG
        output_io = io.BytesIO()
        result.save(output_io, format="PNG", optimize=True)
        output_io.seek(0)

        logger.info(f"Scan and screen completed successfully. CX={art_cx}, CY={art_cy}, Size={target_size}px")
        return send_file(output_io, mimetype="image/png")

    except Exception as e:
        logger.exception("Scan and screen failed")
        return jsonify({"success": False, "error": f"การประมวลผลล้มเหลว: {str(e)}"}), 500


@app.route("/api/ai-mockup", methods=["POST"])
def api_ai_mockup():
    """
    Automatic AI Edge-Scanned Mockup Screen:
    1. Uses RMBG to detect product edges & print surface (plate well / mug face).
    2. Blends artwork with base product preserving 100% of original ceramic shadows & highlights.
    """
    try:
        if "product" not in request.files or "artwork" not in request.files:
            return jsonify({"success": False, "error": "กรุณาอัปโหลดทั้งภาพสินค้าและภาพที่จะสกรีน"}), 400

        product_file = request.files["product"]
        artwork_file = request.files["artwork"]

        product_img = Image.open(product_file.stream).convert("RGBA")
        artwork_img = Image.open(artwork_file.stream).convert("RGBA")

        model_name = request.form.get("model", "bria-rmbg")
        session = get_rembg_session(model_name)

        # 1. AI Scan object boundary using RMBG
        boundary = detect_object_boundary(product_img, session=session)

        # 2. Extract options or use AI auto-detected values
        scale_mult = float(request.form.get("scale", 75)) / 100.0
        offset_x = int(request.form.get("offset_x", 0))
        offset_y = int(request.form.get("offset_y", 0))
        shadow_depth = float(request.form.get("shadow_depth", 75)) / 100.0
        gloss_intensity = float(request.form.get("gloss", 35)) / 100.0
        blend_mode = request.form.get("blend_mode", "multiply")
        shape_type = request.form.get("shape", "circle")
        aspect_ratio = float(request.form.get("aspect", 100)) / 100.0

        cx = boundary["cx"] + offset_x
        cy = boundary["cy"] + offset_y

        w, h = product_img.size

        # Consistent sizing: scale_mult is relative to plate radius (min(w, h) * 0.5)
        # Exactly matching frontend canvas coordinates so it NEVER shrinks unexpectedly!
        base_size = min(w, h) * 0.5 * scale_mult
        rx = int(base_size)
        ry = int(base_size * aspect_ratio)

        # 3. Create Artwork Layer clipped to AI scanned boundary
        art_layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        mask_layer = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(mask_layer)

        if shape_type == "circle":
            draw.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)
        else:
            # Rounded rect for mug
            rw = int(rx * 1.8)
            rh = int(ry * 1.8)
            draw.rounded_rectangle([cx - rw // 2, cy - rh // 2, cx + rw // 2, cy + rh // 2], radius=16, fill=255)

        # Feather mask edge slightly for seamless ceramic blending
        mask_layer = mask_layer.filter(ImageFilter.GaussianBlur(2))

        # Fit artwork into target box
        target_w = max(10, rx * 2)
        target_h = max(10, ry * 2)
        art_resized = artwork_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        art_layer.paste(art_resized, (cx - target_w // 2, cy - target_h // 2))

        # 4. Realistic Shading Engine: Preserve ceramic shadows and highlights
        # Extract product luminance
        product_gray = ImageOps.grayscale(product_img)

        # Base composite
        result = product_img.copy()

        # In Multiply mode: artwork pixels are multiplied by the underlying dish luminance
        # Dark curves and cast shadows of the plate will naturally fall onto the artwork!
        if blend_mode == "multiply":
            # Multiply artwork with gray product
            art_rgb = art_layer.convert("RGB")
            art_alpha = art_layer.split()[3]
            combined_alpha = ImageChops.multiply(art_alpha, mask_layer)

            # Multiply RGB channels
            multiplied = ImageChops.multiply(art_rgb, product_gray.convert("RGB"))
            
            # Reattach alpha
            multiplied.putalpha(combined_alpha)
            result.alpha_composite(multiplied)
        else:
            art_layer.putalpha(ImageChops.multiply(art_layer.split()[3], mask_layer))
            result.alpha_composite(art_layer)

        # 5. Add Specular Gloss / Reflection if enabled
        if gloss_intensity > 0:
            # High-pass specular highlights
            gloss_mask = product_gray.point(lambda p: 255 if p > 210 else int((p / 210) ** 3 * 255))
            gloss_layer = Image.new("RGBA", (w, h), (255, 255, 255, int(180 * gloss_intensity)))
            gloss_combined_alpha = ImageChops.multiply(gloss_mask, mask_layer)
            gloss_layer.putalpha(gloss_combined_alpha)
            result.alpha_composite(gloss_layer)

        # 6. Prepare response
        output_io = io.BytesIO()
        result.save(output_io, format="PNG", optimize=True)
        output_io.seek(0)

        response = send_file(output_io, mimetype="image/png")
        # Add AI detected metadata in headers for frontend sliders sync
        response.headers["X-Detected-CX"] = str(boundary["cx"])
        response.headers["X-Detected-CY"] = str(boundary["cy"])
        response.headers["X-Detected-RX"] = str(boundary["rx"])
        response.headers["X-Detected-RY"] = str(boundary["ry"])
        response.headers["X-Detected-Aspect"] = str(boundary["aspect"])
        response.headers["Access-Control-Expose-Headers"] = "X-Detected-CX, X-Detected-CY, X-Detected-RX, X-Detected-RY, X-Detected-Aspect"

        return response

    except Exception as e:
        logger.exception("AI Mockup failed")
        return jsonify({"success": False, "error": f"การประมวลผลล้มเหลว: {str(e)}"}), 500


@app.route("/api/health", methods=["GET"])
def health_check():
    """API health status endpoint."""
    return jsonify({
        "status": "healthy",
        "cached_models": list(_SESSION_CACHE.keys())
    })


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"\n=======================================================")
    print(f"🚀 RMBG Background Removal Web Server is starting...")
    print(f"🌐 Access Web UI at: http://127.0.0.1:{port}")
    print(f"=======================================================\n")
    try:
        from waitress import serve
        serve(app, host="0.0.0.0", port=port, threads=6)
    except ImportError:
        app.run(host="0.0.0.0", port=port, debug=False)

