import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('josh-hokit')
_f=face_local('ciryl-gane'); grey_face=Image.merge('RGBA',(*_f.convert('L').convert('RGB').split(),_f.split()[3]))
TW,TH=90,120
tops=[(170,[20]),(328,[20,114]),(487,[21,115,209]),(642,[21,115,209,305])]
tiles=[(x,y,x+TW,y+TH) for y,xs in tops for x in xs]
src=img.copy()
crops=[src.crop(t) for t in tiles]
inner=(27,176,104,268); label=(47,262,85,290)
t,lab=build_tile(img,tiles[0],inner,label,None,grey_face,'DEC',0,face_scale=1.08,face_top=-0.02,bgcols=[8,82])
labinner=(lab[0]+3,lab[1]+3,lab[2]-3,lab[3]-3)
solid(t,labinner,(250,250,248)); text_center(t,labinner,'DEC',17,(10,10,10))
# extend canvas
H=img.height; EXT=160
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(14))
ext=Image.eval(ext,lambda v:int(v*0.8))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-10,img.width,H+10)).filter(ImageFilter.GaussianBlur(5)); out.paste(seam,(0,H-10))
# clean popped heads above frames + name strips under every slot
for (x,y,_,_) in tiles:
  erase_interp(out,(x+2,y-10,x+TW-2,y+1))
  erase_interp(out,(x-14,y+TH,x+TW+14,min(y+TH+20,H+EXT-1)))
slots=tiles+[(21,H+18,21+TW,H+18+TH)]
out.paste(t,slots[0][:2])
for i,c in enumerate(crops): out.paste(c,slots[i+1][:2])
names=[('L',(235,35,35),'GANE')]+[('W',(200,25,30),n) for n in ['LEWIS','BLAYDES','FREEMAN','GIMENIS','URIEL','LUNSFORD','LATU','LOPEZ','ROSE','SMITH']]
for (x,y,_,_),(l,lc,n) in zip(slots,names):
  draw_name(out,(x-15,y+TH,x+TW+15,y+TH+20),l,lc,n,size=17)
out.save('/home/claude/work/out_josh-hokit.jpg',quality=92)
