import sys
from PIL import Image, ImageDraw
n=sys.argv[1]; x0,y0,x1,y1=map(int,sys.argv[2:6]); s=int(sys.argv[6]) if len(sys.argv)>6 else 4
im=Image.open(f'/home/claude/avivihavivi/r/{n}.jpg' if not n.startswith('/') else n).convert('RGB').crop((x0,y0,x1,y1))
im=im.resize((im.width*s,im.height*s),Image.NEAREST); d=ImageDraw.Draw(im)
for x in range(x0 - x0%10 +10, x1, 10):
  X=(x-x0)*s; d.line([(X,0),(X,im.height)],fill=(0,255,255) if x%50==0 else (0,110,110))
  if x%50==0: d.text((X+2,2),str(x),fill=(255,255,0))
for y in range(y0 - y0%10 +10, y1, 10):
  Y=(y-y0)*s; d.line([(0,Y),(im.width,Y)],fill=(0,255,255) if y%50==0 else (0,110,110))
  if y%50==0: d.text((2,Y+2),str(y),fill=(255,255,0))
im.save('zg.png')
