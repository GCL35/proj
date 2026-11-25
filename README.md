# 🍽️ RMBG Remover & Product Mockup Studio
> ระบบสกรีนภาพลงจาน/แก้วรักษามิติแสงเงาสมจริง 100% & ลบพื้นหลังรูปภาพอัจฉริยะ (RMBG) พัฒนาด้วย **Python (Flask, rembg)** และ **HTML5 Canvas, CSS3, JavaScript**

โปรเจ็คนี้รวม 2 ฟังก์ชันหลักระดับมืออาชีพไว้ในที่เดียว:
1. **Mockup Studio (สกรีนลายลงสินค้า):** อัปโหลดภาพสินค้า (เช่น จานขาว, แก้วมัค) และภาพลายกราฟิก/โลโก้ เพื่อนำมาสกรีนลงบนเนื้อสินค้า โดยคงแสง เงาตกกระทบ และรอยโค้งเว้าของผิวเซรามิก/แก้วไว้ครบถ้วนสมจริง 100%
2. **AI Background Removal:** ลบพื้นหลังรูปภาพความละเอียดสูงด้วยโมเดล **BRIA RMBG (RMBG-1.4/2.0)**, **U2Net**, และ **IS-Net**

---

## ✨ ฟีเจอร์เด่นใน Mockup Studio (สกรีนลายลงสินค้า)

1. **รองรับทั้ง จาน (ก้นจาน/ทรงกลม) และ แก้ว (สี่เหลี่ยม/ทรงกระบอก):**
   - มีปุ่มเลือกแม่แบบด่วน: `🍽️ จานขาวตัวอย่าง` และ `☕ แก้วมัคตัวอย่าง` ให้ทดสอบได้ทันที
   - อัปโหลดรูปสินค้าของคุณเองได้อิสระ
2. **ระบบดึงแสงเงาสมจริง (Realistic Shading & Reflection):**
   - **Blend Mode:** `Multiply` (จำลองการพิมพ์ลายลงเนื้อจานที่เงาธรรมชาติทับลงบนลาย), `Overlay`, `Soft Light`
   - **Shadow Depth:** สไลเดอร์ปรับความลึกเงาตกกระทบของก้นจาน
   - **Ceramic Gloss:** สไลเดอร์เพิ่มประกายสะท้อนแสงแวววาวบนเนื้อเซรามิก
3. **ปรับแต่งตำแหน่งแบบ Interactive บน Canvas:**
   - **คลิกลาก (Click & Drag):** สามารถใช้เมาส์คลิกลากบนภาพเพื่อขยับตำแหน่งลายบนจานได้โดยตรง
   - **หมุนลูกกลิ้งเมาส์ (Scroll Wheel):** ย่อ-ขยายขนาดลายบนจานได้ทันที
   - ปรับอัตราส่วนความรี/เอียง (Aspect/Tilt) เหมาะมากกับจานที่ถ่ายจากมุมมองเฉียง
4. **ส่งออกไฟล์คุณภาพสูง:**
   - ปุ่มดาวน์โหลด PNG ความละเอียดเต็ม (Full Resolution) และปุ่มคัดลอกรูปภาพไปยังคลิปบอร์ด

---

## ✨ ฟีเจอร์เด่น (Key Features)

1. **โมเดล AI ลบพื้นหลังชั้นนำ:**
   - **BRIA RMBG (RMBG-1.4):** ตัดขอบคมชัด เหมาะสำหรับภาพคน สินค้า และวัตถุทั่วไป
   - **U2Net:** โมเดลอเนกประสงค์ที่มีความแม่นยำสูง
   - **IS-Net:** โมเดลความละเอียดสูง เก็บรายละเอียดขอบได้ดีเยี่ยม
   - **Silueta:** โมเดลขนาดเล็ก ประมวลผลได้เร็วพิเศษ
2. **ปรับแต่งพื้นหลังและรูปทรง (Backdrop & Shapes):**
   - **โปร่งใส (Transparent PNG):** ดาวน์โหลดไปใช้งานต่อในโปรแกรมแต่งภาพได้ทันที
   - **กรอบรูปทรงวงกลม (Circle Shape Backdrop):** วางรูปสินค้า/วัตถุในวงกลมสีแดง (หรือเลือกสีใดๆ) ปรับขนาดและตำแหน่งได้อิสระ
   - **สีพื้น (Solid Colors):** เลือกสีขาว, ดำ, เขียว Chroma Key หรือเลือก Color Picker อิสระ
   - **ใส่ภาพพื้นหลังใหม่ (Custom Image):** อัปโหลดภาพพื้นหลังใหม่เพื่อแทนที่ได้ทันที
3. **ระบบเงาสมจริง (Realistic Shadow System):**
   - **เงาตกกระทบพื้น 3D (Floor Cast Shadow):** จำลองมุมตกกระทบของเงาลงพื้นด้านล่าง เหมาะอย่างยิ่งกับจาน, แก้ว, รองเท้า, กล่องสินค้า
   - **เงานุ่มลอยตัว (Soft Drop Shadow):** สร้างมิติเงาลอยรอบวัตถุ
   - **ดึงเงาเดิม (Original Shadow):** เก็บและดึงเงาจริงจากกล้องที่ถ่ายมาซ้อนทับกลับบนพื้นหลังใหม่ 100%
   - ปรับความเข้ม (Opacity), ความฟุ้ง (Blur), และระยะห่าง (Distance) ได้แบบเรียลไทม์
4. **การแสดงผลและการเปรียบเทียบรูปภาพ (Comparison UI):**
   - **Interactive Split Slider:** แถบเลื่อนเปรียบเทียบ Before / After แบบสดๆ
   - **Side-by-Side View:** แสดงผลภาพต้นฉบับและภาพตัดพื้นหลังเคียงข้างกัน
4. **ความสะดวกในการใช้งาน:**
   - รองรับ **Drag & Drop** ลากรูปมาวางได้ทันที
   - รองรับ **Ctrl + V** เพื่อวางรูปภาพจากคลิปบอร์ดได้ทันที
   - ปุ่ม **คัดลอกรูปภาพ (Copy to Clipboard)** และ **ดาวน์โหลด PNG** ความละเอียดเต็ม
   - **Recent Gallery:** ประวัติภาพที่เคยตัดล่าสุด
5. **รองรับทั้ง Web UI และ Command-Line (CLI):**
   - มีสคริปต์ `cli.py` สำหรับรันคำสั่งเดี่ยว หรือประมวลผลเป็นกลุ่มโฟลเดอร์ (Batch Processing)

---

## 📁 โครงสร้างโปรเจ็ค (Project Structure)

```
proj/
├── app.py                  # เซิร์ฟเวอร์ Flask Backend & REST API
├── cli.py                  # สคริปต์ Command-Line สำหรับลบพื้นหลังแบบเดี่ยว/กลุ่ม
├── requirements.txt        # รายการ Python Libraries
├── run.bat                 # สคริปต์คลิกเดียวรันบน Windows (1-Click Run)
├── templates/
│   └── index.html          # หน้าเว็บ Frontend HTML5
├── static/
│   ├── css/
│   │   └── style.css       # สไตล์และการออกแบบหน้าเว็บ (Modern Dark Theme)
│   └── js/
│       └── app.js          # JavaScript ควบคุมการทำงาน Drag&Drop, Slider, API
└── README.md               # เอกสารประกอบการใช้งาน
```

---

## 🚀 วิธีการติดตั้งและเริ่มใช้งาน (Getting Started)

### วิธีที่ 1: คลิกเดียวผ่านไฟล์ `run.bat` (ง่ายที่สุดสำหรับ Windows)
เพียงดับเบิ้ลคลิกที่ไฟล์ **`run.bat`**:
- ระบบจะตรวจสอบและเรียกใช้งาน Python
- เปิดหน้าต่างเว็บเบราว์เซอร์ไปยัง `http://127.0.0.1:5000` ให้อัตโนมัติ

---

### วิธีที่ 2: รันผ่าน Terminal / PowerShell

1. **สร้างและเปิดใช้งาน Virtual Environment:**
   ```powershell
   python -m venv venv
   .\venv\Scripts\activate
   ```

2. **ติดตั้ง Libraries ที่จำเป็น:**
   ```powershell
   pip install -r requirements.txt
   ```

3. **เริ่มรัน Web Server:**
   ```powershell
   python app.py
   ```

4. **เปิดเว็บเบราว์เซอร์:**
   เข้าไปที่: [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 💻 การใช้งานผ่าน Command Line (CLI)

หากต้องการลบพื้นหลังผ่าน Command Line โดยไม่ต้องเปิดเว็บ สามารถใช้สคริปต์ `cli.py` ได้:

### 1. ลบพื้นหลังจากรูปเดี่ยว:
```powershell
.\venv\Scripts\python.exe cli.py -i photo.jpg -o photo_nobg.png
```

### 2. เลือกรุ่นโมเดลเป็น RMBG และใส่สีพื้นหลัง:
```powershell
.\venv\Scripts\python.exe cli.py -i photo.jpg -o photo_white.png --model bria-rmbg --bg-color white
```

### 3. เปิดใช้ Alpha Matting เพื่อเก็บขอบผม/ขนสัตว์:
```powershell
.\venv\Scripts\python.exe cli.py -i model.jpg -o model_nobg.png --matting
```

### 4. ลบพื้นหลังเป็นกลุ่มทั้งโฟลเดอร์ (Batch Processing):
```powershell
.\venv\Scripts\python.exe cli.py --batch-dir ./my_photos --out-dir ./output_nobg --model bria-rmbg
```

---

## 📡 รายละเอียด REST API

### `POST /api/remove-bg`
ประมวลผลลบพื้นหลังรูปภาพ

* **Body (`multipart/form-data`):**
  * `file`: ไฟล์รูปภาพ (จำเป็น)
  * `model`: `bria-rmbg` | `u2net` | `isnet-general-use` | `silueta` (ค่าเริ่มต้น: `bria-rmbg`)
  * `bg_type`: `transparent` | `color` | `image` (ค่าเริ่มต้น: `transparent`)
  * `bg_color`: รหัสสี Hex เช่น `#ffffff`, `#00ff00` (กรณีเลือก bg_type เป็น color)
  * `bg_image`: ไฟล์ภาพพื้นหลังใหม่ (กรณีเลือก bg_type เป็น image)
  * `alpha_matting`: `true` | `false`
* **Response:** Binary Stream ของไฟล์รูปภาพ PNG

### `GET /api/models`
ดึงรายการโมเดล AI ทั้งหมดที่รองรับ

#   p r o j  
 