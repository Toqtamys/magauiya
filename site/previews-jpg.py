"""PNG-снимки site/previews/*.png → JPG 640×400 для карточек."""
import glob
import os
from PIL import Image

here = os.path.join(os.path.dirname(os.path.abspath(__file__)), "previews")
for f in sorted(glob.glob(os.path.join(here, "*.png"))):
    im = Image.open(f).convert("RGB"); w, h = im.size
    W, H = 640, 400
    bg = Image.new("RGB", (W, H), (238, 242, 255))
    s = W / w; im2 = im.resize((W, max(1, int(h * s))), Image.LANCZOS)
    bg.paste(im2, (0, 0) if im2.size[1] >= H else (0, (H - im2.size[1]) // 2))
    bg.save(f[:-4] + ".jpg", quality=76, optimize=True); os.remove(f)
    print("jpg", os.path.basename(f)[:-4])
