import os
from PIL import Image, ImageDraw

def process_icon():
    base_dir = r"d:\HỆ THỐNG QUẢN LÝ CÔNG VIỆC-web-app-titsmart\web-admin\public"
    logo_path = os.path.join(base_dir, "logo_256.png")
    
    src = Image.open(logo_path).convert("RGBA")
    size = (256, 256)
    corner_radius = 40
    padding = 24
    
    # Create solid white background
    bg = Image.new("RGBA", size, (255, 255, 255, 255))
    
    # Draw rounded rectangle mask
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (size[0]-1, size[1]-1)], radius=corner_radius, fill=255)
    
    # Add a thin subtle border so white-on-white wallpaper also looks crisp
    border_draw = ImageDraw.Draw(bg)
    border_draw.rounded_rectangle([(0, 0), (size[0]-1, size[1]-1)], radius=corner_radius, outline=(226, 232, 240, 255), width=3)
    
    # Resize inner atom logo
    inner_w = size[0] - (padding * 2)
    inner_h = size[1] - (padding * 2)
    src_resized = src.resize((inner_w, inner_h), Image.Resampling.LANCZOS)
    
    # Paste atom logo onto bg
    bg.paste(src_resized, (padding, padding), src_resized)
    
    # Create final image with rounded mask
    final_img = Image.new("RGBA", size, (0, 0, 0, 0))
    final_img.paste(bg, (0, 0), mask)
    
    # Save to logo_256.png and logo.png
    final_img.save(os.path.join(base_dir, "logo_256.png"), "PNG")
    
    logo_small = final_img.resize((64, 64), Image.Resampling.LANCZOS)
    logo_small.save(os.path.join(base_dir, "logo.png"), "PNG")
    
    # Save as favicon.ico
    final_img.save(os.path.join(base_dir, "favicon.ico"), format="ICO", sizes=[(16,16), (32,32), (48,48), (64,64), (128,128), (256,256)])
    print("Successfully generated solid white icons!")

if __name__ == "__main__":
    process_icon()
