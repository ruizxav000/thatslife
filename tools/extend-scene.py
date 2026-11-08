from PIL import Image, ImageFilter
import numpy as np
# Run from the repository root. reference.jpg is the original photograph (not committed).
SP='.'
rng = np.random.default_rng(11)
src = Image.open('reference.jpg').convert('RGB')
W = 1000; H = round(src.height * W / src.width)
photo = np.asarray(src.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.9))).astype(float)
# The photograph's own sky line (recomputed from colour, as before).
R_, G_, B_ = photo[...,0], photo[...,1], photo[...,2]
lum = (0.299*R_ + 0.587*G_ + 0.114*B_) / 255
skyish = (B_ > R_ + 28) & (lum > 0.35)
ridge = np.zeros(W)
for x in range(W):
    col = ~skyish[:, x]; run = 0
    for y in range(H):
        run = run + 1 if col[y] else 0
        if run >= 12: ridge[x] = y - 11; break
from statistics import median
sm = np.array([median(ridge[max(0, x-20):x+21]) for x in range(W)])
ridge = np.minimum(sm, np.array([ridge[max(0, x-30):x+31].min() + 6 for x in range(W)]))

def plain_at(u): return H * np.interp(u, [0, 0.5, 0.7, 0.8, 1.0], [0.525, 0.515, 0.505, 0.5, 0.5])
plain = plain_at(np.arange(W) / W)

EL, ER = 1.4, 0.9
L, R = int(W * EL), int(W * ER)
TW = L + W + R
out = np.zeros((H, TW, 3)); out[:, L:L + W] = photo

def smooth_noise(n, scale, seed):
    r = np.random.default_rng(seed); pts = r.normal(0, 1, n // scale + 3)
    xs = np.arange(n) / scale; i = xs.astype(int); f = xs - i; f = f * f * (3 - 2 * f)
    return pts[i] * (1 - f) + pts[i + 1] * f
def ext_ridge(n, start, settle, seed):
    k = np.arange(n)
    base = settle + (start - settle) * np.exp(-k / (n * 0.4))
    wob = smooth_noise(n, 320, seed) * H * 0.014 + smooth_noise(n, 110, seed + 1) * H * 0.004
    return base + wob * np.clip(k / 120, 0, 1)
left_r = ext_ridge(L, ridge[:8].mean(), H * 0.37, 3)[::-1]
right_r = ext_ridge(R, ridge[-8:].mean(), H * 0.35, 8)
ridge_all = np.concatenate([left_r, ridge, right_r])
plain_all = plain_at(np.clip((np.arange(TW) - L) / W, 0, 1))

# Hills: long shifted runs of the photo's own hillside, crossfaded, re-fitted to the new ridge.
src_lo, src_hi = int(W * 0.03), int(W * 0.72)
BL = 360
def src_col(x, b): return src_lo + ((b * 233 + 57) % (src_hi - src_lo - BL)) + (x % BL)
ys = np.arange(H)
for x in list(range(0, L)) + list(range(L + W, TW)):
    b = x // BL; fx = (x % BL) / BL
    w1 = np.clip((fx - 0.6) / 0.4, 0, 1); w1 = w1 * w1 * (3 - 2 * w1)
    top, bot = ridge_all[x], plain_all[x]
    t = (ys - top) / max(bot - top, 1)
    col = np.zeros((H, 3))
    for xs, w in ((src_col(x, b), 1 - w1), (src_col(x - BL, b + 1) if False else src_lo + (((b + 1) * 233 + 57) % (src_hi - src_lo - BL)) + (x % BL) - 0, w1)):
        if w <= 0: continue
        xs = min(max(xs, 0), W - 1)
        sy = np.clip(ridge[xs] + t * (plain[xs] - ridge[xs]), 0, H - 1).astype(int)
        col += photo[sy, xs] * w
    band = t >= -0.03
    out[band, x] = col[band]

# Open snow below the hills.
snow_rows = np.median(photo[:, int(W * 0.55):int(W * 0.95)], axis=1)
grain = rng.normal(0, 1.6, (H, TW))
for x in list(range(0, L)) + list(range(L + W, TW)):
    m = np.clip((ys - plain_all[x]) / 24, 0, 1)[:, None]
    out[:, x] = out[:, x] * (1 - m) + (snow_rows + grain[:, x:x + 1]) * m

# Wide, soft seams at the photograph's edges.
for x0, sign, edge in ((L, -1, photo[:, :6].mean(1)), (L + W - 1, 1, photo[:, -6:].mean(1))):
    for k in range(1, 90):
        a = (1 - k / 90) ** 1.6
        x = x0 + sign * k
        out[:, x] = out[:, x] * (1 - a) + edge * a

# The real tracks run off the bottom-left: continue them along their own heading.
for x in range(L - 1, max(0, L - 260), -1):
    dist = L - x
    for y in range(int(H * 0.82), H):
        ye = int(y - dist * 1.5)
        if ye < int(H * 0.8): continue
        e = photo[ye, 2]; base = snow_rows[ye]
        dark = np.clip((base.mean() - e.mean()) / 60, 0, 1)
        if dark > 0.05: out[y, x] = out[y, x] - (base - e) * dark

yy = ys[:, None]
skyo = np.clip((ridge_all[None, :] - yy) / 1.5 + 0.5, 0, 1)
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
img.save('assets/scene.jpg', quality=82, optimize=True)
Image.fromarray((skyo * 255).astype(np.uint8)).resize((TW // 2, H // 2), Image.LANCZOS).save('assets/sky.png', optimize=True)
img.resize((TW // 5, H // 5)).save(SP + '/wide-preview.png')
print(TW, H)
