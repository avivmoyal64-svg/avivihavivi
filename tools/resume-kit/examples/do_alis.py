import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('ikram-aliskerov')
UW,UH=152,200
units=[(27,250),(198,250),(27,450),(198,450),(27,652),(198,652)]
order=units+[(27,852)]
src=img.copy(); crops=[src.crop((x,y,x+UW,y+UH)) for x,y in units]
t=crops[0].copy()
inner=(4,4,148,150)
bg_fill(t,inner,sample_x=[6,146],top_frac=0.5)
put_face(t,inner,face_local('jared-cannonier'),scale=1.25,top_off=-0.06)
t.paste(src.crop((82,385,124,412)),(55,135))
lab=(57,137,95,160); solid(t,lab,(250,250,250)); text_center(t,lab,'DEC',20,(10,10,10))
erase_text(t,(2,163,150,197),k=15)
d=ImageDraw.Draw(t)
def rob(sz,w,wd): F=ImageFont.truetype(ROBOTO,sz); F.set_variation_by_axes([w,wd]); return F
Fw=rob(27,700,75); Fn=rob(24,500,75)
bW=d.textbbox((0,0),'W',font=Fw); bN=d.textbbox((0,0),'CANNONIER',font=Fn)
tot=(bW[2]-bW[0])+6+(bN[2]-bN[0]); x=UW/2-tot/2; cy=181
d.text((x-bW[0],cy-(bW[1]+bW[3])/2),'W',font=Fw,fill=(60,150,40))
d.text((x+(bW[2]-bW[0])+6-bN[0],cy-(bN[1]+bN[3])/2),'CANNONIER',font=Fn,fill=(236,236,236))
H=img.height; EXT=205
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(16)); ext=Image.eval(ext,lambda v:int(v*0.55))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-30,img.width,H+30)).filter(ImageFilter.GaussianBlur(10)); out.paste(seam,(0,H-30))
out.paste(t,order[0])
for i,c in enumerate(crops): out.paste(c,order[i+1])
out.save('/home/claude/work/out_ikram-aliskerov.jpg',quality=92)
