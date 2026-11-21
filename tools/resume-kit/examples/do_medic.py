import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('uros-medic')
TW,TH=104,136
tops=[(165,[25]),(340,[25,146]),(527,[25,146,267,389]),(715,[25,146,267,389])]
tiles=[(x,y,x+TW,y+TH) for y,xs in tops for x in xs]
src=img.copy(); crops=[src.crop(t) for t in tiles]
# template: Neal tile (head stays inside frame)
nt=tiles[1]
inner=(nt[0]+8,nt[1]+6,nt[2]-8,nt[3]-24); label=(nt[0]+28,nt[3]-26,nt[2]-27,nt[3])
t,lab=build_tile(img,nt,inner,label,None,face_local('kevin-holland',crop=(95,15,235,155)),'DRAW',0,face_scale=1.05,face_top=0.0,bgcols=[10,TW-11])
labinner=(lab[0]+4,lab[1]+4,lab[2]-4,lab[3]-5)
solid(t,labinner,(250,250,248)); text_center(t,labinner,'DRAW',15,(10,10,10))
H=img.height; EXT=175
ext=img.crop((0,H-EXT,img.width,H)).transpose(Image.FLIP_TOP_BOTTOM).filter(ImageFilter.GaussianBlur(16))
ext=Image.eval(ext,lambda v:int(v*0.7))
out=Image.new('RGB',(img.width,H+EXT)); out.paste(img,(0,0)); out.paste(ext,(0,H))
seam=out.crop((0,H-10,img.width,H+10)).filter(ImageFilter.GaussianBlur(5)); out.paste(seam,(0,H-10))
for (x,y,_,_) in tiles:
  erase_interp(out,(x+2,y-12,x+TW-2,y+1))
  erase_interp(out,(x-12,y+TH+2,min(x+TW+20,img.width),y+TH+32))
slots=tiles+[(25,H+8,25+TW,H+8+TH)]
out.paste(t,slots[0][:2])
for i,c in enumerate(crops): out.paste(c,slots[i+1][:2])
OR=(235,85,25); RD=(200,25,25); GD=(230,185,40)
names=[('D',GD,'HOLLAND'),('W',OR,'RODRIGUEZ'),('W',OR,'NEAL'),('W',OR,'SALIKHOV'),('W',OR,'URBINA'),('L',RD,'SORIANO'),('W',OR,'MEANS'),('L',RD,'OROLBAI'),('W',OR,'SEMELSBERGER'),('W',OR,'FERRER'),('L',RD,'TURNER'),('W',OR,'CRUZ')]
for (x,y,_,_),(l,lc,n) in zip(slots,names):
  draw_name(out,(x-12,y+TH+4,x+TW+12,y+TH+30),l,lc,n,size=19,stroke=0,ncolor=(235,232,228))
out.save('/home/claude/work/out_uros-medic.jpg',quality=92)
