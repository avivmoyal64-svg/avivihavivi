import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('terrance-mckinney')
TW,TH=88,105
ys=[210,340,470,600,730]; xs=[5,100,195]
tiles=[(x,y,x+TW,y+TH) for y in ys for x in xs]
src=img.copy(); crops=[src.crop(t) for t in tiles]
nt=tiles[1]
inner=(104,213,184,296); label=(121,293,161,315)
t,lab=build_tile(img,nt,(inner[0],inner[1],inner[2],inner[3]),label,None,face_espn('miller'),'TKO',0,face_scale=1.2,face_top=-0.04,bgcols=[5,TW-6])
labinner=(lab[0]+1,lab[1]+1,lab[2]-1,lab[3])
solid(t,labinner,(250,250,248)); text_center(t,labinner,'TKO',17,(10,10,10),dy=1)
H=img.height; EXT=160
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(14))
ext=Image.eval(ext,lambda v:int(v*0.75))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-10,img.width,H+10)).filter(ImageFilter.GaussianBlur(5)); out.paste(seam,(0,H-10))
for (x,y,_,_) in tiles:
  erase_interp(out,(max(0,x-4),y+TH,x+TW+6,y+TH+24))
slots=tiles+[(5,H+12,5+TW,H+12+TH)]
out.paste(t,slots[0][:2])
for i,c in enumerate(crops): out.paste(c,slots[i+1][:2])
G=(60,170,60); R_=(190,30,30)
names=[('W',G,'MILLER'),('L',R_,'GREEN'),('W',G,'NELSON'),('L',R_,'DUNCAN'),('W',G,'BORSHCHEV'),('W',G,'HADZOVIC'),('L',R_,'RIBOVICS'),('W',G,'MAROTTE'),('W',G,'BREEDEN'),('L',R_,'SADYKHOV'),('L',R_,'BONFIM'),('W',G,'GONZALEZ'),('L',R_,'DOBER'),('W',G,'ZIAM'),('W',G,'FREVOLA'),('L',R_,'WOODSON')]
for (x,y,_,_),(l,lc,n) in zip(slots,names):
  draw_name(out,(x-6,y+TH,x+TW+6,y+TH+22),l,lc,n,size=17,stroke=1,ncolor=(238,238,238))
out.save('/home/claude/work/out_terrance-mckinney.jpg',quality=92)
