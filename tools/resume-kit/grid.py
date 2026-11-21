import sys
from PIL import Image, ImageDraw
n=sys.argv[1]
im=Image.open(f'/home/claude/avivihavivi/r/{n}.jpg').convert('RGB')
d=ImageDraw.Draw(im)
for x in range(0,im.width,50):
  d.line([(x,0),(x,im.height)],fill=(0,255,255) if x%100==0 else (0,120,120),width=1)
  if x%100==0: d.text((x+2,2),str(x),fill=(255,255,0))
for y in range(0,im.height,50):
  d.line([(0,y),(im.width,y)],fill=(0,255,255) if y%100==0 else (0,120,120),width=1)
  if y%100==0: d.text((2,y+2),str(y),fill=(255,255,0))
im.save(f'g_{n}.png')
