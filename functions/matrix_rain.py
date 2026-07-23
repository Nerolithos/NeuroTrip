import tkinter as tk
import random
import string
import time

# PARAMS
WIDTH, HEIGHT = 900, 600         # canvas size
FONT_SIZE = 18                    # ch size
SPEED_RANGE = (6, 16)             # velocity (pix. per frame)
TAIL_LEN = 14                     # tail length
REFRESH_MS = 33                   # ~30 FPS
CHARS = (
    "アイウエオカキクケコサシスセソタチツテトナニヌネノ"
    "ハヒフヘホマミムメモヤユヨラリルレロワヲン"
    + string.ascii_letters + string.digits + "!@#$%^&*()"
)

def green_shades(n):  # n == TAIL_LEN
    shades = []
    for i in range(n):  # brightest at head shades[0]
        t = i / max(1, n - 1)
        g = int(255 * (0.35 + 0.65 * (1 - t)))   # decline from 255
        r = int(30 * (1 - t))
        b = int(30 * (1 - t))
        shades.append(f"#{r:02x}{g:02x}{b:02x}")
    return shades

class Column:
    def __init__(self, x, canvas, font, shades):
        self.x = x
        self.canvas = canvas
        self.font = font
        self.shades = shades
        self.reset()

    def reset(self):
        self.y = random.randint(-HEIGHT, 0)     # random generation at top
        self.speed = random.randint(*SPEED_RANGE)
        self.tail = [" "] * TAIL_LEN            # Init tail
        self.live = True

    def step(self):  # creates the new head, last head goes to tail
        head_char = random.choice(CHARS)
        self.tail = [head_char] + self.tail[:-1]
        self.y += self.speed  # fall (whole column)

        for i, ch in enumerate(self.tail):  #colouring
            if ch == " ":
                continue
            y_pos = self.y - i * FONT_SIZE
            if -FONT_SIZE <= y_pos <= HEIGHT + FONT_SIZE:
                color = self.shades[i]
                if i == 0:
                    color = "#ccffcc"  # brighten the head enven more
                self.canvas.create_text(
                    self.x, y_pos, text=ch, fill=color,
                    font=self.font, anchor="nw"
                )

        # resets after exiting screen
        if self.y - TAIL_LEN * FONT_SIZE > HEIGHT + FONT_SIZE:
            # random speed change
            self.reset()

class MatrixRain:
    def __init__(self, root):
        self.root = root
        self.root.title("Matrix Rain")
        self.canvas = tk.Canvas(root, width=WIDTH, height=HEIGHT, bg="black", highlightthickness=0)
        self.canvas.pack()
        self.font = ("Courier New", FONT_SIZE, "bold")
        self.shades = green_shades(TAIL_LEN)

        # calculate column
        self.col_count = WIDTH // FONT_SIZE
        self.columns = []
        for c in range(self.col_count):
            x = c * FONT_SIZE
            # skip random columns, fill only 85% of the screen
            if random.random() < 0.85:
                self.columns.append(Column(x, self.canvas, self.font, self.shades))

        self.last_time = time.time()
        self.animate()

    def animate(self):
        self.canvas.delete("all")
        for col in self.columns:
            col.step()
        self.root.after(REFRESH_MS, self.animate)  # repeat destrction and regeneration

"""
if __name__ == "__main__":
    root = tk.Tk()
    MatrixRain(root)
    # Press anything to exit
    root.bind("<Key>", lambda e: root.destroy())
    root.bind("<Button-1>", lambda e: root.destroy())
    root.focus_force()
    root.mainloop()
"""

if __name__ == "__main__":
    root = tk.Tk()

    # ——让动画按当前屏幕大小绘制——
    screen_w = root.winfo_screenwidth()
    screen_h = root.winfo_screenheight()
    # 覆写全局尺寸（Column/MatrixRain 都会用到）
    WIDTH, HEIGHT = screen_w, screen_h

    # Fullscreen
    MatrixRain(root)
    root.attributes("-fullscreen", True)   # macOS 可用的 Tk 全屏
    root.lift()                            # 抬到最前
    root.attributes("-topmost", True)      # 防止被 Terminal 挡住
    root.after(100, lambda: root.attributes("-topmost", False))  # 片刻后取消置顶

    # Press anything to exit
    root.bind("<Key>", lambda e: root.destroy())
    root.bind("<Button-1>", lambda e: root.destroy())
    root.focus_force()

    # Hide Mouse
    root.config(cursor="none")

    root.mainloop()





