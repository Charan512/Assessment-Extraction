import cv2
import numpy as np
from PIL import Image

def test():
    image_path = "/Users/sriramcharannalla/.gemini/antigravity-ide/brain/d4578def-a2a9-4c7f-a4b8-bf060c4d97bf/.tempmediaStorage/media_1787924449892.png"
    img = Image.open(image_path).convert("L")
    cv2_gray = np.array(img)
    
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
    equalized = clahe.apply(cv2_gray)
    blurred = cv2.GaussianBlur(equalized, (3, 3), 0)
    
    _, binary = cv2.threshold(
        blurred, 0, 255,
        cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU,
    )
    
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1)) # width 40, height 1
    print("Kernel shape for (40,1):", kernel.shape)
    
    dilated = cv2.dilate(binary, kernel, iterations=2)
    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    print(f"Found {len(contours)} contours")
    for cnt in contours[:5]:
        x, y, w, h = cv2.boundingRect(cnt)
        print(f"Box: {w}x{h}")

test()
