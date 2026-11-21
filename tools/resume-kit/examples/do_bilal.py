import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
img=load('bilal-hasan')
TW,TH=97,126
rows=[(393,[20,130]),(561,[20,130]),(729,[20,130,240]),(897,[20,130,240,350])]
tiles=[];names=[]
for y,xs in rows:
  for x in xs:
    tiles.append((x,y,x+TW,y+TH)); c=x+TW//2; names.append((c-62,y+TH+3,c+62,y+TH+29))
inner=(24,397,113,489); label=(45,490,94,519)
t,lab=build_tile(img,tiles[0],inner,label,None,face_espn('gurule'),'DEC',0,face_scale=1.15,face_top=-0.03,bgcols=[6,TW-7])
labinner=(lab[0]+3,lab[1]+3,lab[2]-3,lab[3]-3)
solid(t,labinner,(246,244,238)); text_center(t,labinner,'DEC',18,(25,25,25))
nm=name_strip((124,26),None,'L',(220,40,40),'GURULE',20)
ext_t=[(20,1062,20+TW,1062+TH)]; ext_n=[(20+48-62,1062+TH+3,20+48+62,1062+TH+29)]
out=shift(img,tiles,names,t,nm,ext_t,ext_n,extend_to=1225,bg=(0,0,0))
out.save('/home/claude/work/out_bilal-hasan.jpg',quality=92)
