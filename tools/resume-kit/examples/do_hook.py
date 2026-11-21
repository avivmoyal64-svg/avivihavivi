import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
import tilekit
_orig=tilekit.bg_fill
def redfill(img,box,sample_x=None,top_frac=0.55):
    x0,y0,x1,y1=box; h=y1-y0
    t=np.linspace(0,1,h)[:,None,None]**0.8
    c1=np.array([45,6,8]);c2=np.array([175,18,22])
    blk=np.repeat((c1*(1-t)+c2*t),x1-x0,axis=1).astype('uint8')
    img.paste(Image.fromarray(blk),(x0,y0))
tilekit.bg_fill=redfill
X6=[3,93,183,273,363,453]
order=[(7,142),(96,142),(186,142)]+[(X6[i],299) for i in range(4)]+[(X6[i],455) for i in range(6)]+[(X6[i],611) for i in range(6)]+[(X6[i],769) for i in range(6)]
slots=order[:]
order2=order+[(X6[0],930)]
N=[('L','PARNASSE'),('L','DENIS'),('L','TSARUKYAN'),('W','GAMROT'),('W','TURNER'),('W','PUELLESS'),('L','ALLEN'),('L','MAKHACHEV'),('W','NASRAT'),('L','CHANDLER'),('L','POIRIER'),('W','FELDER'),('W','IAQUINTA'),('W','VICK'),('L','BARBOZA'),('W','BURNS'),('W','MILLER'),('W','DIAKIESE'),('W','PEARSON'),('L','KNIGHT'),('W','EDDIVA'),('L','RODRIGUEZ'),('W','HIOKI'),('L','BLANCO'),('W','ENTWISTLE')]
names=[('W',G_,'ORTEGA')]+[(l,G_ if l=='W' else R_,n) for l,n in N]
rebuild('dan-hooker',82,106,slots,0,(11,145,83,232),(27,231,63,247),face_local('brian-ortega',crop=(60,0,260,200)),'DEC',names,6,26,19,None,165,lab_size=15,lab_inset=2,face_scale=1.25,face_top=-0.02,bgcols=[5,77],name_pad=16,order=order2,ncolor=(240,240,240),dark=0.45)

o=Image.open('/home/claude/work/out_dan-hooker.jpg')
erase_text(o,(270,252,300,284),k=17); erase_text(o,(540,880,570,908),k=17)
o.save('/home/claude/work/out_dan-hooker.jpg',quality=92)
