import sys; sys.path.insert(0,'/home/claude/work')
from tilekit import *
import tilekit
def pfill(img,box,sample_x=None,top_frac=0.55):
    x0,y0,x1,y1=box; h=y1-y0
    t=np.linspace(0,1,h)[:,None,None]
    c1=np.array([40,22,48]);c2=np.array([78,36,84])
    img.paste(Image.fromarray(np.repeat((c1*(1-t)+c2*t),x1-x0,axis=1).astype('uint8')),(x0,y0))
tilekit.bg_fill=pfill

slots=[(12,203),(169,203),(326,203),(12,430),(169,430),(326,430),(12,658),(169,658),(326,658),(483,658),(12,887)]
order=slots+[(169,887)]
N=[('L','KAPE'),('W','ALBAZI'),('W','ULANBEKOV'),('W','BAGAUTINOV'),('W','SEERY'),('W','CAMUS'),('L','JOHNSON'),('W','GAUDINOT'),('W','MONTAGUE'),('W','REYES'),('W','PAQUE')]
names=[('W',G_,'ALMABAYEV')]+[(l,G_ if l=='W' else R_,n) for l,n in N]
rebuild('kyoji-horiguchi',124,173,slots,1,(174,208,288,353),(193,335,265,376),face_local('asu-almabayev'),'DEC',names,10,34,28,None,0,lab_size=27,lab_inset=4,lab_fill=(250,248,240),face_scale=1.55,face_top=-0.14,name_pad=22,order=order,ncolor=(240,240,240),gap=6)
o=Image.open('/home/claude/work/out_kyoji-horiguchi.jpg'); src=load('kyoji-horiguchi')
for (y0,y1) in [(386,420),(612,646)]:
    o.paste(src.crop((454,y0,482,y1)),(454,y0))
    erase_text(o,(436,y0,456,y1),k=15)
    seam=o.crop((448,y0,462,y1)).filter(ImageFilter.GaussianBlur(2)); o.paste(seam,(448,y0))
o.save('/home/claude/work/out_kyoji-horiguchi.jpg',quality=92)
