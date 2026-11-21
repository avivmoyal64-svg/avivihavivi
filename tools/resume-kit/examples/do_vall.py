import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('kevin-vallejos')
TW,TH=153,210
slots=[(24,324),(191,324),(24,596),(191,596)]
order=slots+[(24,868)]
src=img.copy(); crops=[src.crop((x,y,x+TW,y+TH)) for x,y in slots]
# new tile: copy frame from slot 0, fill inside black, put face
t=crops[0].copy()
d=ImageDraw.Draw(t); d.rectangle([5,5,TW-6,TH-6],fill=(6,6,8))
f=face_local('aljamain-sterling',crop=(45,0,275,230)).resize((TW-10,TW-10),Image.LANCZOS)
# place face so it fills the frame bottom
lay=Image.new('RGBA',(TW-10,TH-10),(0,0,0,0)); fh=TH-10; f2=f.resize((int(fh*1.2),int(fh*1.2)),Image.LANCZOS)
lay.paste(f2,((TW-10-f2.width)//2,-8),f2)
tt=t.convert('RGBA'); tt.alpha_composite(lay,(5,5)); t=tt.convert('RGB')
H=img.height; EXT=205
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(16))
ext=Image.eval(ext,lambda v:int(v*0.55))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-10,img.width,H+10)).filter(ImageFilter.GaussianBlur(5)); out.paste(seam,(0,H-10))
for x,y in order:
  erase_text(out,(x-10,y+TH-1,x+TW+10,y+TH+62),k=17)
out.paste(t,order[0])
for i,c in enumerate(crops): out.paste(c,order[i+1])
def rob(sz,w,wd): F=ImageFont.truetype(ROBOTO,sz); F.set_variation_by_axes([w,wd]); return F
d=ImageDraw.Draw(out)
info=[('STERLING','W BY DEC'),('EMMETT','W BY TKO'),('CHIKADZE','W BY KO'),('SILVA','W BY DEC'),('WOO CHOI','W BY TKO')]
for (x,y),(n,sub) in zip(order,info):
  cx=x+TW/2
  F=rob(24,500,75); b=d.textbbox((0,0),n,font=F); 
  # letter spacing
  def spaced(txt,F,cy,col,sp):
    ws=[d.textbbox((0,0),ch,font=F)[2]-d.textbbox((0,0),ch,font=F)[0] if ch!=' ' else F.size*0.3 for ch in txt]
    tot=sum(ws)+sp*(len(txt)-1); xx=cx-tot/2; bb=d.textbbox((0,0),'H',font=F)
    for ch,w in zip(txt,ws):
      if ch!=' ': d.text((xx-d.textbbox((0,0),ch,font=F)[0],cy-(bb[1]+bb[3])/2),ch,font=F,fill=col)
      xx+=w+sp
  spaced(n,rob(23,450,75),y+TH+16,(232,232,232),2.2)
  spaced(sub,rob(15,450,75),y+TH+37,(110,160,95),1.6)
out.save('/home/claude/work/out_kevin-vallejos.jpg',quality=92)
