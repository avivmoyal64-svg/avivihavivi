import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('ciryl-gane')
TW,TH=95,118
rows=[(175,[8,115,222]),(327,[8,115,222,329]),(490,[8,115,222,329]),(655,[8,115,222,325,422,526])]
nameY={175:(294,320),327:(448,474),490:(610,638),655:(774,800)}
tiles=[];names=[]
for y,xs in rows:
  for x in xs:
    tiles.append((x,y,x+TW,y+TH)); ny=nameY[y]; c=x+TW//2; names.append((c-63,ny[0],c+63,ny[1]))
# template slot 0
inner=(12,179,98,277); label=(29,267,82,293)
t,lab=build_tile(img,tiles[0],inner,label,None,face_local('josh-hokit'),'DEC',0,face_scale=1.05,face_top=0.0,bgcols=[6,88])
# label text
labinner=(lab[0]+3,lab[1]+3,lab[2]-3,lab[3]-3)
solid(t,labinner,(250,250,248))
text_center(t,labinner,'DEC',17,(15,15,15),dy=0)
nm=name_strip((126,26),None,'W',(40,200,40),'HOKIT',20)
# overflow slot: new row 5
y5=820
ext_t=[(8,y5,8+TW,y5+TH)]; ext_n=[(8+47-63,y5+119,8+47+63,y5+145)]
ncrops_iso=True
src=img
out=shift(img,tiles,names,t,nm,ext_t,ext_n,extend_to=y5+150,bg=(10,10,10))
out.save('/home/claude/work/out_ciryl-gane.jpg',quality=92)
