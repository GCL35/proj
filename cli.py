"""
RMBG Background Removal - Command Line Interface (CLI)
Usage:
  python cli.py -i input.jpg -o output.png
  python cli.py -i input.jpg -o output.png --model bria-rmbg
  python cli.py --batch-dir ./photos --out-dir ./photos_nobg
"""

import os
import sys
import argparse
import logging
from pathlib import Path
from PIL import Image, ImageColor
import rembg

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("RMBG-CLI")


def process_image(
    input_path: str,
    output_path: str,
    session=None,
    bg_color=None,
    alpha_matting=False
):
    """Process a single image and save with removed/custom background."""
    try:
        img = Image.open(input_path).convert("RGBA")
        logger.info(f"Removing background from: {input_path} ({img.size[0]}x{img.size[1]})")

        output = rembg.remove(
            img,
            session=session,
            alpha_matting=alpha_matting,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10
        )

        if bg_color:
            try:
                rgb = ImageColor.getrgb(bg_color)
                colored_bg = Image.new("RGBA", output.size, rgb + (255,))
                colored_bg.paste(output, (0, 0), mask=output)
                output = colored_bg
            except Exception as e:
                logger.warning(f"Could not apply color {bg_color}: {e}")

        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        output.save(output_path, "PNG")
        logger.info(f"Saved result to: {output_path}")
        return True
    except Exception as e:
        logger.error(f"Failed to process {input_path}: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="ลบพื้นหลังรูปภาพด้วย RMBG / rembg")
    parser.add_argument("-i", "--input", help="ไฟล์รูปภาพต้นฉบับ")
    parser.add_argument("-o", "--output", help="ไฟล์ผลลัพธ์ (.png)")
    parser.add_argument("--batch-dir", help="โฟลเดอร์ภาพที่ต้องการประมวลผลเป็นกลุ่ม")
    parser.add_argument("--out-dir", default="./output_nobg", help="โฟลเดอร์ผลลัพธ์สำหรับ batch mode")
    parser.add_argument("--model", default="bria-rmbg", choices=["bria-rmbg", "u2net", "isnet-general-use", "silueta"],
                        help="โมเดลที่ใช้ (ค่าเริ่มต้น: bria-rmbg)")
    parser.add_argument("--bg-color", help="ใส่สีพื้นหลังแทนที่ เช่น '#ffffff', 'white', '#00ff00'")
    parser.add_argument("--matting", action="store_true", help="เปิด Alpha Matting สำหรับเก็บขอบขนหรือเส้นผมละเอียด")

    args = parser.parse_args()

    if not args.input and not args.batch_dir:
        parser.print_help()
        print("\nตัวอย่างการใช้งาน:")
        print("  python cli.py -i photo.jpg -o photo_nobg.png")
        print("  python cli.py -i photo.jpg -o photo_nobg.png --model bria-rmbg --bg-color white")
        print("  python cli.py --batch-dir ./images --out-dir ./output --model bria-rmbg")
        sys.exit(1)

    print(f"\n==========================================")
    print(f"  RMBG Background Removal CLI")
    print(f"  Model: {args.model}")
    print(f"==========================================\n")

    logger.info(f"Loading model '{args.model}'...")
    try:
        session = rembg.new_session(args.model)
    except Exception as e:
        logger.warning(f"Failed to load {args.model}: {e}. Falling back to 'u2net'.")
        session = rembg.new_session("u2net")

    # Single image mode
    if args.input:
        out_file = args.output
        if not out_file:
            stem = Path(args.input).stem
            out_file = f"{stem}_nobg.png"
        process_image(args.input, out_file, session=session, bg_color=args.bg_color, alpha_matting=args.matting)

    # Batch directory mode
    elif args.batch_dir:
        input_dir = Path(args.batch_dir)
        valid_exts = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
        images = [p for p in input_dir.iterdir() if p.suffix.lower() in valid_exts]
        
        if not images:
            logger.warning(f"No supported images found in {input_dir}")
            return

        logger.info(f"Found {len(images)} images to process...")
        out_dir = Path(args.out_dir)
        out_dir.mkdir(parents=True, exist_ok=True)

        success_count = 0
        for img_path in images:
            target_path = out_dir / f"{img_path.stem}_nobg.png"
            if process_image(str(img_path), str(target_path), session=session, bg_color=args.bg_color, alpha_matting=args.matting):
                success_count += 1

        print(f"\nประมวลผลเสร็จสิ้น: {success_count}/{len(images)} ภาพ บันทึกไว้ที่: {out_dir}\n")


if __name__ == "__main__":
    main()

