import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('brandon-moreno')
TW,TH=94,121
X5=[32,140,248,355,461]
rows=[(193,[32,140]),(348,X5),(513,X5),(680,X5)]
tiles=[(x,y,x+TW,y+TH) for y,xs in rows for x in xs]
src=img.copy(); crops=[src.crop(t) for t in tiles]
inner=(36,197,122,298); label=(57,287,103,314)
t,lab=build_tile(img,tiles[0],inner,label,None,face_espn('morales'),'DEC',0,face_scale=1.6,face_top=-0.36,bgcols=[6,TW-7])
labinner=(lab[0]+3,lab[1]+3,lab[2]-3,lab[3]-3)
solid(t,labinner,(250,250,248)); text_center(t,labinner,'DEC',18,(15,15,15))
H=img.height; EXT=140
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(14))
ext=Image.eval(ext,lambda v:int(v*0.6))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-8,img.width,H+8)).filter(ImageFilter.GaussianBlur(4)); out.paste(seam,(0,H-8))
for (x,y,_,_) in tiles:
  erase_mask(out,(max(0,x-16),y+TH+1,min(img.width,x+TW+22),y+TH+28))
slots=tiles+[(32,H-14,32+TW,H-14+TH)]
out.paste(t,slots[0][:2])
for i,c in enumerate(crops): out.paste(c,slots[i+1][:2])
G=(70,190,70); R_=(215,40,40); O=(230,120,50)
names=[('W',G,'MORALES'),('W',G,'ALBAZI'),('L',R_,'ROYVAL'),('L',R_,'PANTOJA'),('W',G,'FIGUEIREDO'),('W',G,'FRANCE'),('L',R_,'FIGUEIREDO'),('W',G,'FIGUEIREDO'),('D',O,'FIGUEIREDO'),('W',G,'ROYVAL'),('W',G,'FORMIGA'),('W',G,'FRANCE'),('D',O,'ASKAROV'),('L',R_,'PANTOJA'),('L',R_,'PETTIS'),('W',G,'ORTIZ'),('W',G,'BENOIT'),('W',G,'SMOLKA')]
for (x,y,_,_),(l,lc,n) in zip(slots,names):
  draw_name(out,(x-8,y+TH+2,x+TW+8,y+TH+27),l,lc,n,size=18,stroke=0,gap=4,ncolor=(240,240,240))
out.save('/home/claude/work/out_brandon-moreno.jpg',quality=92)
